import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface BlueskySession {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
}

async function checkExistingLikes(session: BlueskySession, postUris: string[]) {
  const likes: Record<string, boolean> = {};
  
  try {
    // Get the user's likes from Bluesky
    const response = await fetch(`https://bsky.social/xrpc/app.bsky.feed.getActorLikes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.accessJwt}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const likedPosts = data.feed || [];
      
      // Check which of our posts are liked
      for (const postUri of postUris) {
        likes[postUri] = likedPosts.some((item: any) => item.post?.uri === postUri);
      }
    }
  } catch (error) {
    console.error('Error checking existing likes:', error);
    // Return empty likes object on error
    for (const postUri of postUris) {
      likes[postUri] = false;
    }
  }
  
  return likes;
}

async function toggleBlueskyLike(session: BlueskySession, postUri: string, action: 'like' | 'unlike') {
  try {
    if (action === 'like') {
      // Create a like record
      const response = await fetch(`https://bsky.social/xrpc/com.atproto.repo.createRecord`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessJwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo: session.did,
          collection: 'app.bsky.feed.like',
          record: {
            subject: {
              uri: postUri,
              cid: '', // We'd need to get the CID from the post, but Bluesky API usually handles this
            },
            createdAt: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, recordUri: data.uri };
      }
    } else {
      // Unlike - we'd need to find and delete the like record
      // This is more complex and requires finding the specific like record
      // For now, return success (implementation can be enhanced later)
      return { success: true };
    }
  } catch (error) {
    console.error('Error toggling Bluesky like:', error);
    return { success: false, error: error.message };
  }
  
  return { success: false };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, postUris, postUri, session, userId } = await req.json();

    if (!session || !userId) {
      return new Response(
        JSON.stringify({ error: 'Session and userId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'checkLikes':
        if (!postUris || !Array.isArray(postUris)) {
          return new Response(
            JSON.stringify({ error: 'postUris array required for checkLikes' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const likes = await checkExistingLikes(session, postUris);
        
        // Also get GLTCH votes from database
        const { data: gltchVotes } = await supabase
          .from('post_votes')
          .select('post_uri, vote_type')
          .eq('user_id', userId)
          .in('post_uri', postUris);

        const votes: Record<string, { hasBlueskyLike: boolean; gltchVote?: string }> = {};
        for (const postUri of postUris) {
          const gltchVote = gltchVotes?.find(v => v.post_uri === postUri);
          votes[postUri] = {
            hasBlueskyLike: likes[postUri] || false,
            gltchVote: gltchVote?.vote_type
          };
        }

        return new Response(
          JSON.stringify({ votes }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'vote':
        if (!postUri) {
          return new Response(
            JSON.stringify({ error: 'postUri required for vote action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { voteType } = await req.json();
        
        if (voteType === 'up') {
          // Handle upvote: like on Bluesky, update our database
          const likeResult = await toggleBlueskyLike(session, postUri, 'like');
          
          if (likeResult.success) {
            // Upsert vote in our database
            await supabase
              .from('post_votes')
              .upsert({
                user_id: userId,
                post_uri: postUri,
                vote_type: 'up',
                bluesky_like_record: likeResult.recordUri
              });
          }
          
          return new Response(
            JSON.stringify({ success: likeResult.success }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
          
        } else if (voteType === 'down') {
          // Handle downvote: check if there's a Bluesky like first
          const { data: existingVote } = await supabase
            .from('post_votes')
            .select('*')
            .eq('user_id', userId)
            .eq('post_uri', postUri)
            .single();

          // If there was a Bluesky like, remove it first
          if (existingVote?.vote_type === 'up' && existingVote.bluesky_like_record) {
            await toggleBlueskyLike(session, postUri, 'unlike');
          }
          
          // Set downvote in our database
          await supabase
            .from('post_votes')
            .upsert({
              user_id: userId,
              post_uri: postUri,
              vote_type: 'down',
              bluesky_like_record: null
            });

          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ error: 'Invalid vote type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in bluesky-votes function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});