<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep production-bundle patches synchronized between public/assets and static-dist/assets because both serve the imported application.
- Static imported clients use authenticated TanStack server routes for privileged account operations; verify bearer identity and protected user_roles before loading the admin client.
- user_roles is the authorization source; profiles.role is a compatibility display field for the imported application, never a signup privilege source.
- Normalize lesson question options and editor answers through the shared quiz contract in src/lib/quiz-progress.ts; the imported bundle embeds that same function so legacy JSON strings and native JSON do not diverge.
- Imported service callers use the single service-origin selector in tools/admin-transport.js; embed it identically in both deployment bundles to keep local, Lovable and external clients consistent.
- Profile rows are owner/admin-private; the authenticated directory projects only identifiers, display names and compatibility role labels, and transport hydrates messaging without exposing email addresses.
- Post-challenge analytics reads completed owner-scoped challenge_attempts through the shared quiz contract; never duplicate server scores into quiz_scores for display.
