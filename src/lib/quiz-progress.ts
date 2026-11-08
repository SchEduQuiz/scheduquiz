import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type QuizAnalyticsScore = Pick<Database['public']['Tables']['challenge_attempts']['Row'],
  'id' | 'quiz_id' | 'category' | 'score' | 'max_score' | 'percentage' | 'time_taken' |
  'correct_answers' | 'total_questions' | 'hints_used'> & { created_at: string | null };

// Saved progress for an unfinished challenge quiz. Only answers to questions in
// the attempt are kept, so a client cannot plant data for other questions.
export const RESUME_WINDOW_MS = 24 * 60 * 60 * 1000;

// Analytics reads the same server-owned records that challenge submission saves.
// Keep the legacy display timestamp name without duplicating score records.
export async function loadCompletedQuizScores(client: SupabaseClient<Database>, userId: string, category = 'all') {
  if (!userId) throw new Error('Sign in to view your quiz analytics');
  const scores: QuizAnalyticsScore[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    let query = client.from('challenge_attempts')
      .select('id, quiz_id, category, score, max_score, percentage, time_taken, correct_answers, total_questions, hints_used, created_at:submitted_at')
      .eq('user_id', userId).eq('status', 'completed')
      .order('submitted_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (category !== 'all') query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw new Error('Unable to load quiz analytics. Please try again.');
    scores.push(...(data ?? []));
    if (!data || data.length < pageSize) return scores;
  }
}

export type QuizProgress = {
  answers: Record<string, string>;
  current_question: number;
  hints: number[];
  elapsed_seconds: number;
};

const ANSWERS = new Set(['A', 'B', 'C', 'D', 'TIMEOUT']);

export function sanitizeProgress(input: unknown, questionIds: number[]): QuizProgress {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const allowed = new Set(questionIds.map(Number));
  const answers: Record<string, string> = {};
  const rawAnswers = (src['answers'] && typeof src['answers'] === 'object' ? src['answers'] : {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(rawAnswers)) {
    if (allowed.has(Number(k)) && typeof v === 'string' && ANSWERS.has(v.toUpperCase())) answers[String(Number(k))] = v.toUpperCase();
  }
  const max = Math.max(0, questionIds.length - 1);
  const cq = Math.trunc(Number(src['current_question']));
  const hints = (Array.isArray(src['hints']) ? src['hints'] : []).map(Number).filter((n) => allowed.has(n));
  const elapsed = Math.trunc(Number(src['elapsed_seconds']));
  return {
    answers,
    current_question: Number.isFinite(cq) ? Math.min(Math.max(cq, 0), max) : 0,
    hints: [...new Set(hints)],
    elapsed_seconds: Number.isFinite(elapsed) ? Math.min(Math.max(elapsed, 0), 86400) : 0,
  };
}

export function canResume(startedAt: string | null | undefined, now = Date.now()): boolean {
  if (!startedAt) return false;
  const t = Date.parse(startedAt);
  return Number.isFinite(t) && now >= t && now - t < RESUME_WINDOW_MS;
}

// One compatibility boundary for native JSON and older JSON-encoded options.
// The editor uses letters for multiple choice and lowercase true/false.
export function normalizeLessonQuestion<T extends { options?: unknown; correct_answer: string; question_type: string }>(question: T): Omit<T, 'options' | 'correct_answer'> & { options: { text: string; is_correct: boolean }[]; correct_answer: string } {
  let raw = question.options;
  for (let depth = 0; depth < 2 && typeof raw === 'string'; depth += 1) {
    try { raw = JSON.parse(raw); } catch { throw new Error('Question options contain invalid JSON'); }
  }
  if (raw != null && !Array.isArray(raw)) throw new Error('Question options must be a list');
  const options = (Array.isArray(raw) ? raw : []).map((value: unknown) => {
    if (typeof value === 'string') return { text: value, is_correct: false };
    if (!value || typeof value !== 'object' || !('text' in value) || typeof value.text !== 'string') {
      throw new Error('Question option text is invalid');
    }
    return { text: value.text, is_correct: 'is_correct' in value && value.is_correct === true };
  });
  let answer = question.correct_answer;
  if (question.question_type === 'multiple_choice') {
    const flagged = options.findIndex((option) => option.is_correct);
    const exact = options.findIndex((option) => option.text === answer);
    const letter = /^[A-D]$/i.test(answer) ? answer.toUpperCase().charCodeAt(0) - 65 : -1;
    const index = flagged >= 0 ? flagged : exact >= 0 ? exact : letter;
    if (index >= 0 && index < options.length) {
      answer = String.fromCharCode(65 + index);
      options.forEach((option, i) => { option.is_correct = i === index; });
    }
  } else if (question.question_type === 'true_false') {
    answer = answer.toLowerCase();
    options.forEach((option) => { option.is_correct = option.text.toLowerCase() === answer; });
  }
  return { ...question, options, correct_answer: answer };
}
