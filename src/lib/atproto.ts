import { BskyAgent } from '@atproto/api';

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

export const restoreSession = async (): Promise<boolean> => {
  const session = getStoredSession();
  if (!session) return false;

  try {
    await agent.resumeSession(session);
    return true;
  } catch (error) {
    console.error('Failed to restore session:', error);
    clearSession();
    return false;
  }
};

export const login = async (identifier: string, password: string): Promise<AuthSession> => {
  const response = await agent.login({ identifier, password });
  const session = {
    did: response.data.did,
    handle: response.data.handle,
    accessJwt: response.data.accessJwt,
    refreshJwt: response.data.refreshJwt,
    active: true,
  };
  storeSession(session);
  return session;
};

export const logout = async () => {
  clearSession();
  // No need to call agent logout as we're just clearing local session
};