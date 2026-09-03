# Prepare Mila's month

Steven's monthly ritual. A button in the admin banner previews the most recently completed milestone — its title, dates, shared slug, and letter tag — and, on confirmation, creates that month's journey card together with a private blank letter draft in one atomic operation, then navigates to the new card.

## Sub-features

- `prep-entry` shows **Prepare Mila's Month** in the admin banner above the nav, admin only.
- `prep-preview` opens a modal and loads the computed milestone from `GET /api/journey/prepare-month`.
- `prep-fields` shows the card title, date range, letter title, tag, and the shared slug.
- `prep-message` accepts an optional journey message of at most 5000 characters.
- `prep-submit` creates the card and the draft. Mutating — never exercised.
- `prep-conflict` reports "This month already has a journey card or letter" and changes nothing.
- `prep-redirect` navigates to `/my-journey/<section>/<slug>` on success.
- `prep-headless` performs the same operation from the command line without a browser.

## How to get to it (user POV)

- Sign in as Steven; the banner appears above the nav on every page. Choose **Prepare Mila's Month**.
- Run `node scripts/prepare-milas-month.mjs` from the repository for the headless preview.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0 and a signed-in **admin** Chrome is available.
- **This is the most destructive control in the app. Never submit it.** It inserts a journey card and a blog draft into the live database. Verify the entry point, the preview, and the server-side guard only.
- `prep-headless` additionally needs `MILA_ADMIN_EMAIL` and `MILA_ADMIN_PASSWORD` in `.env.local`, which this checkout does not have — `doctor` reports that.

- **Prove the guard first.** Run `node .cursor/skills/verify-mila/control-mila.mjs get /api/journey/prepare-month --method POST --body '{}' --expect-unauthorized`. It returns `401 Unauthorized` with `{"error":"Sign in to continue."}` — the anonymous caller is rejected before the RPC runs. Do this before touching the UI.
- **Read the live preview headlessly.** Run `node .cursor/skills/verify-mila/control-mila.mjs session`, then `... get /api/journey/prepare-month --as-admin --save prepare-month/preview`. Status is `200 OK` with JSON carrying `slug`, `title`, `date`, `section`, `blog_title`, `tag`, `journey_type`, `milestone`, and `period_start`. This exercises `authorizeAdmin()` end to end — session plus the `is_mila_admin` RPC — and runs the same `mila_month_preview` the modal calls, without a browser. It is a read; it creates nothing.
- **Cross-check against the repo's own command.** Run `node scripts/prepare-milas-month.mjs` with no flags. It signs in with the same credentials, previews by default, and writes nothing. Its `slug`, `title`, and `date` must match the API response above. A disagreement means the website and the headless command are computing different months.
- **Find the entry point.** In the admin tab, the banner above the nav is labelled `Mila's monthly preparation`, reads "Steven's admin tools", and holds a green **Prepare Mila's Month** button. In a non-admin signed-in tab the banner is absent.
- **Open the preview.** Choose **Prepare Mila's Month**. A modal titled `Prepare Mila's Month` opens and loads. It explains that it will "Create the most recently completed monthly milestone and a private blank letter draft. If either already exists, nothing is created or changed."
- **Read the preview values.** Once loaded, the modal shows the milestone title, the date, the letter title and tag, and a line reading `Slug (journey card and letter): <slug>` in code style. Record all of them — this read is the verification.
- **Check the message field.** The textarea labelled `Journey message (optional)` accepts input and caps at 5000 characters. Type a short string to confirm it accepts input.
- **Stop at the submit.** The footer button reads **Create card and letter draft**. **Do not press it.** Close the modal with its header close control instead.
- **Preview headlessly.** Not drivable in this checkout — `MILA_ADMIN_*` are absent, so `node scripts/prepare-milas-month.mjs` cannot sign in. Report as skipped with that precondition. Note that the command's default mode is preview and writes nothing, but it still needs credentials.
- **Verify the logic offline instead.** Run `node scripts/check-monthly-workflow.mjs` and `node scripts/check-prepare-milas-month.mjs`. These exercise the real migration functions, the atomic conflict path, the milestone dates, and RLS in an in-memory PGlite database and make no network requests. `check-monthly-workflow.mjs` needs `@electric-sql/pglite` installed separately or `PGLITE_MODULE` pointed at an existing copy — see `docs/monthly-preparation.md`.
- **Proof.** Screenshot the banner and the open modal with the preview values and slug visible, plus the `401` output from the guard check. State explicitly that the submit was not pressed.

## Gotchas

- **There is no undo.** A successful submit inserts a journey card and a blog draft into the live database, and the documented workflow has no delete path — "There are no updates, deletes, upserts, or automatic retries." Treat the submit button as unreachable during verification.
- The submit sends the slug the preview returned as `expected_slug`. If the milestone rolls over between opening the modal and submitting, the server rejects the stale preview with a 400 asking you to reload. That guard exists precisely because the preview can go stale — do not report it as a bug.
- Opening the modal is itself a live call: `GET /api/journey/prepare-month` runs the `mila_month_preview` RPC. It is read-only and safe, but it does reach the production database, so it fails when Supabase is unreachable.
- Repeating the action never advances the target month. An already-prepared month returns a 409 with "This month already has a journey card or letter. Nothing was created or changed." — a safe no-op, not an error to fix.
- The milestone is computed **by the database**, from a birth date of May 30, 2023 in `America/Chicago`. Local clock or time zone changes do not move it, and the client does no milestone math of its own.
- The banner button and the modal are one component mounted in the nav, so the same control appears on every page including the home carousel. There is no second copy inside My Journey.
- Success routes to `/my-journey/<section>/<slug>`, the journey card — not to the letter draft. The draft is found through the blogs index, badged as a draft.
