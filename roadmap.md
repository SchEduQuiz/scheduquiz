# Admin dashboard validation

- [x] Fix repeated loading in users and questions, navigation overlays and misleading diagnostics.
- [x] Replace user and password-reset operations with authenticated server operations.
- [x] Verify disposable user creation/edit/suspension/bulk reactivation and message persistence in Sent.
- [x] Verify signed-out account denial and account safeguards; question table allowlist and read-error tests.
- [ ] Verify user deletion and clean up the disposable audit account. Blocked: previous signed-in browser session was lost after environment continuation; external Supabase cannot mint a replacement.
- [ ] Verify question mutations, reset approval/rejection, full analytics/log/test flows and message receipt. Blocked: no remaining authenticated test session.
- [ ] Verify cross-site production admin service after publication. Blocked: current published service deployment is not verified.
- [x] Report System Settings as unavailable rather than inventing settings behavior.
- [x] Quiz resume after refresh: progress saved server-side, restored on start (24h window).
- [x] Fix empty-body admin reset stats/list 400 and message mark-as-read 406.
- [ ] Publish so scheduquiz.lovable.app serves the fixed account and quiz services. Blocked: needs user to publish.
- [x] Fix quiz submit 409 loop, lesson question load/save (400), AI question generation (CORS), service-worker fetch rejection.

## November 1 question-contract and readiness audit

- [x] Record baseline: 10 unit tests pass; both shipped bundles match; 10 lesson questions have JSON-string options; 60 challenge questions exist. Reproduced `question.options.map is not a function` in Chromium with the actual QuestionManager and a controlled legacy-shaped response.
- [ ] Unify lesson option decoding, generation, editing and native JSON writes; add regression coverage.
- [ ] Centralize service-origin selection and correct install prompt handling.
- [ ] Verify actual question list/edit/save/read-back and service authorization; document evidence and remaining enterprise-readiness blockers.
