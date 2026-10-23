// Saved progress for an unfinished challenge quiz. Only answers to questions in
// the attempt are kept, so a client cannot plant data for other questions.
export const RESUME_WINDOW_MS = 24 * 60 * 60 * 1000;

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
  return Number.isFinite(t) && now - t < RESUME_WINDOW_MS;
}
