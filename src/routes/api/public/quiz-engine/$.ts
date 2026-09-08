// Real server-side quiz engine (replaces the old Edge Function shim).
//
//   GET  /api/public/quiz-engine/start?quiz_id=<n>&questions=<n>
//   GET  /api/public/quiz-engine/questions/<questionId>/hint
//   POST /api/public/quiz-engine/<quizId>/submit  { answers, time_taken, hints_used_list }
//
// Questions are read from public.challenge_questions and every attempt, answer
// and score is persisted in public.challenge_attempts / challenge_responses.
// Correct answers and scores are computed server-side and never trusted from
// the client. Callers are authenticated with their Supabase bearer token.
import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';

const cors: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-store',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

const fail = (message: string, status = 400) => json({ error: { message } }, status);

const HINT_PENALTY = 5;

// The challenge_* tables are newer than the generated types, so query loosely.
/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyClient = { from: (table: string) => any };

async function authenticate(request: Request) {
  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return { error: fail('Authentication required', 401) };

  const supabaseUrl = process.env['SUPABASE_URL']!;
  const publishableKey =
    process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY']!;

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) return { error: fail('Invalid or expired session', 401) };

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return { userId: data.user.id, db: supabaseAdmin as unknown as AnyClient };
}

async function handleStart(url: URL, userId: string, db: AnyClient) {
  const quizId = Number(url.searchParams.get('quiz_id') ?? '6');
  const wanted = Math.min(Math.max(Number(url.searchParams.get('questions') ?? '15') || 15, 1), 50);
  if (!Number.isFinite(quizId)) return fail('Invalid quiz_id');

  const { data: quiz, error: quizError } = await db
    .from('challenge_quizzes')
    .select('id, title, category')
    .eq('id', quizId)
    .eq('is_active', true)
    .maybeSingle();
  if (quizError) return fail(quizError.message, 500);
  if (!quiz) return fail('Quiz not found', 404);

  const { data: pool, error: poolError } = await db
    .from('challenge_questions')
    .select(
      'id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, hint, points, time_limit, difficulty',
    )
    .eq('quiz_id', quizId)
    .eq('is_active', true);
  if (poolError) return fail(poolError.message, 500);
  if (!pool || pool.length === 0) return fail('No questions available for this quiz', 404);

  const shuffled = [...(pool as Array<Record<string, unknown>>)];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = a;
  }
  const selected = shuffled.slice(0, Math.min(wanted, shuffled.length));

  await db
    .from('challenge_attempts')
    .update({ status: 'abandoned' })
    .eq('user_id', userId)
    .eq('quiz_id', quizId)
    .eq('status', 'in_progress');

  const { data: attempt, error: attemptError } = await db
    .from('challenge_attempts')
    .insert({
      session_id: crypto.randomUUID(),
      user_id: userId,
      quiz_id: quizId,
      category: quiz['category'] as string,
      question_ids: selected.map((q) => q['id'] as number),
      total_questions: selected.length,
      max_score: selected.reduce((sum, q) => sum + ((q['points'] as number) ?? 10), 0),
      status: 'in_progress',
    })
    .select('id, session_id')
    .single();
  if (attemptError) return fail(attemptError.message, 500);

  return json({
    data: {
      success: true,
      data: {
        session_id: attempt['session_id'],
        attempt_id: attempt['id'],
        quiz: { id: quiz['id'], title: quiz['title'], category: quiz['category'] },
        total_questions: selected.length,
        questions: selected,
      },
    },
  });
}

async function handleHint(questionId: number, userId: string, db: AnyClient) {
  if (!Number.isFinite(questionId)) return fail('Invalid question id');

  const { data: question, error } = await db
    .from('challenge_questions')
    .select('id, hint, quiz_id')
    .eq('id', questionId)
    .maybeSingle();
  if (error) return fail(error.message, 500);
  if (!question) return fail('Question not found', 404);

  const { data: attempt } = await db
    .from('challenge_attempts')
    .select('id')
    .eq('user_id', userId)
    .eq('quiz_id', question['quiz_id'] as number)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (attempt) {
    await db
      .from('challenge_hint_uses')
      .upsert(
        { attempt_id: attempt['id'] as string, question_id: questionId, user_id: userId },
        { onConflict: 'attempt_id,question_id', ignoreDuplicates: true },
      );
  }

  return json({
    data: { hint: (question['hint'] as string) ?? 'No hint is available for this question.' },
  });
}

async function handleSubmit(quizId: number, request: Request, userId: string, db: AnyClient) {
  if (!Number.isFinite(quizId)) return fail('Invalid quiz id');

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const answers = (Array.isArray(body['answers']) ? body['answers'] : []) as Array<{
    question_id: number;
    user_answer: string;
    response_time?: number;
  }>;
  const timeTaken = Number(body['time_taken'] ?? 0);
  const hintsList = (Array.isArray(body['hints_used_list']) ? body['hints_used_list'] : [])
    .map(Number)
    .filter((n) => Number.isFinite(n));

  const { data: attempt, error: attemptError } = await db
    .from('challenge_attempts')
    .select('id, question_ids')
    .eq('user_id', userId)
    .eq('quiz_id', quizId)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (attemptError) return fail(attemptError.message, 500);
  if (!attempt) return fail('No active quiz attempt found. Please start the quiz again.', 409);

  const allowedIds = ((attempt['question_ids'] as number[]) ?? []).map(Number);
  const { data: questions, error: questionsError } = await db
    .from('challenge_questions')
    .select('id, question_text, correct_answer, explanation, points, time_limit')
    .in('id', allowedIds.length ? allowedIds : [-1]);
  if (questionsError) return fail(questionsError.message, 500);

  const byId = new Map(
    (questions ?? []).map((q) => [Number((q as Record<string, unknown>)['id']), q as Record<string, unknown>]),
  );
  const answerById = new Map(answers.map((a) => [Number(a.question_id), a]));

  let score = 0;
  let timeBonusTotal = 0;
  let correctCount = 0;
  const results: Array<Record<string, unknown>> = [];
  const responseRows: Array<Record<string, unknown>> = [];

  for (const questionId of allowedIds) {
    const question = byId.get(questionId);
    if (!question) continue;
    const submitted = answerById.get(questionId);
    const userAnswer = submitted?.user_answer ?? 'TIMEOUT';
    const responseTime = Math.max(0, Number(submitted?.response_time ?? 0));
    const isCorrect = userAnswer === question['correct_answer'];
    const basePoints = isCorrect ? ((question['points'] as number) ?? 10) : 0;

    const limitMs = (((question['time_limit'] as number) ?? 30) || 30) * 1000;
    const speed = Math.max(0, Math.min(1, 1 - responseTime / limitMs));
    const timeBonus = isCorrect ? Math.round(basePoints * 0.5 * speed) : 0;

    if (isCorrect) correctCount += 1;
    score += basePoints + timeBonus;
    timeBonusTotal += timeBonus;

    results.push({
      question_id: question['id'],
      question_text: question['question_text'],
      user_answer: userAnswer,
      correct_answer: question['correct_answer'],
      is_correct: isCorrect,
      explanation: question['explanation'],
      base_points: basePoints,
      time_bonus: timeBonus,
      total_points: basePoints + timeBonus,
    });

    responseRows.push({
      attempt_id: attempt['id'],
      question_id: question['id'],
      user_id: userId,
      user_answer: userAnswer,
      correct_answer: question['correct_answer'],
      is_correct: isCorrect,
      base_points: basePoints,
      time_bonus: timeBonus,
      points_earned: basePoints + timeBonus,
      response_time: Math.round(responseTime),
      used_hint: hintsList.includes(questionId),
    });
  }

  const hintPenalty = hintsList.length * HINT_PENALTY;
  const finalScore = Math.max(0, score - hintPenalty);
  const maxPossible = allowedIds.reduce(
    (sum, id) => sum + (((byId.get(id)?.['points'] as number) ?? 10) || 10),
    0,
  );
  const percentage = maxPossible > 0 ? Math.round((finalScore / maxPossible) * 10000) / 100 : 0;

  if (responseRows.length) {
    await db.from('challenge_responses').upsert(responseRows, { onConflict: 'attempt_id,question_id' });
  }

  await db
    .from('challenge_attempts')
    .update({
      status: 'completed',
      score: finalScore,
      max_score: maxPossible,
      percentage,
      correct_answers: correctCount,
      total_questions: allowedIds.length,
      hints_used: hintsList.length,
      hint_penalty: hintPenalty,
      time_bonus: timeBonusTotal,
      time_taken: Math.max(0, Math.round(timeTaken)),
      submitted_at: new Date().toISOString(),
    })
    .eq('id', attempt['id'] as string);

  return json({
    data: {
      attempt_id: attempt['id'],
      final_score: finalScore,
      raw_score: score,
      max_possible_score: maxPossible,
      percentage,
      correct_answers: correctCount,
      total_questions: allowedIds.length,
      hints_used: hintsList.length,
      hint_penalty: hintPenalty,
      time_bonus: timeBonusTotal,
      time_taken: Math.max(0, Math.round(timeTaken)),
      results,
    },
  });
}

async function handle(request: Request, splat: string) {
  const segs = splat.split('/').filter(Boolean);
  const url = new URL(request.url);

  const auth = await authenticate(request);
  if ('error' in auth) return auth.error!;
  const { userId, db } = auth as { userId: string; db: AnyClient };

  try {
    if (request.method === 'GET' && segs[0] === 'start') return await handleStart(url, userId, db);
    if (request.method === 'GET' && segs[0] === 'questions' && segs[2] === 'hint') {
      return await handleHint(Number(segs[1]), userId, db);
    }
    if (request.method === 'POST' && segs[1] === 'submit') {
      return await handleSubmit(Number(segs[0]), request, userId, db);
    }
    return fail('Unknown quiz-engine endpoint', 404);
  } catch (error) {
    console.error('quiz-engine error', error);
    return fail(error instanceof Error ? error.message : 'Unexpected server error', 500);
  }
}

export const Route = createFileRoute('/api/public/quiz-engine/$')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request, params }) => handle(request, (params as { _splat?: string })._splat ?? ''),
      POST: async ({ request, params }) => handle(request, (params as { _splat?: string })._splat ?? ''),
    },
  },
});
