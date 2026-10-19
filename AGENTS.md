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

## Architecture rules
- Access control lives in `src/lib/permissoes.ts` (profiles + `pode`) and `src/lib/acesso.ts` (`guard` for route `beforeLoad`, `exigir` inside data mutations); every new screen/action must use both so menu, URL and data writes stay blocked together.
- System settings are declared once in `src/lib/config.ts` (`SECOES`); the settings screen renders from that list, so new options are added there, not in the page.
- Admin actions and settings changes are logged via `registrar` in `src/lib/auditoria.ts`; the log is append-only.
