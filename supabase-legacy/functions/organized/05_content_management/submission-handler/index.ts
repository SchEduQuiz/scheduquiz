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

        const { action, submissionData, assignmentId, studentId } = await req.json();

        let result;

        if (action === 'submit') {
            // Create or update submission
            const submissionPayload = {
                assignment_id: assignmentId,
                student_id: userId,
                submission_text: submissionData.submission_text,
                file_url: submissionData.file_url,
                file_name: submissionData.file_name,
                status: 'submitted',
                submitted_at: new Date().toISOString()
            };

            // Check if submission exists
            const checkResponse = await fetch(
                `${supabaseUrl}/rest/v1/submissions?assignment_id=eq.${assignmentId}&student_id=eq.${userId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            const existing = await checkResponse.json();

            if (existing && existing.length > 0) {
                // Update existing submission
                const updateResponse = await fetch(
                    `${supabaseUrl}/rest/v1/submissions?id=eq.${existing[0].id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                            ...submissionPayload,
                            updated_at: new Date().toISOString()
                        })
                    }
                );

                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    throw new Error(`Submission update failed: ${errorText}`);
                }

                result = await updateResponse.json();
            } else {
                // Create new submission
                const createResponse = await fetch(`${supabaseUrl}/rest/v1/submissions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(submissionPayload)
                });

                if (!createResponse.ok) {
                    const errorText = await createResponse.text();
                    throw new Error(`Submission creation failed: ${errorText}`);
                }

                result = await createResponse.json();
            }

            // Get assignment details for notification
            const assignmentResponse = await fetch(
                `${supabaseUrl}/rest/v1/assignments?id=eq.${assignmentId}&select=teacher_id,title`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            const assignment = await assignmentResponse.json();

            if (assignment && assignment[0]) {
                // Notify teacher
                await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: assignment[0].teacher_id,
                        type: 'assignment',
                        title: 'New Assignment Submission',
                        message: `A student submitted: ${assignment[0].title}`,
                        link: `/teacher/submissions/${assignmentId}`
                    })
                });
            }

        } else if (action === 'list') {
            // List submissions for an assignment (teacher view)
            const listResponse = await fetch(
                `${supabaseUrl}/rest/v1/submissions?assignment_id=eq.${assignmentId}&select=*,profiles:student_id(full_name,email)`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (!listResponse.ok) {
                const errorText = await listResponse.text();
                throw new Error(`Submission list failed: ${errorText}`);
            }

            result = await listResponse.json();

        } else if (action === 'get_student_submissions') {
            // Get all submissions for a student
            const listResponse = await fetch(
                `${supabaseUrl}/rest/v1/submissions?student_id=eq.${studentId || userId}&select=*,assignments(title,course_id,due_date)`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (!listResponse.ok) {
                const errorText = await listResponse.text();
                throw new Error(`Student submissions failed: ${errorText}`);
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
                code: 'SUBMISSION_HANDLER_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
