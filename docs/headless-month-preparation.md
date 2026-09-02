# Headless monthly preparation

Requires Node 22 and the repository’s installed dependencies. The command calls
the same `is_mila_admin`, `mila_month_preview`, and `prepare_milas_month` Supabase
functions as the website. It does not use a browser, website endpoint, browser
session, service-role key, or duplicated milestone math.

## One-time private setup

1. Start the local app and sign in with the existing authorized Google account.
2. Open `/admin/prepare-month-setup` on the local site.
3. Enter and confirm a new Supabase password yourself, then choose **Set password**.
   The page requires server-side admin authorization and rechecks the current
   account before calling normal `auth.updateUser({ password })`. It adds password
   sign-in to that same account; Google sign-in stays available. The form clears
   both fields after the request and does not persist or log the password.
4. In the Supabase project dashboard, open **Authentication → Sign In / Providers
   → Email** and enable Email sign-in if disabled. Retain Google and the existing
   signup restrictions. Adding a password alone does not enable this provider.
5. Edit the repository’s ignored `.env.local` privately. Retain the existing
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Add
   `MILA_ADMIN_EMAIL` (the existing account email) and `MILA_ADMIN_PASSWORD` (the
   password just set). These last two variables must never use a `NEXT_PUBLIC_`
   prefix. Do not put passwords in chat, command arguments, source files, or Git.

The command loads `.env.local` relative to its own repository. Already-set process
environment variables take precedence. Credentials are used only for ordinary
Supabase password sign-in; session persistence and automatic refresh are disabled.
The setup page is only a one-time prerequisite. Normal command runs are headless.
Supabase documents adding a password to an OAuth account in
[Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking).

## Invocation

From the repository, preview by default (no content writes):

```powershell
npm run prepare-milas-month
npm run prepare-milas-month -- --message "A little artist"
```

To apply, supply the exact slug returned by that preview and the optional message:

```powershell
npm run prepare-milas-month -- --apply --expected-slug three-years-three-months --message "A little artist"
```

The message goes only to the journey card. Omitting it gives a blank message.
The letter draft is always blank and private. The database determines the latest
completed milestone, dates, section and word slug. If the milestone changes
between preview and apply, the command stops; preview again.

For a skill or another process, avoid npm’s log preamble and invoke directly:

```powershell
node scripts/prepare-milas-month.mjs
node scripts/prepare-milas-month.mjs --apply --expected-slug <preview-slug> --message "A little artist"
```

Output is JSON containing `status`, `slug`, `title`, `date`, and `existing`:

| Status | Meaning | Exit |
| --- | --- | --- |
| `preview` | Neither record exists; no content was created. | 0 |
| `created` | Shared atomic RPC completed and both rows were read back. | 0 |
| `already_exists` | Both records already exist; neither was changed. | 0 |
| `conflict` | A partial pair or constraint conflict needs human review; no repair attempted. | 2 |
| `error` | Invalid input, authentication/configuration or unconfirmed operation; inspect the error and preview again. | 1 |

Existing pairs are safe successful no-ops even when a different message is
provided. Partial pairs are never filled in. Concurrent duplicate creation is
handled by the shared database transaction and unique constraints. There are no
updates, deletes, upserts, or automatic retries of the create operation. On an
uncertain network result, rerun the preview before applying again.

## Offline verification

```powershell
node scripts/check-prepare-milas-month.mjs
node scripts/check-monthly-workflow.mjs
```

The first check uses a fake Supabase boundary and subprocess checks for argument
handling; it makes no network requests. The second exercises the actual migration
functions, atomic conflicts, dates, and RLS in an isolated PGlite database (see
`monthly-preparation.md` for the `PGLITE_MODULE` prerequisite). Neither creates
live content. Do not test `--apply` against the live project during development.
