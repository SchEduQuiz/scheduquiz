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

        const { action, resourceData, resourceId, courseId } = await req.json();

        let result;

        if (action === 'upload') {
            // Create resource record
            const createResponse = await fetch(`${supabaseUrl}/rest/v1/course_resources`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    ...resourceData,
                    uploaded_by: userId
                })
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                throw new Error(`Resource creation failed: ${errorText}`);
            }

            result = await createResponse.json();

        } else if (action === 'list') {
            // List resources for a course
            let query = `${supabaseUrl}/rest/v1/course_resources?course_id=eq.${courseId}&select=*,profiles:uploaded_by(full_name)&order=created_at.desc`;
            
            const listResponse = await fetch(query, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!listResponse.ok) {
                const errorText = await listResponse.text();
                throw new Error(`Resource list failed: ${errorText}`);
            }

            result = await listResponse.json();

        } else if (action === 'delete') {
            // Delete resource
            const deleteResponse = await fetch(
                `${supabaseUrl}/rest/v1/course_resources?id=eq.${resourceId}`,
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
                throw new Error(`Resource deletion failed: ${errorText}`);
            }

            result = { success: true };

        } else if (action === 'bookmark') {
            // Toggle bookmark
            const { lessonId, notes } = resourceData;

            // Check if bookmark exists
            const checkResponse = await fetch(
                `${supabaseUrl}/rest/v1/bookmarks?user_id=eq.${userId}&lesson_id=eq.${lessonId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            const existing = await checkResponse.json();

            if (existing && existing.length > 0) {
                // Remove bookmark
                await fetch(
                    `${supabaseUrl}/rest/v1/bookmarks?id=eq.${existing[0].id}`,
                    {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );
                result = { bookmarked: false };
            } else {
                // Add bookmark
                const createResponse = await fetch(`${supabaseUrl}/rest/v1/bookmarks`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        lesson_id: lessonId,
                        course_id: courseId,
                        notes: notes || ''
                    })
                });

                if (!createResponse.ok) {
                    const errorText = await createResponse.text();
                    throw new Error(`Bookmark creation failed: ${errorText}`);
                }

                result = { bookmarked: true, data: await createResponse.json() };
            }

        } else if (action === 'get_bookmarks') {
            // Get user bookmarks
            const bookmarksResponse = await fetch(
                `${supabaseUrl}/rest/v1/bookmarks?user_id=eq.${userId}&select=*,lessons(title,course_id),courses(title)&order=created_at.desc`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (!bookmarksResponse.ok) {
                const errorText = await bookmarksResponse.text();
                throw new Error(`Get bookmarks failed: ${errorText}`);
            }

            result = await bookmarksResponse.json();
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Function error:', error);

        const errorResponse = {
            error: {
                code: 'RESOURCE_MANAGEMENT_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
