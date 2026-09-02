# Feature prompt

Paste this to an agent when you want to build something new, with your feature described at the bottom.

---

## The one rule

**Write the spec before the code.**

`.claude/skills/verify-mila/features/` is a specification of what this site *should* do — not a description of what it currently does. Written first, it says what "done" means before anyone is attached to code they already wrote. Written afterwards, it is just a summary of whatever got built, bugs included.

Everything below follows from that.

## Steps

### 1. Write the feature file first

Create `.claude/skills/verify-mila/features/<feature>.md` **before writing any application code**, following the contract in [`features/README.md`](.claude/skills/verify-mila/features/README.md): an H1, one paragraph, then exactly four H2s — `Sub-features`, `How to get to it (user POV)`, `Driving it with control-mila`, `Gotchas`.

Answer these from the user's point of view:

- What can a person now do that they couldn't before?
- Every way they reach it — nav item, direct URL, a link from elsewhere.
- What observable end state proves it worked? Not "the function returns true" — what the person sees.
- What could a verification run get wrong here?

Add it to the index in `features/README.md` under the right group.

**Stop and show me this file before writing code.** If the spec is wrong, everything after it is wrong too, and this is the cheapest moment to catch that.

### 2. Decide the tier

- Touches auth, a route, or an API → **tier 1/2**, provable in seconds, no browser.
- Something a person looks at → **tier 3**, real browser.
- Both → both.

Write the driving steps accordingly. Tier 1/2 steps are exact `control-mila.mjs` commands. Tier 3 steps name accessible names and stable handles.

### 3. Build it

### 4. Drive it

```powershell
npm run dev
node .claude/skills/verify-mila/control-mila.mjs doctor          # must exit 0
node .claude/skills/verify-mila/control-mila.mjs session         # if signed-in paths are involved
```

Then run the feature file's own steps, top to bottom, and capture evidence to `artifacts/<feature>/`.

**If reality disagrees with the spec, fix the code.** Change the spec only if I decide the intended behavior was wrong — that is a product decision, not something to settle by observation. See [BUG-PROMPT.md](BUG-PROMPT.md) when the disagreement is a defect.

### 5. Verify against the real artifact

Read the DOM, not a summary of it. Check the actual value, the actual row, the actual rendered pixel. A passing proxy is not a passing feature — an accessibility-tree read once reported an empty menu that the DOM showed as two visible links, and a confident wrong conclusion went into a document.

### 6. Clean up

```powershell
node .claude/skills/verify-mila/control-mila.mjs session --clear
$mila = (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess | Select-Object -Unique
if ($mila) { taskkill /PID $mila /T /F }
```

Evidence in `artifacts/` survives cleanup. It is the proof.

## Guardrails — this repo has no test database

`npm run dev` talks to the **live** Supabase project. Real letters, real photos, real journey cards.

- **Never submit a mutating control.** Create Blog, Create Journey Card, Publish Letter, image-role buttons, the JPEG uploader, Prepare Mila's Month. Verify them by presence, by correct role gating, and by confirming the endpoint returns 401 to an anonymous caller.
- **Never request** `/api/blog/<slug>/audio`, `/api/chat-stream`, `/api/chatkit/session`. Each costs money on a single call. The harness refuses them.
- `--as-admin` is read-only and refuses every non-GET. Do not work around it.
- If a new feature genuinely needs a write to be verified, **say so and stop.** That is a conversation about a staging project, not something to decide mid-run.

## Definition of done

- [ ] Feature file written **before** the code, and reviewed
- [ ] Listed in `features/README.md`
- [ ] `doctor` exits 0
- [ ] Every step in the feature file driven, evidence in `artifacts/`
- [ ] Tier 3 run for anything with a screen
- [ ] Any check that fails is reported as failing — never rewritten to pass
- [ ] Mutating controls verified by presence + 401, and the PR says so explicitly
- [ ] `npm run lint` and `npx tsc --noEmit` clean
- [ ] Session cleared, dev server stopped

---

## The feature

<!-- Describe it here. What should a person be able to do, and why? -->
