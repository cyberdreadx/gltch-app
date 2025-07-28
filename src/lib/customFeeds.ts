import { supabase } from '@/integrations/supabase/client';
import { type TransformedPost } from './bluesky';

export interface CustomFeedConfig {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  algorithm_type: string;
  settings: any;
  is_active: boolean;
}

export interface AppUser {
  id: string;
  bluesky_did: string;
  bluesky_handle: string;
  display_name?: string;
  avatar_url?: string;
  is_verified: boolean;
  custom_tags: string[];
}

export const registerAppUser = async (
  blueskyDid: string, 
  blueskyHandle: string, 
  displayName?: string, 
  avatarUrl?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('app_users')
      .upsert({
        bluesky_did: blueskyDid,
        bluesky_handle: blueskyHandle,
        display_name: displayName,
        avatar_url: avatarUrl,
        is_verified: true
      }, {
        onConflict: 'bluesky_did'
      });

    if (error) {
      console.error('Failed to register app user:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error registering app user:', error);
    return false;
  }
};

export const fetchCustomFeed = async (
  feedType: string,
  limit: number = 30,
  cursor?: string,
  options?: {
    communityId?: string;
    hashtag?: string;
  }
): Promise<{ posts: TransformedPost[], cursor?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('custom-feed-generator', {
      body: {
        feedType,
        limit,
        cursor,
        ...options
      }
    });

    if (error) {
      console.error('Failed to fetch custom feed:', error);
      throw error;
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to generate custom feed');
    }

    // Transform posts to match our interface
    const transformedPosts: TransformedPost[] = data.posts.map((post: any) => ({
      id: post.uri,
      title: post.record?.text || 'No content',
      content: undefined,
      author: post.author.handle,
      community: feedType === 'gltch-community' ? 'g/gltch' : 'g/feed',
      timestamp: formatTimeAgo(post.record?.createdAt || post.indexedAt),
      upvotes: Math.round(post.gltchScore || post.likeCount || 0),
      comments: post.replyCount || 0,
      imageUrl: extractImageUrl(post),
      videoUrl: extractVideoUrl(post),
      authorDisplayName: post.author.displayName,
      authorAvatar: post.author.avatar,
      postUri: post.uri,
      // Add custom fields
      isAppUser: post.isAppUser,
      communityBoost: post.communityBoost,
      gltchScore: post.gltchScore
    }));

    return {
      posts: transformedPosts,
      cursor: data.cursor
    };
  } catch (error) {
    console.error('Error fetching custom feed:', error);
    throw error;
  }
};

export const fetchAvailableFeeds = async (): Promise<CustomFeedConfig[]> => {
  try {
    const { data, error } = await supabase
      .from('custom_feeds')
      .select('*')
      .eq('is_active', true)
      .order('created_at');

    if (error) {
      console.error('Failed to fetch custom feeds:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching available feeds:', error);
    return [];
  }
};

export const addCommunityHashtag = async (
  communityId: string,
  hashtag: string,
  boostFactor: number = 1.0
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('community_hashtags')
      .insert({
        community_id: communityId,
        hashtag: hashtag.replace('#', ''), // Remove # if present
        boost_factor: boostFactor
      });

    if (error) {
      console.error('Failed to add community hashtag:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error adding community hashtag:', error);
    return false;
  }
};

export const getCommunityHashtags = async (communityId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('community_hashtags')
      .select('hashtag')
      .eq('community_id', communityId);

    if (error) {
      console.error('Failed to fetch community hashtags:', error);
      return [];
    }

    return data?.map(h => h.hashtag) || [];
  } catch (error) {
    console.error('Error fetching community hashtags:', error);
    return [];
  }
};

// Helper functions
export const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
};

const extractImageUrl = (post: any): string | undefined => {
  if (post.record?.embed?.$type === 'app.bsky.embed.images' && post.record.embed.images?.length > 0) {
    const image = post.record.embed.images[0];
    const imageRef = image?.image?.ref?.$link || 
                    image?.image?.ref?.toString() || 
                    image?.image?.ref?._baseCache?.get('b');
    
    if (imageRef) {
      return `https://cdn.bsky.app/img/feed_thumbnail/plain/${post.author.did}/${imageRef}@jpeg`;
    }
  }
  return undefined;
};

const extractVideoUrl = (post: any): string | undefined => {
  if (post.record?.embed?.$type === 'app.bsky.embed.video') {
    const videoRef = post.record.embed.video?.ref?.$link ||
                    post.record.embed.video?.ref?.toString() ||
                    post.record.embed.video?.ref?._baseCache?.get('b');
    if (videoRef) {
      return `https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${post.author.did}&cid=${videoRef}`;
    }
  }
  return undefined;
};