import { describe, expect, it } from 'bun:test';
import { canResume, sanitizeProgress } from '../src/lib/quiz-progress';

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
