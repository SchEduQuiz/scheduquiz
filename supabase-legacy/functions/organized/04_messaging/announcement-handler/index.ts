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

        const { action, announcementData, announcementId, courseId } = await req.json();

        let result;

        if (action === 'create') {
            // Create announcement
            const createResponse = await fetch(`${supabaseUrl}/rest/v1/announcements`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    ...announcementData,
                    teacher_id: userId
                })
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                throw new Error(`Announcement creation failed: ${errorText}`);
            }

            result = await createResponse.json();

            // Send notifications to all enrolled students
            const enrollmentsResponse = await fetch(
                `${supabaseUrl}/rest/v1/enrollments?course_id=eq.${announcementData.course_id}&select=student_id`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            const enrollments = await enrollmentsResponse.json();

            if (enrollments && enrollments.length > 0) {
                // Create notifications for all students
                const notifications = enrollments.map(e => ({
                    user_id: e.student_id,
                    type: 'announcement',
                    title: 'New Announcement',
                    message: announcementData.title,
                    link: `/student/courses/${announcementData.course_id}`,
                    read: false
                }));

                await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(notifications)
                });
            }

        } else if (action === 'list') {
            // List announcements for a course
            const listResponse = await fetch(
                `${supabaseUrl}/rest/v1/announcements?course_id=eq.${courseId}&select=*,profiles:teacher_id(full_name)&order=created_at.desc`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (!listResponse.ok) {
                const errorText = await listResponse.text();
                throw new Error(`Announcement list failed: ${errorText}`);
            }

            result = await listResponse.json();

        } else if (action === 'delete') {
            // Delete announcement
            const deleteResponse = await fetch(
                `${supabaseUrl}/rest/v1/announcements?id=eq.${announcementId}`,
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
                throw new Error(`Announcement deletion failed: ${errorText}`);
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
                code: 'ANNOUNCEMENT_HANDLER_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
