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
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify user
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
        const userId = userData.id;

        const { action, notificationData, notificationId } = await req.json();

        let result;

        if (action === 'create') {
            // Create notification
            const createResponse = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(notificationData)
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                throw new Error(`Notification creation failed: ${errorText}`);
            }

            result = await createResponse.json();

        } else if (action === 'mark_read') {
            // Mark notification as read
            const updateResponse = await fetch(
                `${supabaseUrl}/rest/v1/notifications?id=eq.${notificationId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({ read: true })
                }
            );

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Mark read failed: ${errorText}`);
            }

            result = await updateResponse.json();

        } else if (action === 'mark_all_read') {
            // Mark all notifications as read for user
            const updateResponse = await fetch(
                `${supabaseUrl}/rest/v1/notifications?user_id=eq.${userId}&read=eq.false`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ read: true })
                }
            );

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Mark all read failed: ${errorText}`);
            }

            result = { success: true };

        } else if (action === 'list') {
            // List notifications for user
            const listResponse = await fetch(
                `${supabaseUrl}/rest/v1/notifications?user_id=eq.${userId}&order=created_at.desc&limit=50`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (!listResponse.ok) {
                const errorText = await listResponse.text();
                throw new Error(`List notifications failed: ${errorText}`);
            }

            result = await listResponse.json();

        } else if (action === 'get_unread_count') {
            // Get unread count
            const countResponse = await fetch(
                `${supabaseUrl}/rest/v1/notifications?user_id=eq.${userId}&read=eq.false&select=count`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Prefer': 'count=exact'
                    }
                }
            );

            if (!countResponse.ok) {
                const errorText = await countResponse.text();
                throw new Error(`Get count failed: ${errorText}`);
            }

            const countHeader = countResponse.headers.get('content-range');
            const count = countHeader ? parseInt(countHeader.split('/')[1]) : 0;

            result = { count };

        } else if (action === 'delete') {
            // Delete notification
            const deleteResponse = await fetch(
                `${supabaseUrl}/rest/v1/notifications?id=eq.${notificationId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (!deleteResponse.ok) {
                const errorText = await deleteResponse.text();
                throw new Error(`Delete notification failed: ${errorText}`);
            }

            result = { success: true };
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Function error:', error);

        const errorResponse = {
            error: {
                code: 'NOTIFICATION_MANAGEMENT_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
