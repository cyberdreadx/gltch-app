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
      // First get the post to get the CID
      const postResponse = await fetch(`https://bsky.social/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(postUri)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.accessJwt}`,
          'Content-Type': 'application/json',
        },
      });

      if (!postResponse.ok) {
        console.error('Failed to get post:', await postResponse.text());
        return { success: false, error: 'Failed to get post' };
      }

      const postData = await postResponse.json();
      const postCid = postData.thread?.post?.cid;

      if (!postCid) {
        console.error('No CID found for post:', postUri);
        return { success: false, error: 'No CID found for post' };
      }

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
              cid: postCid,
            },
            createdAt: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        console.error('Failed to create like:', await response.text());
        return { success: false, error: 'Failed to create like' };
      }

      const data = await response.json();
      return { success: true, recordUri: data.uri };
    } else {
      // Unlike action - find and delete the like record
      console.log('Starting unlike process for post:', postUri);
      
      // First find the like record from our database
      const { data: voteRecord } = await supabase
        .from('post_votes')
        .select('bluesky_like_record')
        .eq('user_id', session.did)
        .eq('post_uri', postUri)
        .eq('vote_type', 'up')
        .single();

      if (!voteRecord?.bluesky_like_record) {
        console.error('No Bluesky like record found in database for post:', postUri);
        return { success: false, error: 'No like record found' };
      }

      // Extract the rkey from the like record URI
      const likeUri = voteRecord.bluesky_like_record;
      const rkey = likeUri.split('/').pop();

      if (!rkey) {
        console.error('Could not extract rkey from like URI:', likeUri);
        return { success: false, error: 'Invalid like record URI' };
      }

      console.log('Attempting to delete like record with rkey:', rkey);

      // Delete the like record
      const deleteResponse = await fetch(`https://bsky.social/xrpc/com.atproto.repo.deleteRecord`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessJwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repo: session.did,
          collection: 'app.bsky.feed.like',
          rkey: rkey,
        }),
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('Failed to delete like:', errorText);
        return { success: false, error: 'Failed to delete like: ' + errorText };
      }

      console.log('Successfully deleted like record from Bluesky');
      return { success: true };
    }
  } catch (error) {
    console.error('Error toggling Bluesky like:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { action, postUris, postUri, session, userId, voteType } = requestBody;

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
        const { data: gltchVotes, error } = await supabase
          .from('post_votes')
          .select('post_uri, vote_type')
          .eq('user_id', userId)
          .in('post_uri', postUris);

        console.log('Database votes for user:', userId, 'votes:', gltchVotes, 'error:', error);

        const votes: Record<string, { hasBlueskyLike: boolean; gltchVote?: string }> = {};
        for (const postUri of postUris) {
          const gltchVote = gltchVotes?.find(v => v.post_uri === postUri);
          votes[postUri] = {
            hasBlueskyLike: likes[postUri] || false,
            gltchVote: gltchVote?.vote_type
          };
        }

        console.log('Final votes response:', votes);

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
        
        if (voteType === 'up') {
          // Check if user already has an upvote (like) on this post
          const { data: existingVote } = await supabase
            .from('post_votes')
            .select('*')
            .eq('user_id', userId)
            .eq('post_uri', postUri)
            .single();

          if (existingVote?.vote_type === 'up') {
            // User is trying to unlike - remove the like and the vote record
            const unlikeResult = await toggleBlueskyLike(session, postUri, 'unlike');
            
            // Remove the vote record from our database
            await supabase
              .from('post_votes')
              .delete()
              .eq('user_id', userId)
              .eq('post_uri', postUri);
              
            return new Response(
              JSON.stringify({ success: true, action: 'unliked' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            // User is liking the post
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
              JSON.stringify({ success: likeResult.success, action: 'liked' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
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