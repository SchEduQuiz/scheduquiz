import { describe, expect, it } from 'bun:test';
import { canResume, sanitizeProgress, normalizeLessonQuestion } from '../src/lib/quiz-progress';
import { loadCompletedQuizScores } from '../src/lib/quiz-progress';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

describe('completed quiz analytics', () => {
  const shipped = readFileSync('public/assets/index-Wviw5V5-.js', 'utf8');
  const inline = runInNewContext(shipped.slice(0, shipped.indexOf('\n(function')) + '\nloadCompletedQuizScores');
  for (const [name, load] of [['shared', loadCompletedQuizScores], ['shipped', inline]] as const) {
    it(`${name} reads completed owner attempts, preserves category, timestamp and pagination`, async () => {
      const calls: unknown[][] = [];
      const client = { from(table: string) {
        calls.push(['from', table]);
        const query = {
          select(columns: string) { calls.push(['select', columns]); return query; },
          eq(key: string, value: string) { calls.push(['eq', key, value]); return query; },
          order(key: string, value: unknown) { calls.push(['order', key, value]); return query; },
          range(start: number, end: number) { calls.push(['range', start, end]); return query; },
          then(resolve: (value: unknown) => unknown) {
            const page = calls.filter(c => c[0] === 'range').length;
            return Promise.resolve(resolve({ data: page === 1 ? Array.from({ length: 500 }, (_, i) => ({ id: i, percentage: 80 })) : [{ id: 500, percentage: 100 }], error: null }));
          },
        };
        return query;
      } };
      const scores = await load(client, 'student-id', 'science');
      expect(scores.length).toBe(501);
      expect(scores[500].percentage).toBe(100);
      expect(calls).toContainEqual(['from', 'challenge_attempts']);
      expect(calls).toContainEqual(['eq', 'user_id', 'student-id']);
      expect(calls).toContainEqual(['eq', 'status', 'completed']);
      expect(calls).toContainEqual(['eq', 'category', 'science']);
      expect(calls).toContainEqual(['range', 500, 999]);
      expect(String(calls.find(c => c[0] === 'select')?.[1])).toContain('created_at:submitted_at');
    });
    it(`${name} rejects failed reads rather than reporting no attempts`, async () => {
      const query = { select: () => query, eq: () => query, order: () => query, range: () => query,
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: null, error: { message: 'denied' } })) };
      await expect(load({ from: () => query }, 'student-id')).rejects.toThrow('Unable to load quiz analytics');
      await expect(load({ from: () => { throw new Error('must not query'); } }, '')).rejects.toThrow('Sign in');
    });
  }
});

describe('quiz progress', () => {
  it('keeps only answers for questions in the attempt', () => {
    const p = sanitizeProgress({ answers: { '1': 'a', '2': 'B', '99': 'C', '3': 'Z' } }, [1, 2, 3]);
    expect(p.answers).toEqual({ '1': 'A', '2': 'B' });
  });
  it('clamps the current question to the attempt length', () => {
    expect(sanitizeProgress({ current_question: 40 }, [1, 2, 3]).current_question).toBe(2);
    expect(sanitizeProgress({ current_question: -5 }, [1, 2, 3]).current_question).toBe(0);
  });
  it('drops hints for foreign questions', () => {
    expect(sanitizeProgress({ hints: [1, 7, 1] }, [1, 2]).hints).toEqual([1]);
  });
  it('resumes attempts started within 24 hours only', () => {
    const now = Date.parse('2026-10-22T12:00:00Z');
    expect(canResume('2026-10-22T00:00:01Z', now)).toBe(true);
    expect(canResume('2026-10-21T11:59:59Z', now)).toBe(false);
  });
});

describe('lesson question contract', () => {
  const question = { question_type: 'multiple_choice', correct_answer: 'Beta', options: ['Alpha', 'Beta', 'Gamma', 'Delta'] };
  it('normalizes native string options and preserves the correct answer through editing', () => {
    const result = normalizeLessonQuestion(question);
    expect(result.correct_answer).toBe('B');
    expect(result.options.map(o => o.is_correct)).toEqual([false, true, false, false]);
    expect(normalizeLessonQuestion(result)).toEqual(result);
  });
  it('decodes legacy JSON strings and object options without losing text', () => {
    const result = normalizeLessonQuestion({ ...question, correct_answer: 'B', options: JSON.stringify([{ text: 'Alpha', is_correct: false }, { text: 'Beta', is_correct: true }]) });
    expect(result.options).toEqual([{ text: 'Alpha', is_correct: false }, { text: 'Beta', is_correct: true }]);
    expect(result.correct_answer).toBe('B');
  });
  it('normalizes true/false and accepts optionless short answers', () => {
    expect(normalizeLessonQuestion({ question_type: 'true_false', correct_answer: 'True', options: ['True', 'False'] }).correct_answer).toBe('true');
    expect(normalizeLessonQuestion({ question_type: 'short_answer', correct_answer: 'Paris', options: null }).options).toEqual([]);
  });
  it('rejects corrupt option values rather than crashing during rendering', () => {
    for (const options of ['not JSON', { A: 'Alpha' }, [null], [42]]) expect(() => normalizeLessonQuestion({ ...question, options })).toThrow();
  });
  it('does not resume future-dated attempts', () => {
    expect(canResume('2026-11-01T12:00:01Z', Date.parse('2026-11-01T12:00:00Z'))).toBe(false);
  });
});
