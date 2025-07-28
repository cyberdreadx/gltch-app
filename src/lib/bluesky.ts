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
  postCid?: string; // Bluesky post CID for reposts
  parentPost?: {
    id?: string;
    title: string;
    author: string;
    authorDisplayName?: string;
    authorAvatar?: string;
    imageUrl?: string;
    videoUrl?: string;
  };
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
    postCid: post.cid, // Include Bluesky post CID for reposts
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
    
    // Filter out replies to show only original posts on profile
    const originalPosts = response.data.feed.filter(item => {
      const post = item.post as BlueskyPost;
      return !post.record?.reply; // Exclude posts that have a reply field (are replies)
    });
    
    return {
      posts: originalPosts.map(item => transformBlueskyPost(item.post as BlueskyPost)),
      cursor: response.data.cursor
    };
  } catch (error) {
    console.error('Failed to fetch user posts:', error);
    throw error;
  }
};

export const fetchUserReplies = async (handle: string, limit: number = 5, cursor?: string): Promise<{ posts: TransformedPost[], cursor?: string }> => {
  try {
    const response = await agent.getAuthorFeed({ actor: handle, limit, cursor });
    
    // Filter to show only replies (posts with a reply field)
    const replies = response.data.feed.filter(item => {
      const post = item.post as BlueskyPost;
      return post.record?.reply; // Include only posts that have a reply field (are replies)
    });

    // Transform replies and add parent post context
    const transformedReplies = await Promise.all(
      replies.map(async (item) => {
        const reply = transformBlueskyPost(item.post as BlueskyPost);
        
        // Try to fetch the parent post for context
        try {
          const replyRecord = item.post.record as any;
          const parentUri = replyRecord?.reply?.parent?.uri;
          if (parentUri) {
            const threadResponse = await agent.getPostThread({ uri: parentUri });
            if (threadResponse.success && threadResponse.data.thread && 'post' in threadResponse.data.thread) {
              const parentPost = transformBlueskyPost(threadResponse.data.thread.post as BlueskyPost);
              // Add parent post info to the reply
              reply.parentPost = {
                id: parentPost.id,
                title: parentPost.title,
                author: parentPost.author,
                authorDisplayName: parentPost.authorDisplayName,
                authorAvatar: parentPost.authorAvatar,
                imageUrl: parentPost.imageUrl,
                videoUrl: parentPost.videoUrl
              };
            }
          }
        } catch (error) {
          console.log('Could not fetch parent post context for reply:', error);
        }
        
        return reply;
      })
    );
    
    return {
      posts: transformedReplies,
      cursor: response.data.cursor
    };
  } catch (error) {
    console.error('Failed to fetch user replies:', error);
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

export const createRepost = async (postUri: string, postCid: string): Promise<{ success: boolean; repostUri?: string }> => {
  try {
    console.log('Creating repost with:', { postUri, postCid });
    const response = await agent.repost(postUri, postCid);
    console.log('Repost response:', response);
    
    return {
      success: true,
      repostUri: response.uri
    };
  } catch (error) {
    console.error('Failed to create repost:', error);
    return { success: false };
  }
};

export const deleteRepost = async (repostUri: string): Promise<{ success: boolean }> => {
  try {
    console.log('Deleting repost:', repostUri);
    await agent.deleteRepost(repostUri);
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

export interface Reply {
  uri: string;
  cid: string;
  author: {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  };
  record: any;
  indexedAt: string;
  replyCount?: number;
  likeCount?: number;
  repostCount?: number;
}

export interface ThreadPost {
  post: BlueskyPost;
  replies?: ThreadPost[];
}

export const fetchPostThread = async (postUri: string): Promise<{ thread: ThreadPost | null }> => {
  try {
    const response = await agent.getPostThread({ uri: postUri });
    
    if (response.success && response.data.thread) {
      return { thread: response.data.thread as ThreadPost };
    }
    
    return { thread: null };
  } catch (error) {
    console.error('Failed to fetch post thread:', error);
    return { thread: null };
  }
};

export const createReply = async (postUri: string, postCid: string, text: string): Promise<{ success: boolean; replyUri?: string }> => {
  try {
    console.log('Creating reply:', { postUri, postCid, text });
    
    const record = {
      $type: 'app.bsky.feed.post',
      text: `${text}\n\n— via gltch.app`,
      reply: {
        root: {
          uri: postUri,
          cid: postCid,
        },
        parent: {
          uri: postUri,
          cid: postCid,
        },
      },
      createdAt: new Date().toISOString(),
    };

    const response = await agent.api.com.atproto.repo.createRecord({
      repo: agent.session?.did || '',
      collection: 'app.bsky.feed.post',
      record,
    });
    
    console.log('Reply created:', response);
    
    return {
      success: true,
      replyUri: response.data.uri
    };
  } catch (error) {
    console.error('Failed to create reply:', error);
    return { success: false };
  }
};

export const likePost = async (postUri: string, postCid: string): Promise<{ success: boolean; likeUri?: string }> => {
  try {
    console.log('Liking post:', { postUri, postCid });
    const response = await agent.like(postUri, postCid);
    console.log('Like response:', response);
    
    return {
      success: true,
      likeUri: response.uri
    };
  } catch (error) {
    console.error('Failed to like post:', error);
    return { success: false };
  }
};

export const unlikePost = async (likeUri: string): Promise<{ success: boolean }> => {
  try {
    console.log('Unliking post:', likeUri);
    await agent.deleteLike(likeUri);
    return { success: true };
  } catch (error) {
    console.error('Failed to unlike post:', error);
    return { success: false };
  }
};

export const checkLikeStatus = async (postUri: string, userDid: string): Promise<{ isLiked: boolean; likeUri?: string }> => {
  try {
    // Get user's likes by listing records from their like collection
    const response = await agent.api.com.atproto.repo.listRecords({
      repo: userDid,
      collection: 'app.bsky.feed.like',
      limit: 50,
    });
    
    // Find a like that matches the post URI
    const like = response.data.records.find((record: any) => 
      record.value?.subject?.uri === postUri
    );
    
    return {
      isLiked: !!like,
      likeUri: like?.uri
    };
  } catch (error) {
    console.error('Failed to check like status:', error);
    return { isLiked: false };
  }
};

export const createReplyToComment = async (
  rootPostUri: string, 
  rootPostCid: string, 
  parentUri: string, 
  parentCid: string, 
  text: string
): Promise<{ success: boolean; replyUri?: string }> => {
  try {
    console.log('Creating reply to comment:', { rootPostUri, rootPostCid, parentUri, parentCid, text });
    
    const record = {
      $type: 'app.bsky.feed.post',
      text: `${text}\n\n— via gltch.app`,
      reply: {
        root: {
          uri: rootPostUri,
          cid: rootPostCid,
        },
        parent: {
          uri: parentUri,
          cid: parentCid,
        },
      },
      createdAt: new Date().toISOString(),
    };

    const response = await agent.api.com.atproto.repo.createRecord({
      repo: agent.session?.did || '',
      collection: 'app.bsky.feed.post',
      record,
    });
    
    console.log('Comment reply created:', response);
    
    return {
      success: true,
      replyUri: response.data.uri
    };
  } catch (error) {
    console.error('Failed to create comment reply:', error);
    return { success: false };
  }
};

export const createPost = async (text: string, images?: File[]): Promise<{ success: boolean; postUri?: string }> => {
  try {
    console.log('Creating post:', { text, imageCount: images?.length || 0 });
    
    let embed: any = undefined;
    
    // Upload images if provided
    if (images && images.length > 0) {
      try {
        const uploadedImages = [];
        
        for (const image of images) {
          console.log('Uploading image:', image.name, image.type);
          
          // Convert File to ArrayBuffer
          const arrayBuffer = await image.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Upload blob to AT Protocol
          const uploadResponse = await agent.uploadBlob(uint8Array, {
            encoding: image.type,
          });
          
          console.log('Image uploaded:', uploadResponse);
          
          uploadedImages.push({
            alt: '', // Could add alt text input in UI later
            image: uploadResponse.data.blob,
          });
        }
        
        // Create embed with images
        embed = {
          $type: 'app.bsky.embed.images',
          images: uploadedImages,
        };
        
        console.log('Created embed with images:', embed);
      } catch (imageError) {
        console.error('Failed to upload images:', imageError);
        throw new Error('Failed to upload images');
      }
    }
    
    const record = {
      $type: 'app.bsky.feed.post',
      text: `${text}\n\n— via gltch.app`,
      embed,
      createdAt: new Date().toISOString(),
    };

    const response = await agent.api.com.atproto.repo.createRecord({
      repo: agent.session?.did || '',
      collection: 'app.bsky.feed.post',
      record,
    });
    
    console.log('Post created:', response);
    
    return {
      success: true,
      postUri: response.data.uri
    };
  } catch (error) {
    console.error('Failed to create post:', error);
    return { success: false };
  }
};

export const deletePost = async (postUri: string): Promise<{ success: boolean }> => {
  try {
    console.log('Deleting post:', postUri);
    
    // Extract the record key from the URI
    // URI format: at://did:plc:xyz/app.bsky.feed.post/recordkey
    const uriParts = postUri.split('/');
    const recordKey = uriParts[uriParts.length - 1];
    
    await agent.api.com.atproto.repo.deleteRecord({
      repo: agent.session?.did || '',
      collection: 'app.bsky.feed.post',
      rkey: recordKey,
    });
    
    console.log('Post deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete post:', error);
    return { success: false };
  }
};