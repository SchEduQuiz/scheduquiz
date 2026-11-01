import { describe, expect, it } from 'bun:test';
import { canResume, sanitizeProgress, normalizeLessonQuestion } from '../src/lib/quiz-progress';

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
