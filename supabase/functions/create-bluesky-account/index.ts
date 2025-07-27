import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateAccountRequest {
  handle: string;
  email: string;
  password: string;
}

interface CreateAccountResponse {
  success: boolean;
  did?: string;
  handle?: string;
  accessJwt?: string;
  refreshJwt?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { handle, email, password }: CreateAccountRequest = await req.json();
    
    console.log(`Creating Bluesky account for handle: ${handle}`);

    // Format the handle to ensure it has .bsky.social
    const formattedHandle = handle.includes('.') ? handle : `${handle}.bsky.social`;
    
    // Create account via AT Protocol
    const createResponse = await fetch('https://bsky.social/xrpc/com.atproto.server.createAccount', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        handle: formattedHandle,
        email: email,
        password: password,
      }),
    });

    const createData = await createResponse.json();
    
    if (!createResponse.ok) {
      console.error('Bluesky account creation failed:', createData);
      return new Response(
        JSON.stringify({
          success: false,
          error: createData.message || 'Failed to create Bluesky account'
        } as CreateAccountResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Bluesky account created successfully:', createData.handle);

    return new Response(
      JSON.stringify({
        success: true,
        did: createData.did,
        handle: createData.handle,
        accessJwt: createData.accessJwt,
        refreshJwt: createData.refreshJwt,
      } as CreateAccountResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-bluesky-account function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      } as CreateAccountResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});