import { corsHeaders } from '../../../_shared/cors.ts';

// Admin User Management Edge Function
// Handles comprehensive user CRUD operations with admin security

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
    const { action, userId, updates, filters } = requestData;

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
    const logAdminAction = async (adminId: string, action: string, targetUser: string, details: any) => {
      await fetch(`${supabaseUrl}/rest/v1/admin_activity_logs`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          admin_id: adminId,
          action: action,
          target_user_id: targetUser,
          details: details,
          timestamp: new Date().toISOString()
        })
      });
    };

    let result;

    switch (action) {
      case 'get_users':
        // Get users with filtering and pagination
        let query = `${supabaseUrl}/rest/v1/profiles?select=*`;
        
        // Apply filters
        if (filters) {
          if (filters.role && filters.role !== 'all') {
            query += `&role=eq.${filters.role}`;
          }
          if (filters.status && filters.status !== 'all') {
            query += `&status=eq.${filters.status}`;
          }
          if (filters.search) {
            query += `&or=(full_name.ilike.%25${filters.search}%25,email.ilike.%25${filters.search}%25)`;
          }
        }

        // Apply ordering and pagination
        query += `&order=created_at.desc&limit=${filters?.limit || 50}&offset=${filters?.offset || 0}`;

        const usersResponse = await fetch(query, {
          headers: adminHeaders
        });

        result = await usersResponse.json();
        break;

      case 'create_user':
        // Create new user
        if (!updates || !updates.email || !updates.full_name || !updates.role) {
          throw new Error('Missing required fields: email, full_name, role');
        }

        // Create user in auth.users first
        const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({
            email: updates.email,
            password: updates.password || 'TempPassword123!',
            email_confirm: true,
            user_metadata: {
              full_name: updates.full_name,
              role: updates.role
            }
          })
        });

        if (!createUserResponse.ok) {
          const error = await createUserResponse.json();
          throw new Error(error.message || 'Failed to create user');
        }

        const newUser = await createUserResponse.json();

        // Create profile
        const profileCreateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({
            id: newUser.id,
            email: updates.email,
            full_name: updates.full_name,
            role: updates.role,
            status: updates.status || 'active',
            avatar_url: updates.avatar_url || null
          })
        });

        if (!profileCreateResponse.ok) {
          // Clean up auth user if profile creation fails
          await fetch(`${supabaseUrl}/auth/v1/admin/users/${newUser.id}`, {
            method: 'DELETE',
            headers: adminHeaders
          });
          throw new Error('Failed to create user profile');
        }

        result = await profileCreateResponse.json();

        // Log admin action
        await logAdminAction(user.id, 'create_user', newUser.id, { 
          email: updates.email, 
          role: updates.role 
        });

        break;

      case 'update_user':
        if (!userId || !updates) {
          throw new Error('User ID and updates are required');
        }

        // Update user profile
        const updateProfileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
          method: 'PATCH',
          headers: adminHeaders,
          body: JSON.stringify({
            ...updates,
            updated_at: new Date().toISOString()
          })
        });

        if (!updateProfileResponse.ok) {
          throw new Error('Failed to update user profile');
        }

        // Update auth user if needed
        if (updates.email || updates.password || updates.full_name) {
          const authUpdates: any = {};
          if (updates.email) authUpdates.email = updates.email;
          if (updates.password) authUpdates.password = updates.password;
          if (updates.full_name) authUpdates.user_metadata = { full_name: updates.full_name };

          await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
            method: 'PUT',
            headers: adminHeaders,
            body: JSON.stringify(authUpdates)
          });
        }

        result = await updateProfileResponse.json();

        // Log admin action
        await logAdminAction(user.id, 'update_user', userId, { updates });

        break;

      case 'delete_user':
        if (!userId) {
          throw new Error('User ID is required');
        }

        // Delete profile first
        await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
          method: 'DELETE',
          headers: adminHeaders
        });

        // Delete auth user
        const deleteAuthResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: adminHeaders
        });

        if (!deleteAuthResponse.ok) {
          throw new Error('Failed to delete user');
        }

        result = { success: true, message: 'User deleted successfully' };

        // Log admin action
        await logAdminAction(user.id, 'delete_user', userId, {});

        break;

      case 'bulk_update_users':
        if (!updates || !Array.isArray(updates.userIds) || !updates.updates) {
          throw new Error('User IDs and updates are required for bulk operations');
        }

        const bulkResults = [];
        for (const uid of updates.userIds) {
          try {
            const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${uid}`, {
              method: 'PATCH',
              headers: adminHeaders,
              body: JSON.stringify({
                ...updates.updates,
                updated_at: new Date().toISOString()
              })
            });

            if (response.ok) {
              bulkResults.push({ userId: uid, success: true });
            } else {
              bulkResults.push({ userId: uid, success: false, error: 'Update failed' });
            }
          } catch (error) {
            bulkResults.push({ userId: uid, success: false, error: error.message });
          }
        }

        result = { results: bulkResults };

        // Log admin action
        await logAdminAction(user.id, 'bulk_update_users', 'multiple', {
          userIds: updates.userIds,
          updates: updates.updates
        });

        break;

      case 'change_user_status':
        if (!userId || !updates.status) {
          throw new Error('User ID and status are required');
        }

        const statusResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
          method: 'PATCH',
          headers: adminHeaders,
          body: JSON.stringify({
            status: updates.status,
            updated_at: new Date().toISOString()
          })
        });

        if (!statusResponse.ok) {
          throw new Error('Failed to update user status');
        }

        result = await statusResponse.json();

        // Log admin action
        await logAdminAction(user.id, 'change_user_status', userId, { 
          newStatus: updates.status 
        });

        break;

      case 'get_user_stats':
        // Get comprehensive user statistics
        const statsQueries = [
          // Total users by role
          fetch(`${supabaseUrl}/rest/v1/profiles?select=role&order=role`, {
            headers: adminHeaders
          }),
          // Users by status
          fetch(`${supabaseUrl}/rest/v1/profiles?select=status&order=status`, {
            headers: adminHeaders
          }),
          // Recent activity
          fetch(`${supabaseUrl}/rest/v1/profiles?select=created_at&gte=${new Date(Date.now() - 30*24*60*60*1000).toISOString()}&order=created_at`, {
            headers: adminHeaders
          })
        ];

        const [roleData, statusData, recentData] = await Promise.all(statsQueries);
        const roles = await roleData.json();
        const statuses = await statusData.json();
        const recentUsers = await recentData.json();

        // Process statistics
        const roleStats = roles.reduce((acc: any, user: any) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {});

        const statusStats = statuses.reduce((acc: any, user: any) => {
          acc[user.status] = (acc[user.status] || 0) + 1;
          return acc;
        }, {});

        result = {
          totalUsers: roles.length,
          roleBreakdown: roleStats,
          statusBreakdown: statusStats,
          recentSignups: recentUsers.length
        };

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