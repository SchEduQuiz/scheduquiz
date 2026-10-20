import { expect, test } from 'bun:test';
import { protectOwnAccount, roleSchema, statusSchema } from './admin-validation';

test('administrators cannot delete their own account', () => {
  expect(() => protectOwnAccount('a', 'a', { deleting: true })).toThrow();
});
test('administrators cannot demote their own account', () => {
  expect(() => protectOwnAccount('a', 'a', { role: 'student' })).toThrow();
});
test('administrators cannot suspend their own account', () => {
  expect(() => protectOwnAccount('a', 'a', { status: 'suspended' })).toThrow();
});
test('only supported roles and statuses are accepted', () => {
  expect(roleSchema.safeParse('superadmin').success).toBe(false);
  expect(statusSchema.safeParse('deleted').success).toBe(false);
});