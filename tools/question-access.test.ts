import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('question operations reject tables outside the four question tables', async () => {
  let requests = 0;
  const window = { fetch: async () => { requests++; return Response.json([]); } };
  runInNewContext(readFileSync('tools/edge-shim.js', 'utf8'), { window, Request, Response, Headers });
  const response = await window.fetch(new Request('https://example.com/functions/v1/admin-question-management', {
    method: 'POST', body: JSON.stringify({ action: 'delete_question', tableName: 'profiles', questionId: '123' }),
  }));
  expect(response.status).toBe(400);
  expect(requests).toBe(0);
});

test('failed question reads return errors rather than empty successful lists', async () => {
  const window = { fetch: async () => Response.json({ message: 'Permission denied' }, { status: 403 }) };
  runInNewContext(readFileSync('tools/edge-shim.js', 'utf8'), { window, Request, Response, Headers });
  const response = await window.fetch(new Request('https://example.com/functions/v1/admin-question-management', {
    method: 'POST', body: JSON.stringify({ action: 'get_questions', tableName: 'questions' }),
  }));
  expect(response.status).toBe(500);
  expect((await response.json()).error.message).toBe('Permission denied');
});