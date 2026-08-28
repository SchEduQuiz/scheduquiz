import { corsHeaders } from '../../../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

// Handle CORS preflight request
  ) {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

) {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization') || '';
    const apiKey = req.headers.get('apikey') || '';
    const url = new URL(req.url);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        auth_header_received: authHeader ? 'PRESENT' : 'MISSING',
        auth_header_length: authHeader.length,
        api_key_received: apiKey ? 'PRESENT' : 'MISSING',
        url: req.url,
        method: req.method,
        // Don't log actual token for security, just analyze it
        token_analysis: authHeader.startsWith('Bearer ') ? {
          starts_with_bearer: true,
          token_length: authHeader.replace('Bearer ', '').length,
          token_parts: authHeader.replace('Bearer ', '').split('.').length,
        } : {
          starts_with_bearer: false,
          raw_header: authHeader.substring(0, 50) + '...'
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: {
        code:
        message: error.message,
      },
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
