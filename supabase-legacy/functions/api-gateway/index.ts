import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get authorization header
    const authHeader = req.headers.get('Authorization')!;
    const supabaseUser = await supabaseClient.auth.getUser(authHeader);

    if (!supabaseUser.data?.user) {
      return new Response(
        JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the request body
    const requestData = await req.json();
    const { action, ...data } = requestData;

    // Route the request based on action
    switch (action) {
      case 'health-check':
        return new Response(
          JSON.stringify({ 
            status: 'healthy',
            timestamp: new Date().toISOString(),
            user: supabaseUser.data.user.id
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'get-profile':
        const { data: profile, error: profileError } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', supabaseUser.data.user.id)
          .single();

        if (profileError) {
          throw new Error(`Profile fetch error: ${profileError.message}`);
        }

        return new Response(
          JSON.stringify({ data: profile }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      case 'update-profile':
        const { data: updatedProfile, error: updateError } = await supabaseClient
          .from('profiles')
          .update(data)
          .eq('id', supabaseUser.data.user.id)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Profile update error: ${updateError.message}`);
        }

        return new Response(
          JSON.stringify({ data: updatedProfile }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      default:
        return new Response(
          JSON.stringify({ 
            error: { 
              code: 'INVALID_ACTION', 
              message: 'Invalid action specified' 
            } 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error) {
    console.error('Function error:', error);
    
    const errorResponse = {
      error: {
        code: 'FUNCTION_ERROR',
        message: error.message || 'An unexpected error occurred'
      }
    };

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});