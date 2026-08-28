import { createFileRoute } from "@tanstack/react-router";

import { SpaMount, spaHead } from "@/components/spa-host";

/**
 * Catch-all route: every client-side path of the pre-built SPA (dashboard,
 * quizzes, assignments, auth, ...) is served the same shell so the app's own
 * client router can take over. This is the SPA-fallback equivalent of the
 * `rewrites` rule used on Vercel.
 */
export const Route = createFileRoute("/$")({
  head: () =>
    spaHead(
      "EduQuiz Platform",
      "AI-powered learning and assessment for classrooms: quizzes, assignments and instant feedback.",
    ),
  component: SpaMount,
});
