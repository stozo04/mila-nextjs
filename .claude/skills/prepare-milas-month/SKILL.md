---
name: prepare-milas-month
description: Prepare Mila Gates's most recently completed monthly journey card and private letter draft through the headless Mila site command. Use when Steven explicitly asks to prepare Mila's month, optionally with a journey message.
---

# Prepare Mila's Month

Use the headless command in the Mila Next.js repository. Do not automate the website UI or duplicate the month calculation.

The command always previews first. It returns the completed age, date range, canonical slug, and whether the journey card and letter already exist.

- If the user asks only to check or preview, stop after the preview and report it.
- If the user explicitly asks to prepare or create the month, run the preview, then apply using exactly the returned slug. Pass the user's optional tagline only as `--message` so it appears on the journey card, never the letter draft.
- Do not apply when the preview reports an existing complete pair: report the successful no-op.
- Do not repair a partial pair. Stop and report the error.

Run from the Mila repository:

```powershell
npm run prepare-milas-month -- --message "Optional journey message"
```

After a successful preview, the deliberate create command is:

```powershell
npm run prepare-milas-month -- --apply --expected-slug <preview-slug> --message "Optional journey message"
```

The message flag is optional. Never expose passwords or other environment values. The ignored `.env.local` must provide the existing Supabase public URL and key plus `MILA_ADMIN_EMAIL` and `MILA_ADMIN_PASSWORD`. If the password has not been set up, direct Steven to the local Steven-only setup page at `/admin/prepare-month-setup`; preserve Google sign-in.

The command uses the existing authorized atomic database operation. It never updates an existing record, and it must not use a service key.
