import { corsHeaders } from '../../../_shared/cors.ts';

// Admin Question Management Edge Function
// Handles comprehensive question CRUD operations across all question tables

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
    // Get Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const adminHeaders = {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
      'Content-Type': 'application/json'
    };

    // Parse request
    const requestData = await req.json();
    const { action, questionId, updates, filters, tableName } = requestData;

    // Admin verification - check if current user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
      error: {
        code: message: 'No authorization header' } 
      }), { status: 401, headers: corsHeaders });
    }

    // Verify admin role from auth token
    const token = authHeader.replace('Bearer ', '');
    const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!
      }
    });

    if (!verifyResponse.ok) {
      return new Response(JSON.stringify({
      error: {
        code: message: 'Invalid token' } 
      }), { status: 401, headers: corsHeaders });
    }

    const user = await verifyResponse.json();
    
    // Get user profile to verify admin role
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`, {
      headers: adminHeaders
    });
    
    const profiles = await profileResponse.json();
    if (!profiles || profiles.length === 0 || profiles[0].role !== 'admin') {
      return new Response(JSON.stringify({
      error: {
        code: message: 'Admin access required' } 
      }), { status: 403, headers: corsHeaders });
    }

    // Log admin action for audit trail
    const logAdminAction = async (adminId: string, action: string, targetQuestion: string, details: any) => {
      await fetch(`${supabaseUrl}/rest/v1/admin_activity_logs`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          admin_id: adminId,
          action: action,
          target_question_id: targetQuestion,
          details: details,
          timestamp: new Date().toISOString()
        })
      });
    };

    let result;

    switch (action) {
      case 'get_questions':
        // Get questions from specified table or all tables
        let query = `${supabaseUrl}/rest/v1/`;
        const questionTables = ['lesson_questions', 'questions', 'lesson_quizzes', 'quizzes'];
        
        if (tableName && questionTables.includes(tableName)) {
          // Get from specific table
          query += `${tableName}?select=*`;
        } else {
          // Get from all question tables
          const tableQueries = questionTables.map(table => 
            fetch(`${query}${table}?select=*`, { headers: adminHeaders })
          );
          
          const responses = await Promise.all(tableQueries);
          const tableData = await Promise.all(responses.map(r => r.json()));
          
          result = questionTables.map((table, index) => ({
            table,
            questions: tableData[index] || []
          }));
          break;
        }

        // Apply filters to specific table query
        if (filters) {
          if (filters.category) {
            query += `&category=eq.${filters.category}`;
          }
          if (filters.question_type) {
            query += `&question_type=eq.${filters.question_type}`;
          }
          if (filters.search) {
            query += `&or=(question_text.ilike.%25${filters.search}%25,options.ilike.%25${filters.search}%25)`;
          }
          if (filters.quiz_id) {
            query += `&quiz_id=eq.${filters.quiz_id}`;
          }
          if (filters.lesson_id) {
            query += `&lesson_id=eq.${filters.lesson_id}`;
          }
        }

        // Apply ordering and pagination
        const limit = filters?.limit || 50;
        const offset = filters?.offset || 0;
        query += `&order=created_at.desc&limit=${limit}&offset=${offset}`;

        const questionsResponse = await fetch(query, {
          headers: adminHeaders
        });

        if (!questionsResponse.ok) {
          throw new Error(`Failed to fetch questions from ${tableName}`);
        }

        result = await questionsResponse.json();
        break;

      case 'create_question':
        if (!tableName || !updates) {
          throw new Error('Table name and question data are required');
        }

        // Validate required fields based on table
        const requiredFields = {
          'lesson_questions': ['question_text', 'question_type'],
          'questions': ['question_text', 'question_type'],
          'lesson_quizzes': ['title', 'description'],
          'quizzes': ['title', 'description']
        };

        const required = requiredFields[tableName] || [];
        const missing = required.filter(field => !updates[field]);
        
        if (missing.length > 0) {
          throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        // Create question
        const createResponse = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({
            ...updates,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });

        if (!createResponse.ok) {
          const error = await createResponse.json();
          throw new Error(error.message || 'Failed to create question');
        }

        result = await createResponse.json();

        // Log admin action
        await logAdminAction(user.id, 'create_question', tableName, { 
          tableName,
          questionData: updates 
        });

        break;

      case 'update_question':
        if (!tableName || !questionId || !updates) {
          throw new Error('Table name, question ID, and updates are required');
        }

        // Update question
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/${tableName}?id=eq.${questionId}`, {
          method: 'PATCH',
          headers: adminHeaders,
          body: JSON.stringify({
            ...updates,
            updated_at: new Date().toISOString()
          })
        });

        if (!updateResponse.ok) {
          const error = await updateResponse.json();
          throw new Error(error.message || 'Failed to update question');
        }

        result = await updateResponse.json();

        // Log admin action
        await logAdminAction(user.id, 'update_question', questionId, { 
          tableName,
          updates 
        });

        break;

      case 'delete_question':
        if (!tableName || !questionId) {
          throw new Error('Table name and question ID are required');
        }

        // Delete question
        const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/${tableName}?id=eq.${questionId}`, {
          method: 'DELETE',
          headers: adminHeaders
        });

        if (!deleteResponse.ok) {
          throw new Error('Failed to delete question');
        }

        result = { success: true, message: 'Question deleted successfully' };

        // Log admin action
        await logAdminAction(user.id, 'delete_question', questionId, { tableName });

        break;

      case 'bulk_delete_questions':
        if (!tableName || !updates || !Array.isArray(updates.questionIds)) {
          throw new Error('Table name and question IDs are required for bulk operations');
        }

        const bulkResults = [];
        for (const qid of updates.questionIds) {
          try {
            const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?id=eq.${qid}`, {
              method: 'DELETE',
              headers: adminHeaders
            });

            if (response.ok) {
              bulkResults.push({ questionId: qid, success: true });
            } else {
              bulkResults.push({ questionId: qid, success: false, error: 'Delete failed' });
            }
          } catch (error) {
            bulkResults.push({ questionId: qid, success: false, error: error.message });
          }
        }

        result = { results: bulkResults };

        // Log admin action
        await logAdminAction(user.id, 'bulk_delete_questions', 'multiple', {
          tableName,
          questionIds: updates.questionIds
        });

        break;

      case 'duplicate_question':
        if (!tableName || !questionId) {
          throw new Error('Table name and question ID are required');
        }

        // Get original question
        const getResponse = await fetch(`${supabaseUrl}/rest/v1/${tableName}?id=eq.${questionId}`, {
          headers: adminHeaders
        });

        if (!getResponse.ok) {
          throw new Error('Failed to fetch original question');
        }

        const originalQuestions = await getResponse.json();
        if (originalQuestions.length === 0) {
          throw new Error('Question not found');
        }

        const original = originalQuestions[0];
        
        // Remove ID and set new data
        const { id, created_at, updated_at, ...questionData } = original;
        questionData.question_text = `${questionData.question_text} (Copy)`;
        questionData.created_at = new Date().toISOString();
        questionData.updated_at = new Date().toISOString();

        // Create duplicate
        const duplicateResponse = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify(questionData)
        });

        if (!duplicateResponse.ok) {
          throw new Error('Failed to duplicate question');
        }

        result = await duplicateResponse.json();

        // Log admin action
        await logAdminAction(user.id, 'duplicate_question', questionId, { 
          tableName,
          newQuestionId: result.id 
        });

        break;

      case 'get_question_stats':
        // Get comprehensive question statistics
        const statsQueries = [
          // Questions by table
          fetch(`${supabaseUrl}/rest/v1/lesson_questions?select=question_type`, {
            headers: adminHeaders
          }),
          fetch(`${supabaseUrl}/rest/v1/questions?select=question_type`, {
            headers: adminHeaders
          }),
          // Lesson questions by lesson_id
          fetch(`${supabaseUrl}/rest/v1/lesson_questions?select=lesson_id`, {
            headers: adminHeaders
          }),
          // Questions by quiz_id
          fetch(`${supabaseUrl}/rest/v1/lesson_questions?select=quiz_id`, {
            headers: adminHeaders
          })
        ];

        const [lessonTypeData, questionTypeData, lessonData, quizData] = await Promise.all(statsQueries);
        const lessonTypes = await lessonTypeData.json();
        const questionTypes = await questionTypeData.json();
        const lessonQuestions = await lessonData.json();
        const quizQuestions = await quizData.json();

        // Process statistics
        const lessonTypeStats = lessonTypes.reduce((acc: any, q: any) => {
          acc[q.question_type] = (acc[q.question_type] || 0) + 1;
          return acc;
        }, {});

        const questionTypeStats = questionTypes.reduce((acc: any, q: any) => {
          acc[q.question_type] = (acc[q.question_type] || 0) + 1;
          return acc;
        }, {});

        const totalQuestions = lessonQuestions.length + questionTypes.length;
        const linkedToLessons = lessonQuestions.filter((q: any) => q.lesson_id).length;
        const linkedToQuizzes = quizQuestions.filter((q: any) => q.quiz_id).length;

        result = {
          totalQuestions,
          lessonTypeBreakdown: lessonTypeStats,
          questionTypeBreakdown: questionTypeStats,
          questionsWithLessons: linkedToLessons,
          questionsWithQuizzes: linkedToQuizzes,
          tableBreakdown: {
            lesson_questions: lessonQuestions.length,
            questions: questionTypes.length,
            lesson_quizzes: await (await fetch(`${supabaseUrl}/rest/v1/lesson_quizzes?select=count`, {
              headers: adminHeaders
            })).json().then(d => d.length || 0),
            quizzes: await (await fetch(`${supabaseUrl}/rest/v1/quizzes?select=count`, {
              headers: adminHeaders
            })).json().then(d => d.length || 0)
          }
        };

        break;

      case 'search_questions':
        // Search across all question tables
        const searchTerm = filters?.search;
        if (!searchTerm) {
          throw new Error('Search term is required');
        }

        const searchQueries = [
          // Search in lesson_questions
          fetch(`${supabaseUrl}/rest/v1/lesson_questions?or=(question_text.ilike.%25${searchTerm}%25,options.ilike.%25${searchTerm}%25,correct_answer.ilike.%25${searchTerm}%25)&limit=20`, {
            headers: adminHeaders
          }),
          // Search in questions
          fetch(`${supabaseUrl}/rest/v1/questions?or=(question_text.ilike.%25${searchTerm}%25,options.ilike.%25${searchTerm}%25,correct_answer.ilike.%25${searchTerm}%25)&limit=20`, {
            headers: adminHeaders
          }),
          // Search in lesson_quizzes
          fetch(`${supabaseUrl}/rest/v1/lesson_quizzes?or=(title.ilike.%25${searchTerm}%25,description.ilike.%25${searchTerm}%25)&limit=20`, {
            headers: adminHeaders
          }),
          // Search in quizzes
          fetch(`${supabaseUrl}/rest/v1/quizzes?or=(title.ilike.%25${searchTerm}%25,description.ilike.%25${searchTerm}%25)&limit=20`, {
            headers: adminHeaders
          })
        ];

        const searchResponses = await Promise.all(searchQueries);
        const searchResults = await Promise.all(searchResponses.map(r => r.json()));

        result = {
          lesson_questions: searchResults[0] || [],
          questions: searchResults[1] || [],
          lesson_quizzes: searchResults[2] || [],
          quizzes: searchResults[3] || []
        };

        // Log admin action
        await logAdminAction(user.id, 'search_questions', 'search', { 
          searchTerm 
        });

        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      error: {
        code: 
        message: error.message 
      } 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});