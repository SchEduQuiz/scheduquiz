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
