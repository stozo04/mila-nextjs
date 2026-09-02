# Sign in and route protection

Every path except `/` and `/privacy-policy` requires a Supabase session; without one the visitor is redirected to `/login`, which offers a single **Continue with Google** control. Google returns to `/auth/callback`, which exchanges the code for a session and lands the visitor on `/`.

## Sub-features

- `gate-protected` redirects `/blogs`, `/sonograms`, `/baby-shower`, `/gender-reveal`, and `/my-journey` to `/login` with no session.
- `gate-catchall` redirects **every** other non-public path, including paths that do not exist, to `/login`.
- `gate-public` lets `/` and `/privacy-policy` through untouched.
- `login-page` renders the Google control at `/login` for an anonymous visitor.
- `login-oauth` starts Google OAuth with `prompt=consent` and a `redirectTo` of `<origin>/auth/callback`.
- `auth-callback` exchanges the `code` query parameter for a session and redirects to `next` or `/`.
- `auth-callback-error` redirects to `/auth/auth-code-error` with `error_message` when the exchange fails, and to `/login` when `code` is missing entirely.
- `api-guard` makes the three admin API routes answer 401 to an anonymous caller before any write.

## How to get to it (user POV)

- Open any protected path while signed out, for example `http://127.0.0.1:3000/blogs`.
- Open `http://127.0.0.1:3000/login` directly.
- Choose **Sign In** in the top nav while signed out.
- Choose **Logout** in the top nav, which routes to `/login`.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0. Its `anonymous session gate active` row already proves `gate-catchall`.
- No session. If a browser is signed in, drive this with `control-mila.mjs`, which sends no cookies.

- **Hit a protected path signed out.** Open `/blogs`. Run `node .claude/skills/verify-mila/control-mila.mjs get /blogs --save sign-in/blogs-anonymous`. Status is `307 Temporary Redirect` and `location: /login`.
- **Confirm the whole protected set.** Repeat for each: `/sonograms`, `/gender-reveal`, `/baby-shower/houston`, `/my-journey/first-year`. Every one returns `307` with `location: /login`.
- **Confirm the catch-all.** Open a path that does not exist. Run `node .claude/skills/verify-mila/control-mila.mjs get /__mila_probe_not_a_route`. Status is `307` with `location: /login` — not `404`. The gate runs before routing resolves.
- **Confirm the public exemptions.** Run `node .claude/skills/verify-mila/control-mila.mjs get /` and `... get /privacy-policy`. Both return `200 OK` with no `location`.
- **Load the sign-in page.** Open `/login`. Run `node .claude/skills/verify-mila/control-mila.mjs get /login --save sign-in/login`. Status is `200 OK` and the body contains `Continue with Google`.
- **Confirm the API guards.** Run each of:
  - `node .claude/skills/verify-mila/control-mila.mjs get /api/journey/prepare-month --method POST --body '{}' --expect-unauthorized`
  - `node .claude/skills/verify-mila/control-mila.mjs get /api/blog/test-slug/publish --method POST --expect-unauthorized`
  - `node .claude/skills/verify-mila/control-mila.mjs get /api/blog/test-slug/images --method POST --body '{}' --expect-unauthorized`

  Each prints `401 Unauthorized` with body `{"error":"Sign in to continue."}` and the harness reports `PASS anonymous caller rejected before any write`.
- **Prove the gate from the signed-in side.** Mint a session, then re-drive the same paths. Run `node .claude/skills/verify-mila/control-mila.mjs session`, which prints the account email and `is_mila_admin: true`, then `... get /blogs --as-admin`. Status is `200 OK` where the anonymous request was `307`. Repeat for `/sonograms`, `/gender-reveal`, `/baby-shower/houston`, `/my-journey/first-year`. The pair of results is the gate proof; neither status alone is.
- **Drive the callback with no code.** Open `/auth/callback` with no query string. Run `node .claude/skills/verify-mila/control-mila.mjs get /auth/callback`. Status is `307` and `location` is the **absolute** URL `http://localhost:3000/login?error_message=Missing+authorization+code.` — safe to drive, it exchanges nothing and writes nothing.
- **Complete a real sign-in.** Not drivable. Google OAuth needs an interactive consent screen and a real Google account. Report as skipped with this precondition; a signed-in Chrome is the tier-2 prerequisite for every other feature.
- **Proof.** Keep every saved body. The gate proof is the status plus the `location` header together — a saved 6-byte redirect body alone proves nothing.

## Gotchas

- The redirect is `307`, not `302` or `401`. A check asserting 401 on a *page* fails; only the API routes answer 401.
- `robots.txt` and `sitemap.xml` are caught by this gate too. See [site metadata](./site-meta.md) — that is a real defect, not a harness artifact.
- Two different gates exist and they disagree. `updateSession` in `src/utils/supabase/middleware.ts` redirects everything not in `publicRoutes`; `PROTECTED_ROUTES` in `src/proxy.ts` re-checks a narrower list. The catch-all wins in practice, so the `PROTECTED_ROUTES` list is not the boundary a reader would assume.
- `ProtectedPage` in `src/components/Shared/Protected/page.tsx` looks like a third, server-side gate, but nothing imports it — `grep -rn "Shared/Protected" src` returns no matches. It is dead code. Do not cite it as the enforcement path.
- **There is no email allowlist.** `NEXT_PUBLIC_ALLOWED_EMAIL` is set in `.env.local` and documented in the README, but `grep -rn "NEXT_PUBLIC_ALLOWED_EMAIL" src` returns no matches — nothing reads it. Any Google account Supabase accepts reaches every protected page. Admin-only actions are gated separately, by the `is_mila_admin` RPC.
- `/auth/callback` and `/auth/auth-code-error` are exempt from the redirect because the gate skips paths starting with `/auth`.
- The callback builds its redirects from the request `origin`, and returns an **absolute** URL naming `localhost` even when the request was addressed to `127.0.0.1`. Match on the path and query, not on the whole `location` string, or the assertion breaks depending on how you addressed the server.
- Signing out from one tab does not re-gate another already-loaded tab until it navigates.
