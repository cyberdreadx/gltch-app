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
  videoUrl?: string;
  mediaAlt?: string;
  authorDisplayName?: string;
  authorAvatar?: string;
}

export interface ProfileData {
  did: string;
  handle: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  followsCount?: number;
  followersCount?: number;
  postsCount?: number;
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
  
  // Handle media (images and videos)
  let imageUrl: string | undefined;
  let videoUrl: string | undefined;
  let mediaAlt: string | undefined;
  
  // Debug logging
  console.log('Post record:', post.record);
  console.log('Post embed:', post.record?.embed);
  
  if (post.record?.embed?.images && post.record.embed.images.length > 0) {
    console.log('Found images:', post.record.embed.images);
    const image = post.record.embed.images[0];
    console.log('First image:', image);
    const imageRef = image?.image?.ref?.$link;
    console.log('Image ref:', imageRef);
    if (imageRef) {
      // Use Bluesky's public CDN for images
      imageUrl = `https://cdn.bsky.app/img/feed_thumbnail/plain/${post.author.did}/${imageRef}@jpeg`;
      console.log('Generated image URL:', imageUrl);
      mediaAlt = image.alt;
    }
  } else if (post.record?.embed?.video) {
    const videoRef = post.record.embed.video?.ref?.$link;
    if (videoRef) {
      // Videos are harder to access, might need authentication
      videoUrl = `https://cdn.bsky.app/img/feed_thumbnail/plain/${post.author.did}/${videoRef}@jpeg`;
    }
  }

  return {
    id: post.uri,
    title,
    content,
    author: post.author.handle,
    community: 'bluesky',
    timestamp: formatTimeAgo(post.record?.createdAt || post.indexedAt),
    upvotes: post.likeCount || 0,
    comments: post.replyCount || 0,
    imageUrl,
    videoUrl,
    mediaAlt,
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

export const fetchProfile = async (handle: string): Promise<ProfileData> => {
  try {
    const response = await agent.getProfile({ actor: handle });
    return {
      did: response.data.did,
      handle: response.data.handle,
      displayName: response.data.displayName,
      description: response.data.description,
      avatar: response.data.avatar,
      banner: response.data.banner,
      followsCount: response.data.followsCount,
      followersCount: response.data.followersCount,
      postsCount: response.data.postsCount,
    };
  } catch (error) {
    console.error('Failed to fetch profile:', error);
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