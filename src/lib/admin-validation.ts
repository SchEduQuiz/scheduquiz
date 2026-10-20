import { z } from 'zod';

export const roleSchema = z.enum(['student', 'teacher', 'admin']);
export const statusSchema = z.enum(['active', 'inactive', 'suspended']);
export const userFields = z.object({
  email: z.string().email().max(254),
  full_name: z.string().trim().min(1).max(200),
  role: roleSchema,
  status: statusSchema,
});

export function protectOwnAccount(caller: string, target: string, change: { role?: string; status?: string; deleting?: boolean }) {
  if (caller === target && (change.deleting || (change.role && change.role !== 'admin') || (change.status && change.status !== 'active'))) {
    throw new Error('You cannot remove your own administrator access');
  }
}