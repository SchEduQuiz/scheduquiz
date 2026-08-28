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

        // Get total counts
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

        const studentsResponse = await fetch(
            `${supabaseUrl}/rest/v1/profiles?role=eq.student&select=count`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Prefer': 'count=exact'
                }
            }
        );

        const teachersResponse = await fetch(
            `${supabaseUrl}/rest/v1/profiles?role=eq.teacher&select=count`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Prefer': 'count=exact'
                }
            }
        );

        const coursesCount = parseInt(coursesResponse.headers.get('content-range')?.split('/')[1] || '0');
        const enrollmentsCount = parseInt(enrollmentsResponse.headers.get('content-range')?.split('/')[1] || '0');
        const studentsCount = parseInt(studentsResponse.headers.get('content-range')?.split('/')[1] || '0');
        const teachersCount = parseInt(teachersResponse.headers.get('content-range')?.split('/')[1] || '0');

        const stats = {
            totalCourses: coursesCount,
            totalEnrollments: enrollmentsCount,
            totalStudents: studentsCount,
            totalTeachers: teachersCount
        };

        return new Response(JSON.stringify({ data: stats }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Function error:', error);

        const errorResponse = {
            error: {
                code: 'STATS_FETCH_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
