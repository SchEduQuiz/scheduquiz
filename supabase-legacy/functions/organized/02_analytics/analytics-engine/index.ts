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

        const { type, courseId, studentId, startDate, endDate } = await req.json();

        let result = {};

        if (type === 'student_dashboard') {
            // Get student analytics
            const targetStudentId = studentId || userId;

            // Get enrolled courses count
            const coursesResponse = await fetch(
                `${supabaseUrl}/rest/v1/enrollments?student_id=eq.${targetStudentId}&select=count`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Prefer': 'count=exact'
                    }
                }
            );
            const coursesCount = parseInt(coursesResponse.headers.get('content-range')?.split('/')[1] || '0');

            // Get completed lessons
            const completedResponse = await fetch(
                `${supabaseUrl}/rest/v1/lesson_progress?student_id=eq.${targetStudentId}&completed=eq.true&select=count`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Prefer': 'count=exact'
                    }
                }
            );
            const completedLessons = parseInt(completedResponse.headers.get('content-range')?.split('/')[1] || '0');

            // Get average grade
            const gradesResponse = await fetch(
                `${supabaseUrl}/rest/v1/grades?student_id=eq.${targetStudentId}&select=points_earned,assignments(points_possible)`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );
            const grades = await gradesResponse.json();
            
            let averageGrade = 0;
            if (grades && grades.length > 0) {
                const totalPercent = grades.reduce((sum, g) => {
                    const percent = (g.points_earned / g.assignments.points_possible) * 100;
                    return sum + percent;
                }, 0);
                averageGrade = totalPercent / grades.length;
            }

            // Get study streak
            const streakResponse = await fetch(
                `${supabaseUrl}/rest/v1/study_streaks?user_id=eq.${targetStudentId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );
            const streakData = await streakResponse.json();
            const currentStreak = streakData && streakData[0] ? streakData[0].current_streak : 0;

            // Get recent activity (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const activityResponse = await fetch(
                `${supabaseUrl}/rest/v1/lesson_progress?student_id=eq.${targetStudentId}&completed_at=gte.${thirtyDaysAgo.toISOString()}&select=completed_at`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );
            const recentActivity = await activityResponse.json();

            result = {
                enrolledCourses: coursesCount,
                completedLessons: completedLessons,
                averageGrade: averageGrade.toFixed(2),
                currentStreak: currentStreak,
                recentActivity: recentActivity || []
            };

        } else if (type === 'course_analytics') {
            // Get course analytics for teacher
            
            // Total enrollments
            const enrollmentsResponse = await fetch(
                `${supabaseUrl}/rest/v1/enrollments?course_id=eq.${courseId}&select=count`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Prefer': 'count=exact'
                    }
                }
            );
            const totalEnrollments = parseInt(enrollmentsResponse.headers.get('content-range')?.split('/')[1] || '0');

            // Get course progress data
            const progressResponse = await fetch(
                `${supabaseUrl}/rest/v1/lesson_progress?course_id=eq.${courseId}&select=student_id,completed,lesson_id`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );
            const progressData = await progressResponse.json();

            // Calculate active students (those with activity in last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const activeResponse = await fetch(
                `${supabaseUrl}/rest/v1/lesson_progress?course_id=eq.${courseId}&last_viewed_at=gte.${sevenDaysAgo.toISOString()}&select=student_id`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );
            const activeData = await activeResponse.json();
            const activeStudents = new Set(activeData.map(a => a.student_id)).size;

            // Get assignment completion rate
            const assignmentsResponse = await fetch(
                `${supabaseUrl}/rest/v1/assignments?course_id=eq.${courseId}&select=id`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );
            const assignments = await assignmentsResponse.json();
            const totalAssignments = assignments.length;

            const submissionsResponse = await fetch(
                `${supabaseUrl}/rest/v1/submissions?assignment_id=in.(${assignments.map(a => a.id).join(',')})&select=status`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );
            const submissions = await submissionsResponse.json();
            const submittedCount = submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length;

            result = {
                totalEnrollments,
                activeStudents,
                totalAssignments,
                submittedAssignments: submittedCount,
                completionRate: totalAssignments > 0 ? ((submittedCount / (totalAssignments * totalEnrollments)) * 100).toFixed(2) : 0,
                progressData: progressData || []
            };

        } else if (type === 'teacher_overview') {
            // Get teacher overview analytics
            
            // Total courses taught
            const coursesResponse = await fetch(
                `${supabaseUrl}/rest/v1/courses?teacher_id=eq.${userId}&select=id`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );
            const courses = await coursesResponse.json();
            const courseIds = courses.map(c => c.id);

            // Total students across all courses
            let totalStudents = 0;
            if (courseIds.length > 0) {
                const studentsResponse = await fetch(
                    `${supabaseUrl}/rest/v1/enrollments?course_id=in.(${courseIds.join(',')})&select=student_id`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );
                const enrollments = await studentsResponse.json();
                totalStudents = new Set(enrollments.map(e => e.student_id)).size;
            }

            // Pending submissions to grade
            let pendingGrades = 0;
            if (courseIds.length > 0) {
                const assignmentsResponse = await fetch(
                    `${supabaseUrl}/rest/v1/assignments?course_id=in.(${courseIds.join(',')})&select=id`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );
                const assignments = await assignmentsResponse.json();
                const assignmentIds = assignments.map(a => a.id);

                if (assignmentIds.length > 0) {
                    const submissionsResponse = await fetch(
                        `${supabaseUrl}/rest/v1/submissions?assignment_id=in.(${assignmentIds.join(',')})&status=eq.submitted&select=count`,
                        {
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey,
                                'Prefer': 'count=exact'
                            }
                        }
                    );
                    pendingGrades = parseInt(submissionsResponse.headers.get('content-range')?.split('/')[1] || '0');
                }
            }

            result = {
                totalCourses: courses.length,
                totalStudents,
                pendingGrades
            };

        } else if (type === 'admin_overview') {
            // Get admin overview analytics
            
            // Total users by role
            const usersResponse = await fetch(
                `${supabaseUrl}/rest/v1/profiles?select=role`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );
            const users = await usersResponse.json();
            const usersByRole = users.reduce((acc, u) => {
                acc[u.role] = (acc[u.role] || 0) + 1;
                return acc;
            }, {});

            // Total courses
            const coursesResponse = await fetch(
                `${supabaseUrl}/rest/v1/courses?select=count`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Prefer': 'count=exact'
                    }
                }
            );
            const totalCourses = parseInt(coursesResponse.headers.get('content-range')?.split('/')[1] || '0');

            // Total enrollments
            const enrollmentsResponse = await fetch(
                `${supabaseUrl}/rest/v1/enrollments?select=count`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Prefer': 'count=exact'
                    }
                }
            );
            const totalEnrollments = parseInt(enrollmentsResponse.headers.get('content-range')?.split('/')[1] || '0');

            // Recent activity (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const activityResponse = await fetch(
                `${supabaseUrl}/rest/v1/user_activity_logs?created_at=gte.${sevenDaysAgo.toISOString()}&select=activity_type,created_at`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );
            const recentActivity = await activityResponse.json();

            result = {
                usersByRole,
                totalUsers: users.length,
                totalCourses,
                totalEnrollments,
                recentActivity: recentActivity || []
            };
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Function error:', error);

        const errorResponse = {
            error: {
                code: 'ANALYTICS_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
