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
        const { action, userId, updates } = await req.json();
        
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Verify admin role
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');

        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Invalid token');
        }

        const userData = await userResponse.json();
        const requesterId = userData.id;

        // Check if requester is admin
        const profileResponse = await fetch(
            `${supabaseUrl}/rest/v1/profiles?id=eq.${requesterId}&select=role`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        const profiles = await profileResponse.json();
        if (!profiles || profiles.length === 0 || profiles[0].role !== 'admin') {
            throw new Error('Unauthorized: Admin access required');
        }

        let result;

        switch (action) {
            case 'list_users':
                // Get all users with their profiles
                const usersResponse = await fetch(
                    `${supabaseUrl}/rest/v1/profiles?select=*&order=created_at.desc`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );
                result = await usersResponse.json();
                break;

            case 'update_role':
                // Update user role
                const updateResponse = await fetch(
                    `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(updates)
                    }
                );
                result = await updateResponse.json();
                break;

            case 'delete_user':
                // Delete user from auth
                const deleteResponse = await fetch(
                    `${supabaseUrl}/auth/v1/admin/users/${userId}`,
                    {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );
                
                if (deleteResponse.ok) {
                    result = { success: true, message: 'User deleted successfully' };
                } else {
                    throw new Error('Failed to delete user');
                }
                break;

            default:
                throw new Error('Invalid action');
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Function error:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_OPERATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
