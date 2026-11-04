import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { normalizeLessonQuestion } from '../src/lib/quiz-progress';

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

test('shipped option decoder agrees with the shared source contract', () => {
  const shipped = readFileSync('public/assets/index-Wviw5V5-.js', 'utf8');
  const start = shipped.indexOf('function normalizeLessonQuestion(');
  const end = shipped.indexOf('\nimport { j as jsxRuntimeExports', start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const decode = runInNewContext(shipped.slice(start, end) + '\nnormalizeLessonQuestion');
  for (const options of [['Alpha', 'Beta'], JSON.stringify([{ text: 'Alpha', is_correct: false }, { text: 'Beta', is_correct: true }]), null]) {
    const question = { question_type: 'multiple_choice', correct_answer: 'B', options };
    expect(JSON.parse(JSON.stringify(decode(question)))).toEqual(normalizeLessonQuestion(question));
  }
  expect(readFileSync('static-dist/assets/index-Wviw5V5-.js', 'utf8')).toBe(shipped);
});

test('one service-origin selector routes local and external admin clients without dropping request bodies', async () => {
  for (const hostname of ['localhost', 'scheduquiz.lovable.app', 'scheduquiz.vercel.app']) {
    const origin = `https://${hostname}`;
    let received: { url: string; options: RequestInit } | undefined;
    const window = { fetch: async (url: string, options: RequestInit) => { received = { url, options }; return Response.json({ data: {} }); } };
    runInNewContext(readFileSync('tools/admin-transport.js', 'utf8'), { window, location: { hostname, origin }, Request, URL });
    await window.fetch(new Request('https://example.com/functions/v1/admin-manage-users', { method: 'POST', headers: { Authorization: 'Bearer test-only' }, body: '{"action":"update_user"}' }) as unknown as string, {});
    expect(received?.url).toBe(`${hostname === 'scheduquiz.vercel.app' ? 'https://scheduquiz.lovable.app' : origin}/api/public/admin/users`);
    expect(received?.options.body).toBe('{"action":"update_user"}');
    expect(new Headers(received?.options.headers).get('Authorization')).toBe('Bearer test-only');
  }
});