// Server-side gamification for completed quiz attempts: points, streaks and
// leaderboard totals are recomputed and persisted here, never in the browser.
import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';

const cors: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-store',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export const Route = createFileRoute('/api/public/quiz-gamification/')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        try {
          const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
          if (!token) return json({ error: { message: 'Authentication required' } }, 401);

          const authClient = createClient(
            process.env['SUPABASE_URL']!,
            process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY']!,
            { auth: { persistSession: false, autoRefreshToken: false } },
          );
          const { data: userData, error: userError } = await authClient.auth.getUser(token);
          if (userError || !userData?.user) {
            return json({ error: { message: 'Invalid or expired session' } }, 401);
          }
          const userId = userData.user.id;

          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
          const category = typeof body['category'] === 'string' ? (body['category'] as string) : null;
          const userName =
            typeof body['user_name'] === 'string' ? (body['user_name'] as string) : 'Anonymous';

          const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
          /* eslint-disable @typescript-eslint/no-explicit-any */
          const db = supabaseAdmin as unknown as { from: (t: string) => any };

          // Recompute from persisted attempts so the numbers cannot be faked.
          const { data: attempts } = await db
            .from('challenge_attempts')
            .select('score, percentage, total_questions, correct_answers, time_taken, submitted_at')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .order('submitted_at', { ascending: false })
            .limit(500);

          const rows = (attempts ?? []) as Array<Record<string, number | string | null>>;
          const totalPoints = rows.reduce((sum, r) => sum + Number(r['score'] ?? 0), 0);
          const gamesPlayed = rows.length;
          const totalQuestions = rows.reduce((s, r) => s + Number(r['total_questions'] ?? 0), 0);
          const totalCorrect = rows.reduce((s, r) => s + Number(r['correct_answers'] ?? 0), 0);
          const totalTime = rows.reduce((s, r) => s + Number(r['time_taken'] ?? 0), 0);
          const perfectScores = rows.filter((r) => Number(r['percentage'] ?? 0) >= 100).length;
          const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 10000) / 100 : 0;
          const level = Math.max(1, Math.floor(totalPoints / 500) + 1);

          // Streak of consecutive calendar days with a completed quiz.
          const days = Array.from(
            new Set(
              rows
                .map((r) => (r['submitted_at'] ? String(r['submitted_at']).slice(0, 10) : null))
                .filter((d): d is string => Boolean(d)),
            ),
          ).sort((a, b) => (a < b ? 1 : -1));
          let streak = 0;
          if (days.length) {
            const today = new Date();
            const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
            const iso = (d: Date) => d.toISOString().slice(0, 10);
            if (days[0] === iso(cursor) || days[0] === iso(new Date(cursor.getTime() - 86400000))) {
              let expected = days[0]!;
              for (const day of days) {
                if (day !== expected) break;
                streak += 1;
                const next = new Date(`${expected}T00:00:00.000Z`);
                next.setUTCDate(next.getUTCDate() - 1);
                expected = iso(next);
              }
            }
          }

          const { data: existingPoints } = await db
            .from('user_points')
            .select('id, longest_streak')
            .eq('user_id', userId)
            .maybeSingle();
          const longestStreak = Math.max(streak, Number(existingPoints?.['longest_streak'] ?? 0));
          const pointsRow = {
            total_points: totalPoints,
            current_level: level,
            streak_count: streak,
            longest_streak: longestStreak,
            last_quiz_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          if (existingPoints) {
            await db.from('user_points').update(pointsRow).eq('id', existingPoints['id']);
          } else {
            await db.from('user_points').insert({ user_id: userId, ...pointsRow });
          }

          const leaderboardRow = {
            user_name: userName,
            total_score: totalPoints,
            games_played: gamesPlayed,
            average_accuracy: accuracy,
            total_time_spent: totalTime,
            perfect_scores: perfectScores,
            category,
            updated_at: new Date().toISOString(),
          };
          const existingBoard = await db
            .from('user_leaderboard_entries')
            .select('id')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle();
          if (existingBoard?.data) {
            await db
              .from('user_leaderboard_entries')
              .update(leaderboardRow)
              .eq('id', existingBoard.data['id']);
          } else {
            await db.from('user_leaderboard_entries').insert({ user_id: userId, ...leaderboardRow });
          }

          return json({
            data: {
              total_points: totalPoints,
              new_streak: streak,
              longest_streak: longestStreak,
              current_level: level,
              games_played: gamesPlayed,
              average_accuracy: accuracy,
              achievements_unlocked: [],
            },
          });
        } catch (error) {
          console.error('quiz-gamification error', error);
          return json(
            { error: { message: error instanceof Error ? error.message : 'Unexpected server error' } },
            500,
          );
        }
      },
    },
  },
});
