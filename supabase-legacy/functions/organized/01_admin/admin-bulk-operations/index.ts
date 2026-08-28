// Admin Bulk Operations Edge Function
// Handles efficient bulk operations for users and questions

import { corsHeaders } from '../../../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
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
    const { action, entityType, operations, filters } = requestData;

    // Admin verification - check if current user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authorization header'
        }
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
          code: 'UNAUTHORIZED',
          message: 'Invalid token'
        }
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
          code: 'FORBIDDEN',
          message: 'Admin access required'
        }
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Log admin action for audit trail
    const logAdminAction = async (adminId: string, action: string, entityType: string, details: any) => {
      await fetch(`${supabaseUrl}/rest/v1/admin_activity_logs`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          admin_id: adminId,
          action: action,
          target_entity_type: entityType,
          details: details,
          timestamp: new Date().toISOString()
        })
      });
    };

    let result;

    switch (action) {
      case 'bulk_update_users':
        if (entityType !== 'users' || !operations) {
          throw new Error('Valid entity type (users) and operations are required');
        }

        const { userIds, updates } = operations;
        
        if (!Array.isArray(userIds) || userIds.length === 0) {
          throw new Error('User IDs array is required');
        }

        if (!updates || Object.keys(updates).length === 0) {
          throw new Error('Update data is required');
        }

        const userResults = [];
        const batchSize = 10; // Process in batches to avoid overwhelming the database

        for (let i = 0; i < userIds.length; i += batchSize) {
          const batch = userIds.slice(i, i + batchSize);
          const batchPromises = batch.map(async (userId) => {
            try {
              const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
                method: 'PATCH',
                headers: adminHeaders,
                body: JSON.stringify({
                  ...updates,
                  updated_at: new Date().toISOString()
                })
              });

              if (response.ok) {
                return { userId, success: true };
              } else {
                const error = await response.text();
                return { userId, success: false, error };
              }
            } catch (error) {
              return { userId, success: false, error: error.message };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          userResults.push(...batchResults);

          // Add small delay between batches
          if (i + batchSize < userIds.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        const successfulUpdates = userResults.filter(r => r.success).length;
        const failedUpdates = userResults.filter(r => !r.success).length;

        result = {
          totalProcessed: userIds.length,
          successful: successfulUpdates,
          failed: failedUpdates,
          results: userResults
        };

        // Log admin action
        await logAdminAction(user.id, 'bulk_update_users', 'users', {
          totalUsers: userIds.length,
          successful: successfulUpdates,
          failed: failedUpdates,
          updates
        });

        break;

      case 'bulk_delete_users':
        if (entityType !== 'users' || !operations) {
          throw new Error('Valid entity type (users) and operations are required');
        }

        const { userIds: deleteUserIds } = operations;
        
        if (!Array.isArray(deleteUserIds) || deleteUserIds.length === 0) {
          throw new Error('User IDs array is required');
        }

        const deleteResults = [];
        const deleteBatchSize = 5; // Smaller batch size for deletes

        for (let i = 0; i < deleteUserIds.length; i += deleteBatchSize) {
          const batch = deleteUserIds.slice(i, i + deleteBatchSize);
          const batchPromises = batch.map(async (userId) => {
            try {
              // Delete profile first
              const profileDeleteResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
                method: 'DELETE',
                headers: adminHeaders
              });

              if (!profileDeleteResponse.ok) {
                return { userId, success: false, error: 'Profile delete failed' };
              }

              // Delete auth user
              const authDeleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
                method: 'DELETE',
                headers: adminHeaders
              });

              if (!authDeleteResponse.ok) {
                return { userId, success: false, error: 'Auth user delete failed' };
              }

              return { userId, success: true };
            } catch (error) {
              return { userId, success: false, error: error.message };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          deleteResults.push(...batchResults);

          // Add delay between batches
          if (i + deleteBatchSize < deleteUserIds.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        const successfulDeletes = deleteResults.filter(r => r.success).length;
        const failedDeletes = deleteResults.filter(r => !r.success).length;

        result = {
          totalProcessed: deleteUserIds.length,
          successful: successfulDeletes,
          failed: failedDeletes,
          results: deleteResults
        };

        // Log admin action
        await logAdminAction(user.id, 'bulk_delete_users', 'users', {
          totalUsers: deleteUserIds.length,
          successful: successfulDeletes,
          failed: failedDeletes
        });

        break;

      case 'bulk_update_questions':
        if (entityType !== 'questions' || !operations) {
          throw new Error('Valid entity type (questions) and operations are required');
        }

        const { tableName, questionIds, updates: questionUpdates } = operations;
        
        if (!tableName) {
          throw new Error('Table name is required');
        }

        if (!Array.isArray(questionIds) || questionIds.length === 0) {
          throw new Error('Question IDs array is required');
        }

        if (!questionUpdates || Object.keys(questionUpdates).length === 0) {
          throw new Error('Update data is required');
        }

        const questionResults = [];
        const questionBatchSize = 15;

        for (let i = 0; i < questionIds.length; i += questionBatchSize) {
          const batch = questionIds.slice(i, i + questionBatchSize);
          const batchPromises = batch.map(async (questionId) => {
            try {
              const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?id=eq.${questionId}`, {
                method: 'PATCH',
                headers: adminHeaders,
                body: JSON.stringify({
                  ...questionUpdates,
                  updated_at: new Date().toISOString()
                })
              });

              if (response.ok) {
                return { questionId, success: true };
              } else {
                const error = await response.text();
                return { questionId, success: false, error };
              }
            } catch (error) {
              return { questionId, success: false, error: error.message };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          questionResults.push(...batchResults);

          // Add delay between batches
          if (i + questionBatchSize < questionIds.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        const successfulQuestionUpdates = questionResults.filter(r => r.success).length;
        const failedQuestionUpdates = questionResults.filter(r => !r.success).length;

        result = {
          tableName,
          totalProcessed: questionIds.length,
          successful: successfulQuestionUpdates,
          failed: failedQuestionUpdates,
          results: questionResults
        };

        // Log admin action
        await logAdminAction(user.id, 'bulk_update_questions', 'questions', {
          tableName,
          totalQuestions: questionIds.length,
          successful: successfulQuestionUpdates,
          failed: failedQuestionUpdates,
          updates: questionUpdates
        });

        break;

      case 'bulk_delete_questions':
        if (entityType !== 'questions' || !operations) {
          throw new Error('Valid entity type (questions) and operations are required');
        }

        const { tableName: deleteTableName, questionIds: deleteQuestionIds } = operations;
        
        if (!deleteTableName) {
          throw new Error('Table name is required');
        }

        if (!Array.isArray(deleteQuestionIds) || deleteQuestionIds.length === 0) {
          throw new Error('Question IDs array is required');
        }

        const deleteQuestionResults = [];
        const deleteQuestionBatchSize = 10;

        for (let i = 0; i < deleteQuestionIds.length; i += deleteQuestionBatchSize) {
          const batch = deleteQuestionIds.slice(i, i + deleteQuestionBatchSize);
          const batchPromises = batch.map(async (questionId) => {
            try {
              const response = await fetch(`${supabaseUrl}/rest/v1/${deleteTableName}?id=eq.${questionId}`, {
                method: 'DELETE',
                headers: adminHeaders
              });

              if (response.ok) {
                return { questionId, success: true };
              } else {
                const error = await response.text();
                return { questionId, success: false, error };
              }
            } catch (error) {
              return { questionId, success: false, error: error.message };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          deleteQuestionResults.push(...batchResults);

          // Add delay between batches
          if (i + deleteQuestionBatchSize < deleteQuestionIds.length) {
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        }

        const successfulQuestionDeletes = deleteQuestionResults.filter(r => r.success).length;
        const failedQuestionDeletes = deleteQuestionResults.filter(r => !r.success).length;

        result = {
          tableName: deleteTableName,
          totalProcessed: deleteQuestionIds.length,
          successful: successfulQuestionDeletes,
          failed: failedQuestionDeletes,
          results: deleteQuestionResults
        };

        // Log admin action
        await logAdminAction(user.id, 'bulk_delete_questions', 'questions', {
          tableName: deleteTableName,
          totalQuestions: deleteQuestionIds.length,
          successful: successfulQuestionDeletes,
          failed: failedQuestionDeletes
        });

        break;

      case 'bulk_import_questions':
        if (entityType !== 'questions' || !operations) {
          throw new Error('Valid entity type (questions) and operations are required');
        }

        const { tableName: importTableName, questionsData } = operations;
        
        if (!importTableName) {
          throw new Error('Table name is required');
        }

        if (!Array.isArray(questionsData) || questionsData.length === 0) {
          throw new Error('Questions data array is required');
        }

        const importResults = [];
        const importBatchSize = 20;

        for (let i = 0; i < questionsData.length; i += importBatchSize) {
          const batch = questionsData.slice(i, i + importBatchSize);
          const batchPromises = batch.map(async (questionData, index) => {
            try {
              const response = await fetch(`${supabaseUrl}/rest/v1/${importTableName}`, {
                method: 'POST',
                headers: adminHeaders,
                body: JSON.stringify({
                  ...questionData,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
              });

              if (response.ok) {
                const result = await response.json();
                return { index: i + index, success: true, questionId: result.id };
              } else {
                const error = await response.text();
                return { index: i + index, success: false, error };
              }
            } catch (error) {
              return { index: i + index, success: false, error: error.message };
            }
          });

          const batchResults = await Promise.all(batchPromises);
          importResults.push(...batchResults);

          // Add delay between batches
          if (i + importBatchSize < questionsData.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        const successfulImports = importResults.filter(r => r.success).length;
        const failedImports = importResults.filter(r => !r.success).length;

        result = {
          tableName: importTableName,
          totalProcessed: questionsData.length,
          successful: successfulImports,
          failed: failedImports,
          results: importResults
        };

        // Log admin action
        await logAdminAction(user.id, 'bulk_import_questions', 'questions', {
          tableName: importTableName,
          totalQuestions: questionsData.length,
          successful: successfulImports,
          failed: failedImports
        });

        break;

      case 'get_bulk_operation_preview':
        if (!entityType || !filters) {
          throw new Error('Entity type and filters are required for preview');
        }

        let previewQuery = `${supabaseUrl}/rest/v1/`;
        
        if (entityType === 'users') {
          previewQuery += 'profiles?select=id,email,full_name,role,status';
          
          if (filters.role && filters.role !== 'all') {
            previewQuery += `&role=eq.${filters.role}`;
          }
          if (filters.status && filters.status !== 'all') {
            previewQuery += `&status=eq.${filters.status}`;
          }
        } else if (entityType === 'questions') {
          previewQuery += `${filters.tableName}?select=id,question_text,question_type`;
          
          if (filters.category) {
            previewQuery += `&category=eq.${filters.category}`;
          }
          if (filters.question_type) {
            previewQuery += `&question_type=eq.${filters.question_type}`;
          }
        } else {
          throw new Error('Unsupported entity type for preview');
        }

        // Limit preview to first 100 items
        previewQuery += '&limit=100';

        const previewResponse = await fetch(previewQuery, {
          headers: adminHeaders
        });

        if (!previewResponse.ok) {
          throw new Error('Failed to get operation preview');
        }

        result = await previewResponse.json();

        // Log admin action
        await logAdminAction(user.id, 'get_bulk_operation_preview', entityType, {
          filters,
          previewCount: result.length
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
        code: 'INTERNAL_ERROR',
        message: error.message 
      } 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});