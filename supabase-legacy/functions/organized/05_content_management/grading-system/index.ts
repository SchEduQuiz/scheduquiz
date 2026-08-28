// CORS headers for all edge functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
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
        const teacherId = userData.id;

        const { action, submissionId, gradeData, courseId, studentId } = await req.json();

        let result;

        if (action === 'grade') {
            // Get submission details
            const submissionResponse = await fetch(
                `${supabaseUrl}/rest/v1/submissions?id=eq.${submissionId}&select=assignment_id,student_id`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            const submission = await submissionResponse.json();

            if (!submission || submission.length === 0) {
                throw new Error('Submission not found');
            }

            const { assignment_id, student_id } = submission[0];

            // Check if grade exists
            const checkGradeResponse = await fetch(
                `${supabaseUrl}/rest/v1/grades?submission_id=eq.${submissionId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            const existingGrade = await checkGradeResponse.json();

            const gradePayload = {
                submission_id: submissionId,
                assignment_id: assignment_id,
                student_id: student_id,
                teacher_id: teacherId,
                points_earned: gradeData.points_earned,
                feedback: gradeData.feedback,
                graded_at: new Date().toISOString()
            };

            if (existingGrade && existingGrade.length > 0) {
                // Update existing grade
                const updateResponse = await fetch(
                    `${supabaseUrl}/rest/v1/grades?id=eq.${existingGrade[0].id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                            ...gradePayload,
                            updated_at: new Date().toISOString()
                        })
                    }
                );

                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    throw new Error(`Grade update failed: ${errorText}`);
                }

                result = await updateResponse.json();
            } else {
                // Create new grade
                const createResponse = await fetch(`${supabaseUrl}/rest/v1/grades`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(gradePayload)
                });

                if (!createResponse.ok) {
                    const errorText = await createResponse.text();
                    throw new Error(`Grade creation failed: ${errorText}`);
                }

                result = await createResponse.json();
            }

            // Update submission status
            await fetch(`${supabaseUrl}/rest/v1/submissions?id=eq.${submissionId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'graded',
                    updated_at: new Date().toISOString()
                })
            });

            // Get assignment title for notification
            const assignmentResponse = await fetch(
                `${supabaseUrl}/rest/v1/assignments?id=eq.${assignment_id}&select=title`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            const assignment = await assignmentResponse.json();

            // Notify student
            await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: student_id,
                    type: 'grade',
                    title: 'Assignment Graded',
                    message: `Your submission for "${assignment[0]?.title}" has been graded`,
                    link: `/student/grades`
                })
            });

        } else if (action === 'get_grades') {
            // Get grades for a student in a course
            const gradesResponse = await fetch(
                `${supabaseUrl}/rest/v1/grades?student_id=eq.${studentId}&select=*,assignments(title,course_id,points_possible)&order=graded_at.desc`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (!gradesResponse.ok) {
                const errorText = await gradesResponse.text();
                throw new Error(`Get grades failed: ${errorText}`);
            }

            let grades = await gradesResponse.json();

            // Filter by course if specified
            if (courseId) {
                grades = grades.filter(g => g.assignments?.course_id === courseId);
            }

            result = grades;

        } else if (action === 'get_course_gradebook') {
            // Get all grades for a course (teacher view)
            const gradesResponse = await fetch(
                `${supabaseUrl}/rest/v1/grades?assignment_id=in.(select id from assignments where course_id=eq.${courseId})&select=*,profiles:student_id(full_name,email),assignments(title,points_possible)`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (!gradesResponse.ok) {
                const errorText = await gradesResponse.text();
                throw new Error(`Get gradebook failed: ${errorText}`);
            }

            result = await gradesResponse.json();
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Function error:', error);

        const errorResponse = {
            error: {
                code: 'GRADING_SYSTEM_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
