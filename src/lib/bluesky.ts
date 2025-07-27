import { agent } from './atproto';

export interface BlueskyPost {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: any; // Use any since AT Protocol records can vary
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  indexedAt: string;
}

export interface TransformedPost {
  id: string;
  title: string;
  content?: string;
  author: string;
  community: string;
  timestamp: string;
  upvotes: number;
  comments: number;
  imageUrl?: string;
  authorDisplayName?: string;
  authorAvatar?: string;
}

const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
};

const transformBlueskyPost = (post: BlueskyPost): TransformedPost => {
  const text = post.record?.text || 'No content';
  // Use first 100 chars as title, rest as content
  const title = text.length > 100 ? text.substring(0, 100) + '...' : text;
  const content = text.length > 100 ? text.substring(100) : undefined;
  
  // Get image URL if exists
  let imageUrl: string | undefined;
  if (post.record?.embed?.images && post.record.embed.images.length > 0) {
    const imageRef = post.record.embed.images[0]?.image?.ref?.$link;
    if (imageRef) {
      imageUrl = `https://cdn.bsky.app/img/feed_thumbnail/plain/${post.author.did}/${imageRef}@jpeg`;
    }
  }

  return {
    id: post.uri,
    title,
    content,
    author: post.author.handle,
    community: 'bluesky', // All posts are from Bluesky
    timestamp: formatTimeAgo(post.record?.createdAt || post.indexedAt),
    upvotes: post.likeCount || 0,
    comments: post.replyCount || 0,
    imageUrl,
    authorDisplayName: post.author.displayName,
    authorAvatar: post.author.avatar,
  };
};

export const fetchTimeline = async (limit: number = 30): Promise<TransformedPost[]> => {
  try {
    const response = await agent.getTimeline({ limit });
    return response.data.feed.map(item => transformBlueskyPost(item.post as BlueskyPost));
  } catch (error) {
    console.error('Failed to fetch timeline:', error);
    throw error;
  }
};

export const fetchUserPosts = async (handle: string, limit: number = 30): Promise<TransformedPost[]> => {
  try {
    const response = await agent.getAuthorFeed({ actor: handle, limit });
    return response.data.feed.map(item => transformBlueskyPost(item.post as BlueskyPost));
  } catch (error) {
    console.error('Failed to fetch user posts:', error);
    throw error;
  }
};

export const fetchPublicFeed = async (limit: number = 30): Promise<TransformedPost[]> => {
  try {
    // Use discover feed as fallback for unauthenticated users
    const response = await agent.app.bsky.feed.getFeedSkeleton({
      feed: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot',
      limit
    });
    
    // This would need additional resolution, for now return empty
    return [];
  } catch (error) {
    console.error('Failed to fetch public feed:', error);
    return [];
  }
};