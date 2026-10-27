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
- All data lives in Lovable Cloud: `carregarSistema` resolves identity and profiles before permission-filtered collection reads; `createCollection` deduplicates and pages reads, ignores stale-session responses and writes through one sequential queue; RLS still enforces `tem_permissao(modulo, acao)` so request filtering never grants access.
- Audit history loads on demand on history/settings routes; targeted refreshes use collection names so unrelated tables do not reload after deletion.
- User accounts are managed only through server functions in `src/lib/usuarios.functions.ts` (public sign-up is disabled); roles live in `user_perfis`, never on `profiles`.
- Logos are stored in the private `marca` bucket; config keeps a `marca:<path>` reference resolved with `useImagem` (signed URLs).
- Permanent deletion of clients, vehicles, products and quotes goes only through the DB function `excluir_registro` (via `src/lib/exclusao.ts` + `ExcluirRegistro`); direct DELETE policies were removed so dependency checks and audit logging cannot be bypassed.
- Financial money flows (payments, reversals, cancellations, transfers, balance adjustments, OS finalization) run only through the `fin_*` SECURITY DEFINER DB functions called from `src/lib/financeiro.ts`; `fin_movimentos`/`fin_historico` are read-only to clients and a trigger blocks direct changes to paid amounts/status, so balances and history cannot be altered silently.
- Service orders stay in `orcamentos` (tipo `os`) with their own `numeroOS`/`statusOS`; the receivable is linked by `documento_id`, keeping one record per quote→OS so conversion never duplicates finances.
- Cross-device freshness uses one realtime channel in `_authenticated.tsx` that refreshes only the changed collection (debounced); RLS still filters realtime events, so no data is exposed beyond normal reads.
- Every module that calls `createCollection` must be imported in `src/lib/dados.ts` (enforced by `dados.test.ts`); otherwise its data is never loaded when the page is refreshed (F5) outside that module.
- Customer quote portal (`/portal/$token`) reads and confirms only through the SECURITY DEFINER DB functions `portal_ler`/`portal_confirmar` (called from `src/lib/portal.functions.ts`); validity (São Paulo date), totals, duplicates and quote version are checked in the database, and each response is an immutable row in `orc_aprovacoes`, so the browser can never alter prices or approve after expiry.
