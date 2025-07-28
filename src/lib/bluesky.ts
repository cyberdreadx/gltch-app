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
  reposts: number;
  imageUrl?: string;
  videoUrl?: string;
  mediaAlt?: string;
  authorDisplayName?: string;
  authorAvatar?: string;
  postUri?: string; // Bluesky post URI for voting
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
  // Use full text as title, no artificial truncation
  const title = text;
  const content = undefined; // No separate content since we're showing full text as title
  
  // Handle media (images and videos)
  let imageUrl: string | undefined;
  let videoUrl: string | undefined;
  let mediaAlt: string | undefined;
  
  // Debug logging
  console.log('Post embed type:', post.record?.embed?.$type);
  
  if (post.record?.embed?.$type === 'app.bsky.embed.images' && post.record.embed.images?.length > 0) {
    console.log('Found images array with length:', post.record.embed.images.length);
    const image = post.record.embed.images[0];
    console.log('Image object keys:', Object.keys(image));
    console.log('Image.image keys:', Object.keys(image.image || {}));
    
    // Try different ways to access the CID
    const imageRef = image?.image?.ref?.$link || 
                    image?.image?.ref?.toString() || 
                    image?.image?.ref?._baseCache?.get('b') ||
                    (image?.image?.ref?._baseCache?.get ? image.image.ref._baseCache.get('b') : null);
    
    console.log('Extracted image ref:', imageRef);
    
    if (imageRef) {
      // Use Bluesky's public CDN for images
      imageUrl = `https://cdn.bsky.app/img/feed_thumbnail/plain/${post.author.did}/${imageRef}@jpeg`;
      console.log('Generated image URL:', imageUrl);
      mediaAlt = image.alt;
    }
  } else if (post.record?.embed?.$type === 'app.bsky.embed.video') {
    console.log('Found video embed');
    const videoRef = post.record.embed.video?.ref?.$link ||
                    post.record.embed.video?.ref?.toString() ||
                    post.record.embed.video?.ref?._baseCache?.get('b');
    console.log('Video ref:', videoRef);
    if (videoRef) {
      // Use AT Protocol blob endpoint for videos
      videoUrl = `https://bsky.social/xrpc/com.atproto.sync.getBlob?did=${post.author.did}&cid=${videoRef}`;
      console.log('Generated video URL:', videoUrl);
    }
  }

  return {
    id: post.uri,
    title,
    content,
    author: post.author.handle,
    community: 'g/feed',
    timestamp: formatTimeAgo(post.record?.createdAt || post.indexedAt),
    upvotes: post.likeCount || 0,
    comments: post.replyCount || 0,
    reposts: post.repostCount || 0,
    imageUrl,
    videoUrl,
    mediaAlt,
    authorDisplayName: post.author.displayName,
    authorAvatar: post.author.avatar,
    postUri: post.uri, // Include Bluesky post URI for voting
  };
};

export const fetchTimeline = async (limit: number = 5, cursor?: string): Promise<{ posts: TransformedPost[], cursor?: string }> => {
  try {
    const response = await agent.getTimeline({ limit, cursor });
    return {
      posts: response.data.feed.map(item => transformBlueskyPost(item.post as BlueskyPost)),
      cursor: response.data.cursor
    };
  } catch (error) {
    console.error('Failed to fetch timeline:', error);
    throw error;
  }
};

export const fetchUserPosts = async (handle: string, limit: number = 5, cursor?: string): Promise<{ posts: TransformedPost[], cursor?: string }> => {
  try {
    const response = await agent.getAuthorFeed({ actor: handle, limit, cursor });
    return {
      posts: response.data.feed.map(item => transformBlueskyPost(item.post as BlueskyPost)),
      cursor: response.data.cursor
    };
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
    // Use Bluesky's "What's Hot" discover feed for public content
    const response = await agent.app.bsky.feed.getFeed({
      feed: 'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot',
      limit
    });
    
    if (response.success && response.data.feed) {
      return response.data.feed.map((item: any) => transformBlueskyPost(item.post));
    }
    
    return [];
  } catch (error) {
    console.error('Failed to fetch public feed:', error);
    // Fallback to timeline if discover feed fails
    try {
      const fallbackResponse = await agent.getTimeline({ limit: Math.min(limit, 20) });
      if (fallbackResponse.success && fallbackResponse.data.feed) {
        return fallbackResponse.data.feed.map((item: any) => transformBlueskyPost(item.post));
      }
    } catch (fallbackError) {
      console.error('Fallback to timeline also failed:', fallbackError);
    }
    return [];
  }
};

export const fetchPostsByHashtag = async (hashtag: string, limit: number = 30): Promise<TransformedPost[]> => {
  try {
    // Search for posts containing the hashtag
    const response = await agent.app.bsky.feed.searchPosts({
      q: `#${hashtag}`,
      limit
    });
    
    return response.data.posts.map(post => transformBlueskyPost(post as BlueskyPost));
  } catch (error) {
    console.error('Failed to fetch posts by hashtag:', error);
    return [];
  }
};

export const createRepost = async (postUri: string): Promise<{ success: boolean; repostUri?: string }> => {
  try {
    // Parse the post URI to get the repo and rkey
    const uriParts = postUri.split('/');
    const repo = uriParts[2]; // did:plc:...
    const rkey = uriParts[4]; // post ID
    
    const response = await agent.api.com.atproto.repo.createRecord({
      repo: agent.session?.did || '',
      collection: 'app.bsky.feed.repost',
      record: {
        subject: {
          uri: postUri,
          cid: '', // We don't have the CID, but it's not strictly required for reposts
        },
        createdAt: new Date().toISOString(),
      },
    });
    
    return {
      success: true,
      repostUri: response.data.uri
    };
  } catch (error) {
    console.error('Failed to create repost:', error);
    return { success: false };
  }
};

export const deleteRepost = async (repostUri: string): Promise<{ success: boolean }> => {
  try {
    // Parse the repost URI to get repo and rkey
    const uriParts = repostUri.split('/');
    const repo = uriParts[2];
    const rkey = uriParts[4];
    
    await agent.api.com.atproto.repo.deleteRecord({
      repo,
      collection: 'app.bsky.feed.repost',
      rkey,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete repost:', error);
    return { success: false };
  }
};

export const checkRepostStatus = async (postUri: string, userDid: string): Promise<{ isReposted: boolean; repostUri?: string }> => {
  try {
    // Get user's reposts by listing records from their repost collection
    const response = await agent.api.com.atproto.repo.listRecords({
      repo: userDid,
      collection: 'app.bsky.feed.repost',
      limit: 50,
    });
    
    // Find a repost that matches the post URI
    const repost = response.data.records.find((record: any) => 
      record.value?.subject?.uri === postUri
    );
    
    return {
      isReposted: !!repost,
      repostUri: repost?.uri
    };
  } catch (error) {
    console.error('Failed to check repost status:', error);
    return { isReposted: false };
  }
};