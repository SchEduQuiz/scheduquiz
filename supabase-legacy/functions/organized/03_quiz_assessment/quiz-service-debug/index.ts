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
        console.log('=== QUIZ SERVICE DEBUG START ===');
        
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        console.log('Environment variables:', {
            hasServiceKey: !!serviceRoleKey,
            hasUrl: !!supabaseUrl,
            url: supabaseUrl
        });

        if (!serviceRoleKey || !supabaseUrl) {
            console.error('Missing environment variables');
            throw new Error('Supabase configuration missing');
        }

        const url = new URL(req.url);
        const method = req.method;
        const path = url.pathname;
        
        console.log('Request details:', { method, path });

        const response = await fetch(`${supabaseUrl}/rest/v1/quizzes?select=*&is_active=eq.true&order=id`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        console.log('Main response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Main response error:', errorText);
            throw new Error(`Failed to fetch quizzes: ${response.status} - ${errorText}`);
        }

        const quizzes = await response.json();
        console.log(`Found ${quizzes.length} quizzes:`, quizzes.map(q => ({ id: q.id, title: q.title, active: q.is_active })));

        // Handle different request patterns
        const pathParts = path.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        
        console.log('Path analysis:', { path, pathParts, lastPart });

        // If requesting specific quiz with ID, get questions
        if (lastPart && lastPart !== 'quiz-service-debug' && /^\d+$/.test(lastPart)) {
            const quizId = parseInt(lastPart);
            console.log(`Fetching questions for quiz ID: ${quizId}`);
            
            // Get the quiz details first
            const quiz = quizzes.find(q => q.id === quizId);
            if (!quiz) {
                throw new Error(`Quiz with ID ${quizId} not found`);
            }

            // Get questions for this quiz
            const questionsResponse = await fetch(`${supabaseUrl}/rest/v1/questions?quiz_id=eq.${quizId}&select=id,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,difficulty,time_limit,points,hint&order=id`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!questionsResponse.ok) {
                const errorText = await questionsResponse.text();
                console.error('Questions response error:', errorText);
                throw new Error(`Failed to fetch questions: ${questionsResponse.status} - ${errorText}`);
            }

            const allQuestions = await questionsResponse.json();
            console.log(`Found ${allQuestions.length} questions for quiz ${quizId}`);
            
            // Fisher-Yates shuffle algorithm for random array selection
            function shuffleArray<T>(array: T[]): T[] {
                const shuffled = [...array];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                return shuffled;
            }

            // Randomly select 15 questions from the pool for variety in each challenge session
            // This ensures each quiz session is unique and players get different questions
            const shuffledQuestions = shuffleArray(allQuestions);
            const selectedQuestions = shuffledQuestions.slice(0, 15);
            
            console.log(`Quiz ${quizId}: Selected ${selectedQuestions.length} questions from ${allQuestions.length} total questions`);
            
            // Format questions for frontend
            const formattedQuestions = selectedQuestions.map(q => ({
                id: q.id,
                question: q.question_text,
                options: [q.option_a, q.option_b, q.option_c, q.option_d],
                correctAnswer: q.correct_answer,
                explanation: q.explanation,
                difficulty: q.difficulty,
                timeLimit: q.time_limit,
                points: q.points,
                hint: q.hint
            }));

            // Return quiz data with questions
            const result = {
                quiz: {
                    id: quiz.id,
                    title: quiz.title,
                    description: quiz.description,
                    category: quiz.category,
                    difficulty: quiz.difficulty,
                    estimatedTime: Math.round((quiz.time_limit || 0) / 60),
                    totalQuestions: selectedQuestions.length // This is now the actual number returned
                },
                questions: formattedQuestions
            };

            console.log('Returning quiz with questions:', { quizId, questionCount: formattedQuestions.length });
            console.log('=== QUIZ SERVICE DEBUG END ===');
            
            return new Response(JSON.stringify({ data: result }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } else {
            // Return list of all quizzes (metadata only)
            const items = quizzes.map(quiz => ({
                id: quiz.id,
                title: quiz.title,
                description: quiz.description,
                category: quiz.category,
                difficulty: quiz.difficulty,
                estimatedTime: Math.round((quiz.time_limit || 0) / 60)
            }));

            console.log('Returning quiz list:', { quizCount: items.length });
            console.log('=== QUIZ SERVICE DEBUG END ===');
            
            return new Response(JSON.stringify({ items }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('=== QUIZ SERVICE ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        const errorResponse = {
            error: {
                code: 'QUIZ_SERVICE_ERROR',
                message: error.message,
                details: {
                    envCheck: {
                        hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
                        hasUrl: !!Deno.env.get('SUPABASE_URL'),
                        url: Deno.env.get('SUPABASE_URL')
                    }
                }
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});