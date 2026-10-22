# Admin dashboard validation

- [x] Fix repeated loading in users and questions, navigation overlays and misleading diagnostics.
- [x] Replace user and password-reset operations with authenticated server operations.
- [x] Verify disposable user creation/edit/suspension/bulk reactivation and message persistence in Sent.
- [x] Verify signed-out account denial and account safeguards; question table allowlist and read-error tests.
- [ ] Verify user deletion and clean up the disposable audit account. Blocked: previous signed-in browser session was lost after environment continuation; external Supabase cannot mint a replacement.
- [ ] Verify question mutations, reset approval/rejection, full analytics/log/test flows and message receipt. Blocked: no remaining authenticated test session.
- [ ] Verify cross-site production admin service after publication. Blocked: current published service deployment is not verified.
- [x] Report System Settings as unavailable rather than inventing settings behavior.