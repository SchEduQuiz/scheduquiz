import { createFileRoute } from "@tanstack/react-router";

import { SpaMount, spaHead } from "@/components/spa-host";

export const Route = createFileRoute("/")({
  head: () =>
    spaHead(
      "EduQuiz — AI-Powered Educational Quiz Platform",
      "Create, assign and grade quizzes and essays with AI-assisted feedback for teachers and students.",
    ),
  component: SpaMount,
});
