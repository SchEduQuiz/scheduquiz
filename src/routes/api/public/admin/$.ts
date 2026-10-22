import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { protectOwnAccount, roleSchema, statusSchema, userFields } from '@/lib/admin-validation';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
const idSchema = z.string().uuid();
const bodySchema = z.object({
  action: z.string().max(60).optional(),
  userId: idSchema.optional(),
  userIds: z.array(idSchema).min(1).max(100).optional(),
  userData: userFields.extend({ password: z.string().min(6).max(128) }).optional(),
  updates: userFields.partial().optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'pending', 'approved', 'rejected']).optional(),
  operation: z.object({ type: z.enum(['update_role', 'update_status', 'delete']), data: z.object({ role: roleSchema.optional(), status: statusSchema.optional() }).optional() }).optional(),
  requestId: idSchema.optional(),
  adminNotes: z.string().max(2000).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

async function handle(request: Request) {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY'];
  if (!url || !key) return json({ error: { message: 'Account service is unavailable' } }, 503);
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: { message: 'Please sign in' } }, 401);
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: auth, error: authError } = await client.auth.getUser(token);
  if (authError || !auth.user) return json({ error: { message: 'Please sign in again' } }, 401);
  const { data: admin, error: roleError } = await client.rpc('has_role', { _user_id: auth.user.id, _role: 'admin' });
  if (roleError || !admin) return json({ error: { message: 'Administrator access required' } }, 403);
  const { data: profile } = await client.from('profiles').select('status').eq('id', auth.user.id).single();
  if (profile?.status !== 'active') return json({ error: { message: 'Account is not active' } }, 403);
  // Read-only calls (list/stats) are sent as POST with no body by the client SDK.
  const raw = request.method === 'GET' ? '' : await request.text();
  let payload: unknown = {};
  if (raw.trim()) { try { payload = JSON.parse(raw); } catch { payload = null; } }
  const parsed = bodySchema.safeParse(payload ?? null);
  if (!parsed.success) return json({ error: { message: 'Invalid account request' } }, 400);
  const body = parsed.data;
  const endpoint = new URL(request.url).pathname.split('/api/public/admin/')[1];
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const caller = auth.user.id;
  const audit = async (type: string, target: string) => {
    const { error } = await db.from('user_activity_logs').insert({ user_id: caller, activity_type: type, description: `${type}: ${target}`, metadata: { target_id: target } });
    if (error) throw new Error('Account changed, but its activity log could not be saved');
  };
  const check = (error: { message: string } | null) => { if (error) throw new Error('The account change could not be saved'); };
  const update = async (id: string, fields: { email?: string | undefined; full_name?: string | undefined; role?: string | undefined; status?: string | undefined }) => {
    protectOwnAccount(caller, id, fields);
    const { data: old, error } = await db.from('profiles').select('id,role').eq('id', id).single();
    check(error);
    if (!old) throw new Error('User not found');
    if (fields.email || fields.status) {
      const result = await db.auth.admin.updateUserById(id, {
        ...(fields.email ? { email: fields.email, email_confirm: true } : {}),
        ...(fields.status ? { ban_duration: fields.status === 'active' ? 'none' : '876000h' } : {}),
      });
      check(result.error);
    }
    if (fields.role && fields.role !== old.role) {
      check((await db.from('user_roles').upsert({ user_id: id, role: fields.role }, { onConflict: 'user_id,role' })).error);
      const removed = await db.from('user_roles').delete().eq('user_id', id).neq('role', fields.role);
      check(removed.error);
    }
    check((await db.from('profiles').update({
      ...(fields.email !== undefined ? { email: fields.email } : {}),
      ...(fields.full_name !== undefined ? { full_name: fields.full_name } : {}),
      ...(fields.role !== undefined ? { role: fields.role } : {}),
      ...(fields.status !== undefined ? { status: fields.status } : {}),
      updated_at: new Date().toISOString(),
    }).eq('id', id)).error);
    await audit('user_updated', id);
  };
  const remove = async (id: string) => {
    protectOwnAccount(caller, id, { deleting: true });
    check((await db.auth.admin.deleteUser(id)).error);
    await audit('user_deleted', id);
  };
  try {
    if (endpoint === 'users') {
      switch (body.action) {
        case 'create_user': {
          if (!body.userData) throw new Error('User details required');
          const u = body.userData;
          const created = await db.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true, user_metadata: { full_name: u.full_name } });
          if (created.error || !created.data.user) return json({ error: { message: 'User could not be created. Check the email and password.' } }, 400);
          const id = created.data.user.id;
          try { await update(id, { email: u.email, full_name: u.full_name, role: u.role, status: u.status }); }
          catch (e) { await db.auth.admin.deleteUser(id); throw e; }
          return json({ data: { user: { id, email: u.email } } });
        }
        case 'update_user':
          if (!body.userId || !body.updates) throw new Error('User details required');
          await update(body.userId, body.updates); break;
        case 'update_status':
          if (!body.userId || !body.status) throw new Error('Status required');
          await update(body.userId, { status: statusSchema.parse(body.status) }); break;
        case 'delete_user':
          if (!body.userId) throw new Error('User required');
          await remove(body.userId); break;
        case 'bulk_update': {
          if (!body.userIds || !body.operation) throw new Error('Select users and an operation');
          const op = body.operation;
          const fields = op.type === 'update_role' ? { role: roleSchema.parse(op.data?.role) } : op.type === 'update_status' ? { status: statusSchema.parse(op.data?.status) } : {};
          for (const id of body.userIds) protectOwnAccount(caller, id, { ...fields, deleting: op.type === 'delete' });
          for (const id of body.userIds) { if (op.type === 'delete') await remove(id); else await update(id, fields); }
          break;
        }
        default: return json({ error: { message: 'Unsupported account operation' } }, 400);
      }
      return json({ data: { success: true } });
    }
    if (endpoint === 'resets/list') {
      const { data, error } = await db.from('password_reset_requests').select('id,user_email,user_id,reason,status,created_at,admin_notes').eq('status', 'pending').order('created_at', { ascending: false }).limit(body.limit ?? 50);
      check(error); return json({ data });
    }
    if (endpoint === 'resets/stats') {
      const statuses = ['pending', 'approved', 'rejected'];
      const counts = await Promise.all(statuses.map(async (status) => {
        const { count, error } = await db.from('password_reset_requests').select('id', { count: 'exact', head: true }).eq('status', status); check(error); return count ?? 0;
      }));
      return json({ data: { total_requests: counts.reduce((a, b) => a + b, 0), status_breakdown: Object.fromEntries(statuses.map((s, i) => [s, counts[i]])) } });
    }
    if (endpoint === 'resets/approve' || endpoint === 'resets/reject') {
      if (!body.requestId) throw new Error('Request required');
      const { data: row, error } = await db.from('password_reset_requests').select('id,user_email,user_id,status').eq('id', body.requestId).single(); check(error);
      if (!row || row.status !== 'pending') throw new Error('Reset request is no longer pending');
      const approved = endpoint.endsWith('/approve');
      if (approved) {
        // Send the provider's one-use recovery link instead of storing passwords.
        const result = await db.auth.resetPasswordForEmail(row.user_email, { redirectTo: 'https://scheduquiz.lovable.app/reset-password' });
        if (result.error) throw new Error('Recovery email could not be sent; request remains pending');
      }
      check((await db.from('password_reset_requests').update({ status: approved ? 'approved' : 'rejected', admin_id: caller, admin_notes: body.adminNotes ?? null, ...(approved ? { approved_at: new Date().toISOString() } : { rejected_at: new Date().toISOString() }), temp_password: null, updated_at: new Date().toISOString() }).eq('id', row.id).eq('status', 'pending')).error);
      await audit(approved ? 'password_reset_approved' : 'password_reset_rejected', row.id);
      return json({ data: { success: true }, message: approved ? 'Recovery email sent' : 'Request rejected' });
    }
    return json({ error: { message: 'Unknown account endpoint' } }, 404);
  } catch (e) {
    return json({ error: { message: e instanceof Error ? e.message : 'Account operation failed' } }, 400);
  }
}

export const Route = createFileRoute('/api/public/admin/$')({
  server: { handlers: { OPTIONS: () => new Response(null, { status: 204, headers }), GET: ({ request }) => handle(request), POST: ({ request }) => handle(request) } },
});