# Prepare Mila’s Month

For the repository’s preview/apply command and its one-time private login setup,
see [Headless monthly preparation](headless-month-preparation.md).

Steven sees **Prepare Mila’s Month** in a small admin banner above the site’s
navigation whenever he is signed in. Other users do not see the banner. It opens
the same preparation modal used by the original journey action, with no duplicate
button inside My Journey. It previews the most
recently completed month using May 30, 2023 and America/Chicago. On September 2,
2026 that is **3 Years 3 Months**, **July 30 – August 30, 2026**. February ends on
its last valid day; March returns to the 30th. The milestone end date determines
the letter’s date and year tag.

The preview shows the shared slug, for example `three-years-three-months`. That
server-generated value is used for both records, duplicate checks, and card routes.
The follow-up migration `20260902151602_canonical_monthly_slugs.sql` removes
the old numeric fallback for ages 20 and above, keeping generated slugs in lowercase
hyphenated words. It was approved and applied live on September 2, 2026 as
`canonical_monthly_slugs`, Supabase version `20260902152014` (`success: true`). Its
SHA256 is `7B67D5B458F86E902048EAD6E4B8C7B99C3269CFE353532CE377889952FFF794`.
Before/after hashes of all card rows, all blog rows, and their combined slugs were
identical; counts remained 42 cards, 68 blogs, and 4,764 storage objects. No slugs
were backfilled. Live preview kept `three-years-three-months` and correctly produced
`twenty-one-years-three-months` for the future case. All 1,200 sampled monthly
previews matched the word-only format. Function permissions were verified, and
security advisor findings were unchanged. The first migration remains unchanged.

An optional message fills the new journey card; omission leaves it blank. The
matching letter is a private draft with empty content and media. Creating either
record conflicts if its slug exists: both inserts roll back, leaving all existing
records unchanged. Repeating the action never advances the target month. A stale
preview must be reloaded after a milestone boundary.

Cards link to their existing `birthday/<slug>` folder in `mila_storage_bucket`.
Steven can select or drop JPEG photos (.jpg or .jpeg), up to the bucket’s existing
50 MB limit. The picker and upload validation both require JPEG. Each upload has
a new filename and never overwrites an object. The accessible status shows
“Uploading 7 of 30” during the batch, then uploaded and failed counts. The first
failure stops the batch and also reports the number not attempted. Partial
successes refresh the gallery. Select only the remaining files when retrying.
Signed-in visitors retain gallery access.

Opening a gallery photo also lets Steven use it as the matching letter’s featured
or detail image. The server verifies his session and admin role, checks that the
file exists in `birthday/<slug>`, and saves Storage’s public object URL to only
the chosen blog field. Both roles can use the same photo. No object is uploaded
or copied. A missing paired letter returns a clear error and changes nothing.
Selected photos have a subtle glow and Featured/Detail labels visible only to
Steven. Readers retain the existing image-only popup, including its overlay close
button, without an admin header, actions, footer, or selection labels.
The existing blog RLS policies apply; no new migration is required.

## Activation

The approved `supabase/migrations/20260902144654_prepare_milas_month.sql` was applied
to the verified live **Mila's Website** project (`pawkklvezvrmtpqbztwb`) on September 2,
2026. Supabase recorded `prepare_milas_month` as version `20260902150856`; the MCP
assigned that version instead of the local file’s timestamp. Do not apply it again.
Its SHA256 is `23D7318CB377EC4016EA062EA6DFBD37DE95D600FB226E013725D2950D93D75A`.
It resolves Steven’s verified Auth account by email at migration
time, then binds authorization to that account’s immutable ID. It fails if that
account is absent or ambiguous. No service-role key or new bucket is required.

The migration restricts all journey-card and blog writes to Steven, adds a draft
flag with existing blogs remaining published, and protects monthly photo uploads
with Storage RLS. The shared bucket remains public to preserve existing media
URLs: knowing a photo URL still permits direct access. This is not a private-media
migration. Draft letters are hidden from other users by RLS and excluded from the
service-role audio endpoint. After filling a draft’s content using the existing
Supabase editing workflow, Steven can open it and click **Publish Letter**. The
server verifies Steven’s account and updates only that draft’s `is_draft` flag.
Success refreshes the page content from the returned database row and removes the
publish button; errors leave a visible message. Published letters and non-admin
views have no publish control. No additional migration is needed for this button.

The migration returned `success: true`. Independent post-checks verified the
three invoker functions, their permissions, 12 policies, and the draft column.
Read-only role assertions accepted Steven and rejected a non-admin. The live
preview matched the September example above. Counts remained 42 cards, 68 blogs,
4,764 bucket objects, and zero drafts. The target remained healthy, with the same
verified admin account before and after. No monthly records, uploads, deployment,
or commits were made.

The security advisor reported unrelated issues on the existing timestamp trigger
function ([search path guidance](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)),
[password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection),
and [available PostgreSQL security patches](https://supabase.com/docs/guides/platform/upgrading).
The intentionally locked `blog_audio` and `chat_questions` tables have informational
[no-policy notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
No unrelated changes were applied.

No live records, uploads, or schedules are created by the checks below.
After release approval, verify actual Steven/reader sessions
and an approved photo upload against Supabase before claiming live acceptance.

## Focused checks

`node scripts/check-monthly-workflow.mjs` uses an in-memory PGlite database and
synthetic rows. It applies the actual migrations to a minimal copy of the inspected
schema and exercises dates, atomic conflicts, defaults, RLS, draft visibility,
Storage paths, actual HTTP handlers/shared authorization, draft audio rejection
before cache/TTS access, published cached audio, picker/drop callbacks,
publishing feedback/control visibility, and banner visibility across auth changes.
It does not connect to Supabase. Install `@electric-sql/pglite` in a separate tools
directory, or set `PGLITE_MODULE` to an existing installation before running it.
No runtime dependency was added to the application.

Also run `npm run build`, `npm run lint`, and `npx tsc --noEmit`. This checkout’s package manifest uses
Node 22; its older AGENTS.md run instructions still say Node 20. Verification used
Node 22.22.1, matching the manifest and currently installed Supabase dependency.

The PR includes the current `master` cleanup, which resolved the earlier lint
findings. Full lint, TypeScript and the production build pass on the integrated
work. The build still reports six non-blocking Bootstrap/Sass warnings about
deprecated `if()` syntax, including a notice about omitted repetitions.
The local Steven UI and responsive letter layout were inspected in Chrome;
production database role checks hid drafts from a non-admin and exposed them to
Steven. These checks do not replace a real non-admin browser acceptance test or
an approved Storage upload after release.

Production must receive the audio route’s `is_draft = false` filter as well as
the draft reminder UI. The older deployed audio handler uses an elevated database
client and can bypass reader RLS. The regression check runs the actual handler
with fake database/audio boundaries; it makes no live audio requests. Do not
reapply the two migrations documented above when releasing this application code.
