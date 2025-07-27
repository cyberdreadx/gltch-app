import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import { BskyAgent } from 'https://esm.sh/@atproto/api@0.15.27';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BlueskyPost {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: any;
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  indexedAt: string;
}

interface ScoredPost extends BlueskyPost {
  gltchScore: number;
  communityBoost: number;
  isAppUser: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      feedType = 'gltch-community', 
      limit = 30, 
      cursor,
      communityId,
      hashtag 
    } = await req.json();

    console.log(`Generating custom feed: ${feedType}, limit: ${limit}`);

    // Initialize Bluesky agent
    const agent = new BskyAgent({ service: 'https://bsky.social' });

    let posts: BlueskyPost[] = [];
    let newCursor: string | undefined;

    // Fetch posts based on feed type
    switch (feedType) {
      case 'gltch-community':
        ({ posts, newCursor } = await fetchCommunityFeed(agent, supabase, limit, cursor));
        break;
      case 'trending-gltch':
        ({ posts, newCursor } = await fetchTrendingFeed(agent, supabase, limit, cursor));
        break;
      case 'hashtag-feeds':
        ({ posts, newCursor } = await fetchHashtagFeed(agent, supabase, hashtag, limit, cursor));
        break;
      case 'community-specific':
        ({ posts, newCursor } = await fetchCommunitySpecificFeed(agent, supabase, communityId, limit, cursor));
        break;
      default:
        ({ posts, newCursor } = await fetchPublicFeed(agent, limit, cursor));
    }

    // Score and rank posts
    const scoredPosts = await scoreAndRankPosts(supabase, posts);

    // Update engagement metrics
    await updateEngagementMetrics(supabase, scoredPosts);

    return new Response(JSON.stringify({
      success: true,
      posts: scoredPosts,
      cursor: newCursor,
      algorithm: feedType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in custom-feed-generator:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchCommunityFeed(
  agent: BskyAgent, 
  supabase: any, 
  limit: number, 
  cursor?: string
): Promise<{ posts: BlueskyPost[], newCursor?: string }> {
  // Get app users
  const { data: appUsers } = await supabase
    .from('app_users')
    .select('bluesky_handle')
    .eq('is_verified', true);

  const handles = appUsers?.map((u: any) => u.bluesky_handle) || [];
  
  if (handles.length === 0) {
    // Fallback to public feed if no app users
    return await fetchPublicFeed(agent, limit, cursor);
  }

  const allPosts: BlueskyPost[] = [];
  
  // Fetch posts from each app user (limited to avoid rate limits)
  for (const handle of handles.slice(0, 10)) {
    try {
      const response = await agent.getAuthorFeed({ 
        actor: handle, 
        limit: Math.min(5, Math.ceil(limit / handles.length))
      });
      
      if (response.success) {
        allPosts.push(...response.data.feed.map((item: any) => item.post));
      }
    } catch (error) {
      console.error(`Failed to fetch posts for ${handle}:`, error);
    }
  }

  // Sort by creation time and limit
  allPosts.sort((a, b) => 
    new Date(b.record?.createdAt || b.indexedAt).getTime() - 
    new Date(a.record?.createdAt || a.indexedAt).getTime()
  );

  return { 
    posts: allPosts.slice(0, limit),
    newCursor: undefined // No cursor for this implementation
  };
}

async function fetchTrendingFeed(
  agent: BskyAgent, 
  supabase: any, 
  limit: number, 
  cursor?: string
): Promise<{ posts: BlueskyPost[], newCursor?: string }> {
  try {
    // Use Bluesky's "What's Hot" feed as base
    const response = await agent.app.bsky.feed.getFeed({
      feed: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot',
      limit: limit * 2, // Get more to filter and rank
      cursor
    });

    if (response.success) {
      return {
        posts: response.data.feed.map((item: any) => item.post),
        newCursor: response.data.cursor
      };
    }
  } catch (error) {
    console.error('Failed to fetch trending feed:', error);
  }

  // Fallback to public timeline
  return await fetchPublicFeed(agent, limit, cursor);
}

async function fetchHashtagFeed(
  agent: BskyAgent, 
  supabase: any, 
  hashtag: string, 
  limit: number, 
  cursor?: string
): Promise<{ posts: BlueskyPost[], newCursor?: string }> {
  if (!hashtag) {
    return await fetchPublicFeed(agent, limit, cursor);
  }

  try {
    const response = await agent.app.bsky.feed.searchPosts({
      q: `#${hashtag}`,
      limit
    });

    return {
      posts: response.data.posts,
      newCursor: undefined // Search doesn't provide cursor
    };
  } catch (error) {
    console.error(`Failed to fetch hashtag feed for #${hashtag}:`, error);
    return { posts: [] };
  }
}

async function fetchCommunitySpecificFeed(
  agent: BskyAgent, 
  supabase: any, 
  communityId: string, 
  limit: number, 
  cursor?: string
): Promise<{ posts: BlueskyPost[], newCursor?: string }> {
  if (!communityId) {
    return await fetchPublicFeed(agent, limit, cursor);
  }

  // Get community hashtags
  const { data: hashtags } = await supabase
    .from('community_hashtags')
    .select('hashtag')
    .eq('community_id', communityId);

  const allPosts: BlueskyPost[] = [];
  
  // Fetch posts for each community hashtag
  for (const { hashtag } of hashtags || []) {
    try {
      const response = await agent.app.bsky.feed.searchPosts({
        q: `#${hashtag}`,
        limit: Math.ceil(limit / (hashtags?.length || 1))
      });
      
      allPosts.push(...response.data.posts);
    } catch (error) {
      console.error(`Failed to fetch posts for hashtag #${hashtag}:`, error);
    }
  }

  // Remove duplicates and sort by time
  const uniquePosts = Array.from(
    new Map(allPosts.map(post => [post.uri, post])).values()
  ).sort((a, b) => 
    new Date(b.record?.createdAt || b.indexedAt).getTime() - 
    new Date(a.record?.createdAt || a.indexedAt).getTime()
  );

  return { 
    posts: uniquePosts.slice(0, limit),
    newCursor: undefined 
  };
}

async function fetchPublicFeed(
  agent: BskyAgent, 
  limit: number, 
  cursor?: string
): Promise<{ posts: BlueskyPost[], newCursor?: string }> {
  try {
    const response = await agent.getTimeline({ limit, cursor });
    return {
      posts: response.data.feed.map((item: any) => item.post),
      newCursor: response.data.cursor
    };
  } catch (error) {
    console.error('Failed to fetch public feed:', error);
    return { posts: [] };
  }
}

async function scoreAndRankPosts(
  supabase: any, 
  posts: BlueskyPost[]
): Promise<ScoredPost[]> {
  // Get app users for boosting
  const { data: appUsers } = await supabase
    .from('app_users')
    .select('bluesky_did, is_verified');

  const appUserDids = new Set(appUsers?.map((u: any) => u.bluesky_did) || []);
  
  // Get existing engagement data
  const postUris = posts.map(p => p.uri);
  const { data: engagementData } = await supabase
    .from('post_engagement')
    .select('*')
    .in('post_uri', postUris);

  const engagementMap = new Map(
    engagementData?.map((e: any) => [e.post_uri, e]) || []
  );

  const scoredPosts: ScoredPost[] = posts.map(post => {
    const engagement = engagementMap.get(post.uri);
    const isAppUser = appUserDids.has(post.author.did);
    
    let score = post.likeCount || 0;
    score += (post.repostCount || 0) * 2;
    score += (engagement?.gltch_upvotes || 0) * 3;
    score -= (engagement?.gltch_downvotes || 0) * 2;
    
    // Time decay (newer posts get boost)
    const hoursOld = (Date.now() - new Date(post.record?.createdAt || post.indexedAt).getTime()) / (1000 * 60 * 60);
    const timeDecay = Math.max(0.1, 1 - (hoursOld / 24));
    score *= timeDecay;
    
    // Community boost
    let communityBoost = 1;
    if (isAppUser) {
      communityBoost = 2.0; // Boost app users
    }
    
    return {
      ...post,
      gltchScore: score * communityBoost,
      communityBoost,
      isAppUser
    };
  });

  // Sort by score
  return scoredPosts.sort((a, b) => b.gltchScore - a.gltchScore);
}

async function updateEngagementMetrics(
  supabase: any, 
  posts: ScoredPost[]
): Promise<void> {
  for (const post of posts) {
    try {
      await supabase
        .from('post_engagement')
        .upsert({
          post_uri: post.uri,
          bluesky_likes: post.likeCount || 0,
          community_score: post.communityBoost,
          trending_score: post.gltchScore,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'post_uri'
        });
    } catch (error) {
      console.error(`Failed to update engagement for ${post.uri}:`, error);
    }
  }
}