// CORS headers for all edge functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
};

// Test Account Creation Edge Function

// Utility: Database fetch
async function dbFetch(url: string, options: RequestInit = {}) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const response = await fetch(`${supabaseUrl}${url}`, {
    ...options,
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response;
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { email, password, role = 'student' } = await req.json();

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (!['student', 'teacher', 'admin'].includes(role)) {
      throw new Error('Role must be student, teacher, or admin');
    }

    // Create user with proper profile
    const createUserResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: role,
          full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`
        }
      }),
    });

    if (!createUserResponse.ok) {
      const error = await createUserResponse.text();
      throw new Error(`Failed to create user: ${error}`);
    }

    const userData = await createUserResponse.json();
    const userId = userData.id;

    // Try to create profile, or update if it already exists
    const profileData = {
      role: role,
      full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      updated_at: new Date().toISOString(),
    };

    // First try to create new profile
    const profileResponse = await dbFetch('/rest/v1/profiles', {
      method: 'POST',
      body: JSON.stringify({
        id: userId,
        email: email,
        ...profileData,
        created_at: new Date().toISOString(),
      }),
    });

    if (!profileResponse.ok) {
      // If profile already exists (unique constraint violation), update instead
      const errorText = await profileResponse.text();
      if (errorText.includes('duplicate key') || errorText.includes('already exists')) {
        const updateResponse = await dbFetch(`/rest/v1/profiles?id=eq.${userId}`, {
          method: 'PATCH',
          body: JSON.stringify(profileData),
        });

        if (!updateResponse.ok) {
          const updateError = await updateResponse.text();
          console.error('Profile update failed:', updateError);
          // Try to delete the user if profile update fails
          await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            },
          });
          throw new Error(`Failed to update profile: ${updateError}`);
        }
      } else {
        console.error('Profile creation failed:', errorText);
        // Try to delete the user if profile creation fails
        await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          },
        });
        throw new Error(`Failed to create profile: ${errorText}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        user_id: userId,
        email: email,
        role: role,
        message: 'Test account created successfully'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function error:', error);

    return new Response(JSON.stringify({
      error: {
        code: 'FUNCTION_ERROR',
        message: error.message,
      },
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
