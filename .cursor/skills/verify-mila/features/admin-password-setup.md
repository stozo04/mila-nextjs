# Admin password setup

A one-time private page that adds a password to Steven's existing Google-authenticated Supabase account, so the headless monthly command can sign in without a browser. It is reachable only by the admin; everyone else gets a 404.

## Sub-features

- `setup-guard` renders the site 404 for any non-admin, signed in or not.
- `setup-form` shows "Set up the monthly command" with two password fields and a **Set password** button.
- `setup-validation` rejects a password under 12 characters or a mismatched confirmation.
- `setup-submit` rechecks admin status, then sets the password. Mutating — never exercised.
- `setup-success` replaces the form with instructions to save `MILA_ADMIN_PASSWORD` and `MILA_ADMIN_EMAIL` privately.
- `setup-clear` empties both fields after any attempt.

## How to get to it (user POV)

- Sign in as Steven and open `http://127.0.0.1:3000/admin/prepare-month-setup` directly. There is no link to it from the nav or any page.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0.
- `setup-form` and everything below it need a signed-in **admin** Chrome.
- **Never submit this form.** It changes the credentials on the real account. Verify the guard, the form, and the client-side validation copy only.

- **Confirm the anonymous gate.** Open the page signed out. Run `node .cursor/skills/verify-mila/control-mila.mjs get /admin/prepare-month-setup --save admin-password-setup/anonymous`. Status is `307` with `location: /login` — the session gate fires before the admin check.
- **Confirm the non-admin guard.** In a signed-in but non-admin tab, open `/admin/prepare-month-setup`. The site 404 page renders — "Page Not Found" with **Go Home** — rather than a permission message. Skipped if no non-admin account is available.
- **Load the form.** In the admin tab, open the same path. The heading reads `Set up the monthly command` with the explanation that Google sign-in will keep working. Two fields are present: `New Supabase password` (id `monthly-password`) and `Confirm password` (id `monthly-password-confirm`), both `type="password"`, plus a green **Set password** button.
- **Check the short-password rejection.** Type `short` into both fields and submit. The form shows `Use at least 12 characters and enter the same password in both fields.` and **no network request is made** — this validation runs entirely client-side before the Supabase call, so it is safe to exercise.
- **Check the mismatch rejection.** Type twelve or more characters into the first field and something different into the second, then submit. The same message appears, again with no request.
- **Stop before a valid submit.** Do not enter a matching password of twelve or more characters and submit. That path calls `supabase.auth.updateUser({ password })` against the live account.
- **Proof.** Screenshot the 404 for the non-admin path, the loaded form for the admin, and the validation message after a deliberately invalid attempt. Record that no valid submission was made.

## Gotchas

- **The two invalid-input cases are the only safe submits on this page**, because the length and match checks short-circuit before any Supabase call. Any input that passes both checks reaches the live account — there is no dry run.
- Never type a real or intended password during a drive, even into a field you will not submit. Use obviously fake values like `short` and `aaaaaaaaaaaa` / `bbbbbbbbbbbb`.
- The page hides itself with `notFound()` rather than a 403, so "the page does not exist" and "you are not the admin" are indistinguishable. A 404 here is the guard working.
- The server guard runs `authorizeAdmin()` at render, but the form **re-checks** `is_mila_admin` client-side before submitting, so an expired session produces "Sign in with the authorized admin account before setting a password." rather than a silent failure.
- Setting a password is not enough to make the headless command work. Email sign-in must also be enabled in the Supabase dashboard, and `MILA_ADMIN_EMAIL` / `MILA_ADMIN_PASSWORD` added to `.env.local` — see `docs/headless-month-preparation.md`. Doctor's `headless admin sign-in configured` row reports whether that finished.
- Those two variables must never carry a `NEXT_PUBLIC_` prefix, and the password must never appear in a command argument, a source file, or chat. Do not read `.env.local` values into a transcript; `control-mila.mjs` deliberately reads key **names** only.
- Both fields clear after every attempt, successful or not, so a screenshot taken after submitting shows empty inputs. That is the designed behavior.
