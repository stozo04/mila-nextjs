---
name: verify-mila
description: Drive the Mila Next.js site (milagates.com) locally and prove user-facing behavior with captured evidence. Use when verifying a change to any page, API route, auth gate, gallery, letter, or the monthly admin workflow — instead of asserting a change works from the diff alone.
---

# Verify Mila

Mila is a private family blog: a Next.js 16 App Router site on Supabase (auth, Postgres with RLS, Storage) with OpenAI-backed letter narration and a chatbot. The user-facing surface is a **web UI** at `http://127.0.0.1:3000`, plus six API routes it calls.

Read [`features/README.md`](./features/README.md) before driving anything, then use the matching feature file as the recipe.

## The two constraints that shape every run

**1. There is no test backend.** `npm run dev` reads `.env.local` and talks to the **live** Supabase project `pawkklvezvrmtpqbztwb` — the real 42 journey cards, 68 blog letters, and 4,764 storage objects. There is no seed, no local Supabase, no staging project. So:

> **Drive read-only. Never submit a mutating control.** Create Blog, Create Journey Card, Publish Letter, "Use as featured image", the JPEG uploader, and Prepare Mila's Month are verified by *presence, enablement, and server-side rejection of an anonymous caller* — never by clicking submit. Two instances cannot be isolated from each other because the shared state is the production database, not the port.

**2. Sign-in is scriptable, but only halfway.** The site's own login is Google OAuth, which no script can complete. The account also has a password (`MILA_ADMIN_EMAIL` / `MILA_ADMIN_PASSWORD`, set up per `docs/headless-month-preparation.md`), so `session` can mint a real admin session and drive signed-in **requests** unattended. It cannot render a page. That splits work into three tiers:

| Tier | Session | Harness | Status |
| --- | --- | --- | --- |
| **1 — anonymous** | none | `control-mila.mjs get` | Unattended |
| **2 — signed-in requests** | minted by `session` | `control-mila.mjs get --as-admin` | Unattended |
| **3 — rendered UI** | the user's real Chrome | `claude-in-chrome` MCP, read-only | Needs the user signed in and present |

Tier 2 proves gates, redirects, authorization, and any **server-rendered** response. It cannot prove anything the browser assembles after mount — the nav, galleries, the blogs list, letter bodies, modals. Those are tier 3, because the markup simply is not in the response. See the third bullet under Evidence.

A feature you could not reach is reported as **skipped with the unmet precondition**, never as verified.

## Launch

```bash
npm run dev
```

Ready when the log prints `✓ Ready in <n>s` and `http://localhost:3000`. First compile of a route adds a few seconds on top.

Record the PID so cleanup kills what this run started:

```bash
mila_pid=$(lsof -ti:3000)
```

If port 3000 is already listening before you launch, **do not launch a second server and do not kill the existing one** — it may be the user's own session. Run `doctor` against it; if it passes, drive it and skip teardown.

## Doctor

```bash
node .cursor/skills/verify-mila/control-mila.mjs doctor
```

Exit 0 means the instance is worth driving. It checks Node major 22 (`package.json` `engines`, `.nvmrc`, and `.node-version` all agree), the required `.env.local` keys **by name only**, that `/` returns 200 with the landing carousel, and that an unknown path returns `307 → /login` — which is both the real gate and proof you are talking to this app and not a stale server from another checkout.

The `headless admin sign-in configured` row is informational and never blocks. When it passes, tier 2 is available; when it fails, `MILA_ADMIN_*` are absent and every signed-in check falls back to tier 3.

Run doctor first whenever anything looks off.

## Drive

```bash
node .cursor/skills/verify-mila/control-mila.mjs get <path> [--save <name>] [--expect-unauthorized]
```

`get` prints status, `location`, content-type, and byte count, and follows no redirects (`redirect: 'manual'`) so a gate is observable rather than swallowed. `--save <name>` writes the response body plus a provenance header to `artifacts/<name>`.

### Signed-in requests (tier 2)

```bash
node .cursor/skills/verify-mila/control-mila.mjs session
node .cursor/skills/verify-mila/control-mila.mjs get /blogs --as-admin
```

`session` signs in with the admin password and stores the auth cookies in `.session.json` (git-ignored). It builds them with the app's **own** `@supabase/ssr`, so the cookie name, `base64-` encoding, and 3180-byte chunking always match what the server expects. It prints the account email and `is_mila_admin`, never a token. `session --clear` deletes the file.

`--as-admin` attaches those cookies. The same path proves the gate from both sides: `/blogs` is `307 → /login` anonymously and `200 OK` with `--as-admin`.

**Preserve the cookie names exactly as `session` saved them.** A session larger than 3180 bytes is split into `sb-<ref>-auth-token.0`, `.1`, …, and `src/proxy.ts` — the gate itself — uses the legacy `get(name)` cookie adapter, which finds those chunks by probing those exact names. The `200`s above came *through* that gate, so the chunked names are what make it work. Merging or renaming them would still satisfy `authorizeAdmin()` on the API routes while silently breaking the page gate.

`session` refuses to save a session whose `is_mila_admin` is false: a signed-in but unauthorized session behind a flag named `--as-admin` would turn every admin drive into an unexplained 403.

The harness refuses four things, by design:

- **Any non-GET**, unless `--expect-unauthorized` — which asserts the endpoint answers 401/403 *before* it writes. That is the only sanctioned way to touch a mutating route.
- **`--as-admin` with any non-GET.** An authenticated write would land in the live database. Signed-in drives are read-only, always.
- **`--as-admin` together with `--expect-unauthorized`.** Contradictory: that test exists to prove an *anonymous* caller is turned away, so it must never carry a session.
- **`GET` on `/api/blog/<slug>/audio`, `/api/chat-stream`, `/api/chatkit/session`** — with or without a session. These spend money on a plain GET. The audio route runs on the **service-role key**, bypasses RLS, bills OpenAI TTS per uncached letter, and upserts `blog_audio`.

### Rendered UI (tier 3)

Drive the real browser with `claude-in-chrome`: `tabs_context_mcp` first, then a new tab at `http://127.0.0.1:3000`. Prefer accessible names and the stable handles each feature file lists (`#journey-photos`, `aria-label="Upload journey photos"`, button text) over CSS position.

## Evidence

Artifacts go to `.cursor/skills/verify-mila/artifacts/<feature>/` (git-ignored). Each saved body carries a header with the method, URL, status, redirect target, and capture time.

Proof standards:

- Exercise the real user path. A route's HTML is not proof that the control on it works.
- Capture the **action and the resulting state**, not just the final screen. For a gate, that means the request *and* the `location` header.
- **Server-rendered HTML is not what the user sees.** The nav, every gallery, the blog list, letter bodies, and the chatbot are client components that fetch after mount. `GET /` returns `navbar-brand` and zero `nav-item`s. A `200` from `--as-admin` proves *authorization*, not that the page has content — the markup arrives later, in the browser. Any claim about the nav, a photo grid, or a letter list is tier 3.
- For a mutating control, proof is: the control is present and enabled for the right role, and the endpoint it calls returns 401 to an anonymous caller. Say explicitly that the write path itself was not exercised.
- Mock nothing. There is no boundary here that isolates Supabase or OpenAI; that is why the read-only rule exists.

For logic that does not need the app running, the repo already ships offline checks that use an in-memory PGlite database and never connect to Supabase — `node scripts/check-monthly-workflow.mjs` and `node scripts/check-prepare-milas-month.mjs` (see `docs/monthly-preparation.md` for the `PGLITE_MODULE` prerequisite). They complement this skill; they do not drive the app.

## Cleanup

```bash
node .cursor/skills/verify-mila/control-mila.mjs session --clear
if [ -n "$mila_pid" ]; then kill -9 "$mila_pid"; fi
```

Clear the session first. `.session.json` holds a live admin session for the production project; leaving it on disk after a run is the one piece of state this skill creates.

**Never kill by process name** — killing all `node` processes would match the user's other work. Use the captured PID from launch.

Nothing else needs teardown: no fixtures, no rows, no uploads. Artifacts under `artifacts/` are **not** cleanup targets — they are the proof and they outlive the run.

## Helpers

`control-mila.mjs` is the only helper. Zero dependencies, Node 22, invocations shown above.
