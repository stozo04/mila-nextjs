# Bug prompt

Paste this to an agent when something is wrong, with the symptom described at the bottom.

---

## The one rule

**Do not write anything down until you have proven the mechanism.**

A symptom is what I noticed. A cause is what you proved. They are not the same thing, and the gap between them is where confident wrong answers live. On 2026-09-02 an agent reported "the nav renders nothing, a signed-out visitor cannot sign in" — from an accessibility-tree read. The DOM had two visible links. The real cause was a stale cookie triggering a dev overlay that covered the page. A fabricated defect got written into the spec before anyone checked.

So: reproduce, diagnose, **prove**, then fix. In that order.

## Steps

### 1. Reproduce it yourself

Do not start from my description alone — I report symptoms, not causes.

```powershell
npm run dev
node .claude/skills/verify-mila/control-mila.mjs doctor
```

State plainly what you observed, and where. **Say which environment**: local dev, or production at milagates.com. They differ — production may be running older code, and `localhost` and `127.0.0.1` have separate cookie jars.

If you cannot reproduce it, **say so and stop.** Ask me for the URL, the account, the browser, the exact steps. Do not fix something you have not seen.

### 2. Prove the mechanism

Get to the actual cause and demonstrate it:

- Read the real artifact — the DOM via `javascript_tool`, the actual response body, the actual database row. Not a summary, not an accessibility tree, not an inference from source.
- Check the console for a real error before theorising about one.
- Rule out the boring explanations first: stale cookies, a screenshot taken before the page settled, an old deploy, a different host, a dev-only overlay.
- Trace it to the line. "Probably the loading flag" is a guess. "The list has zero children because X" is a cause.

**Show me the cause before you change anything.** One or two sentences and the evidence.

### 3. Check for siblings

Find every caller of what you are about to change. A guard in one shared place beats a patch on the one path I happened to notice, and leaves no siblings broken. Say what else you found.

### 4. Fix the cause, not the symptom

No nil-check that silences a crash without explaining it. No `try/catch` that swallows the thing you were supposed to fix.

If the honest answer is "this is not a code bug" — stale local state, expected behavior, my misunderstanding — **say that**. That is a valid, valuable outcome. Do not manufacture a change to look productive.

### 5. Lock it in so it cannot come back silently

Then, and only then, touch the verification map:

- If the feature file's stated behavior was **right** and the code was wrong: leave the file alone. The fix makes the existing check pass.
- If the file was **silent** on this: add a step or a `Gotchas` line so the next run catches it.
- If the file was **wrong**: correct it, and say in the PR that the spec changed and why.

**Never rewrite a step so it passes against behavior you just found broken.** A check quietly re-pointed at a bug reports green forever, and whoever later fixes the bug gets told they caused a regression.

If you are not fixing it this run: leave the step stating the intended behavior, mark it `**Currently broken**`, describe the observed behavior and date in `Gotchas`, and report it as a **failure** every run until fixed. A known defect stays a failing check. It never becomes the new expectation.

### 6. Prove the fix

Drive the feature file's steps and show the check that used to fail now passing, with evidence in `artifacts/`. Then clean up:

```powershell
node .claude/skills/verify-mila/control-mila.mjs session --clear
$mila = (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess | Select-Object -Unique
if ($mila) { taskkill /PID $mila /T /F }
```

## Guardrails

`npm run dev` talks to the **live** Supabase project.

- Diagnose read-only. Never submit a mutating control, and never request the billable routes (`/api/blog/<slug>/audio`, `/api/chat-stream`, `/api/chatkit/session`).
- If reproducing the bug genuinely requires a write to live data, **stop and tell me.** Do not decide that alone.
- For database or migration logic, the offline checks reproduce without touching Supabase: `node scripts/check-monthly-workflow.mjs`, `node scripts/check-prepare-milas-month.mjs`.

## Definition of done

- [ ] Reproduced first-hand, environment named
- [ ] Cause proven against the real artifact, not inferred
- [ ] Every caller of the changed code checked for the same bug
- [ ] Root cause fixed, not the symptom — or an honest "not a code bug"
- [ ] The verification map catches it next time
- [ ] No check rewritten to match broken behavior
- [ ] Fix driven, evidence captured
- [ ] `npm run lint` and `npx tsc --noEmit` clean
- [ ] Session cleared, dev server stopped

---

## The bug

<!-- What did you see, where, and what did you expect instead? -->
