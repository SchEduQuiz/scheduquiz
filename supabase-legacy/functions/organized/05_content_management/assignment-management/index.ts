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

        const { action, assignmentData, assignmentId } = await req.json();

        let result;

        if (action === 'create') {
            // Create assignment
            const createResponse = await fetch(`${supabaseUrl}/rest/v1/assignments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    ...assignmentData,
                    teacher_id: userId
                })
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                throw new Error(`Assignment creation failed: ${errorText}`);
            }

            result = await createResponse.json();

            // Create calendar event for assignment due date
            if (assignmentData.due_date) {
                await fetch(`${supabaseUrl}/rest/v1/calendar_events`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        course_id: assignmentData.course_id,
                        created_by: userId,
                        title: `Assignment Due: ${assignmentData.title}`,
                        event_date: assignmentData.due_date,
                        event_type: 'assignment_due'
                    })
                });
            }

        } else if (action === 'update') {
            // Update assignment
            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/assignments?id=eq.${assignmentId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    ...assignmentData,
                    updated_at: new Date().toISOString()
                })
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Assignment update failed: ${errorText}`);
            }

            result = await updateResponse.json();

        } else if (action === 'delete') {
            // Delete assignment
            const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/assignments?id=eq.${assignmentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!deleteResponse.ok) {
                const errorText = await deleteResponse.text();
                throw new Error(`Assignment deletion failed: ${errorText}`);
            }

            result = { success: true };

        } else if (action === 'list') {
            // List assignments for a course
            const courseId = assignmentData.course_id;
            const listResponse = await fetch(`${supabaseUrl}/rest/v1/assignments?course_id=eq.${courseId}&order=due_date.asc`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!listResponse.ok) {
                const errorText = await listResponse.text();
                throw new Error(`Assignment list failed: ${errorText}`);
            }

            result = await listResponse.json();
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Function error:', error);

        const errorResponse = {
            error: {
                code: 'ASSIGNMENT_MANAGEMENT_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
