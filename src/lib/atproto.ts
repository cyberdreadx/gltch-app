import { BskyAgent } from '@atproto/api';
import { supabase } from '@/integrations/supabase/client';

export const agent = new BskyAgent({
  service: 'https://bsky.social'
});

export interface AuthSession {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
  active: boolean;
}

export const getStoredSession = (): AuthSession | null => {
  const stored = localStorage.getItem('atproto-session');
  return stored ? JSON.parse(stored) : null;
};

export const storeSession = (session: AuthSession) => {
  localStorage.setItem('atproto-session', JSON.stringify(session));
};

export const clearSession = () => {
  localStorage.removeItem('atproto-session');
};

// Helper function to create or link Supabase account
const createOrLinkSupabaseAccount = async (blueskySession: AuthSession) => {
  console.log('🔄 Starting createOrLinkSupabaseAccount for DID:', blueskySession.did);
  try {
    // Check if a Supabase user already exists with this Bluesky DID
    console.log('🔍 Checking for existing profile with DID:', blueskySession.did);
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('bluesky_did', blueskySession.did)
      .maybeSingle();

    console.log('📊 Existing profile found:', existingProfile);

    if (existingProfile) {
      // User already has a linked account - sign them into their existing Supabase account
      console.log('✅ Existing user found, signing into existing account');
      
      // Sign in the user with their existing user_id by creating an anonymous session 
      // and then updating the auth.users table to match the existing profile
      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            display_name: existingProfile.display_name || blueskySession.handle,
            bluesky_handle: existingProfile.bluesky_handle,
            bluesky_did: existingProfile.bluesky_did,
            is_gltch_native: existingProfile.is_gltch_native || false,
            bluesky_access_jwt: blueskySession.accessJwt,
            bluesky_refresh_jwt: blueskySession.refreshJwt,
          }
        }
      });
      
      if (error) {
        console.error('❌ Error signing into existing account:', error);
        return { success: false, error };
      }

      // Update the existing profile with new session info and point to the new anonymous user
      if (data.session?.user?.id) {
        console.log('🔄 Updating existing profile for user:', existingProfile.user_id);
        await supabase
          .from('profiles')
          .update({ 
            user_id: data.session.user.id,
            bluesky_access_jwt: blueskySession.accessJwt,
            bluesky_refresh_jwt: blueskySession.refreshJwt,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProfile.id);
          
        // Also update any communities created by this user
        await supabase
          .from('communities')
          .update({ created_by: data.session.user.id })
          .eq('created_by', existingProfile.user_id);
      }
      
      return { success: true, session: data.session };
    }

    // Create new anonymous Supabase account and link to Bluesky
    console.log('🆕 Creating new anonymous Supabase account for DID:', blueskySession.did);
    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          display_name: blueskySession.handle,
          bluesky_handle: blueskySession.handle,
          bluesky_did: blueskySession.did,
          is_gltch_native: false, // This is a linked account, not native
          bluesky_access_jwt: blueskySession.accessJwt,
          bluesky_refresh_jwt: blueskySession.refreshJwt,
        }
      }
    });

    console.log('📝 Supabase anonymous signin result:', { data: data?.user?.id, error });

    if (error) {
      console.error('❌ Error creating anonymous Supabase account:', error);
      return { success: false, error };
    }

    console.log('✅ Successfully created new anonymous linked account');
    return { success: true, session: data.session };
  } catch (error) {
    console.error('Error in createOrLinkSupabaseAccount:', error);
    return { success: false, error };
  }
};

export const restoreSession = async (): Promise<boolean> => {
  const session = getStoredSession();
  if (!session) return false;

  try {
    await agent.resumeSession(session);
    // Also restore the linked Supabase session
    await createOrLinkSupabaseAccount(session);
    return true;
  } catch (error) {
    console.error('Failed to restore session:', error);
    clearSession();
    return false;
  }
};

const formatIdentifier = (input: string): string => {
  // If it contains @, it's an email - use as is
  if (input.includes('@')) {
    return input;
  }
  
  // If it contains a dot, it's likely already a full handle
  if (input.includes('.')) {
    return input;
  }
  
  // Otherwise, it's a short handle - append .bsky.social
  return `${input}.bsky.social`;
};

export const login = async (identifier: string, password: string): Promise<AuthSession> => {
  const formattedIdentifier = formatIdentifier(identifier.trim());
  const response = await agent.login({ identifier: formattedIdentifier, password });
  const session = {
    did: response.data.did,
    handle: response.data.handle,
    accessJwt: response.data.accessJwt,
    refreshJwt: response.data.refreshJwt,
    active: true,
  };
  
  // Store Bluesky session
  storeSession(session);
  
  // Create or link Supabase account
  console.log('🔗 Linking Supabase account for:', session.handle);
  const linkResult = await createOrLinkSupabaseAccount(session);
  console.log('🔗 Link result:', linkResult);
  
  return session;
};

export const logout = async () => {
  clearSession();
  // Also sign out of Supabase
  await supabase.auth.signOut();
};