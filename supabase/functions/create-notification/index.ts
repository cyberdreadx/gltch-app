import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { type, postUri, fromUserId, fromUserHandle, fromUserAvatar, targetUserId } = await req.json();

    console.log('Creating notification:', { type, postUri, fromUserId, fromUserHandle, targetUserId });

    // Don't create notifications for users voting on their own posts
    if (fromUserId === targetUserId) {
      return new Response(
        JSON.stringify({ success: true, message: 'No notification needed for self-action' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let title = '';
    let message = '';

    switch (type) {
      case 'like':
        title = 'New like';
        message = `@${fromUserHandle} liked your post`;
        break;
      case 'repost':
        title = 'New repost';
        message = `@${fromUserHandle} reposted your post`;
        break;
      case 'comment':
        title = 'New comment';
        message = `@${fromUserHandle} commented on your post`;
        break;
      case 'follow':
        title = 'New follower';
        message = `@${fromUserHandle} started following you`;
        break;
      case 'mention':
        title = 'You were mentioned';
        message = `@${fromUserHandle} mentioned you in a post`;
        break;
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        type,
        title,
        message,
        post_uri: postUri,
        from_user_id: fromUserId,
        from_user_handle: fromUserHandle,
        from_user_avatar: fromUserAvatar,
      });

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }

    console.log('Notification created successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});