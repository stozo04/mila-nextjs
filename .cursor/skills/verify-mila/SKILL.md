---
name: verify-mila
description: Drive the Mila Next.js + Supabase family blog web UI like a user: launch, doctor, exercise mapped features, capture evidence. Use when proving UI behavior, checking a change, or running /maintain-verification-skill.
---

# Verify Mila Family Blog

This skill drives the Mila Next.js + Supabase family blog like a user would: launch the dev server on an isolated port, run health checks, exercise mapped features through the browser, capture evidence (screenshots + ARIA snapshots), and clean up. Use this to prove UI behavior, verify changes, or test the full user experience end-to-end.

## Surface

**What**: Next.js 16 App Router + Supabase family blog with:
- Public landing page (image carousel)
- Google OAuth authentication via Supabase
- Protected routes: blogs, sonograms, baby shower galleries, journey cards (milestones)
- OpenAI ChatKit embed (when env vars present)
- Privacy policy page

**Target audience**: Family members (authenticated via Google)

**Primary UI**: Web browser at http://localhost:3010 (isolated port)

## Run

**Prerequisites**:
- Node 22.x (verified: `node -v` should show `v22.x`)
- Dependencies installed (`npm install`)
- Minimum env vars in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Optional env vars** (for full feature coverage):
- `OPENAI_API_KEY`, `OPENAI_CHATKIT_WORKFLOW_ID`, `OPENAI_VECTOR_STORE_ID`, `OPENAI_MODEL` (for ChatKit)
- `SITE_URL` (defaults to localhost)

**Start command**: `npm run dev -- --port 3010`

**Logs**: Captured in `/tmp/verify-mila/dev-server.log`

**PID tracking**: Stored in `/tmp/verify-mila/dev-server.pid`

## Drive

**Harness**: Playwright (installed locally under `.cursor/skills/verify-mila/node_modules` — isolated from product code)

**Why Playwright**: 
- Browser automation with real Chromium
- ARIA snapshot support for accessibility verification
- Screenshot capture for visual evidence
- No product code pollution

**Installation**: Run `helpers/install-playwright.sh` before first use

**Feature map**: See `features/` directory for detailed user flows

## Observe

**Evidence location**: `/tmp/verify-mila/evidence/`

**Artifacts**:
- `screenshots/<feature>-<timestamp>.png` — Visual proof of rendered UI
- `aria-snapshots/<feature>-<timestamp>.txt` — Accessibility tree for element verification
- `http-logs/<feature>-<timestamp>.json` — Network requests/responses (if captured)
- `console-logs/<feature>-<timestamp>.txt` — Browser console output

**Retention**: Evidence persists after cleanup (only the dev server and helpers are stopped)

## Isolate

**Port**: 3010 (avoids collision with user's dev server on 3000)

**Documented in**:
- This SKILL.md
- Feature map README
- Helper scripts (`helpers/launch.sh`, `helpers/doctor.sh`)

**Cleanup**: `helpers/cleanup.sh` stops only the dev server started by this skill (PID-tracked), does NOT delete evidence

## Launch

To start the dev server:

```bash
bash .cursor/skills/verify-mila/helpers/launch.sh
```

This script:
1. Checks Node version (must be 22.x)
2. Verifies `package.json` exists
3. Creates `/tmp/verify-mila/` directory
4. Starts `npm run dev -- --port 3010` in background
5. Writes PID to `/tmp/verify-mila/dev-server.pid`
6. Logs to `/tmp/verify-mila/dev-server.log`
7. Waits for "Local:" or "Ready" in logs (up to 60s)

**Exit codes**:
- `0`: Server started successfully
- `1`: Node version mismatch, package.json missing, or timeout

## Doctor

Health checks before driving features:

```bash
bash .cursor/skills/verify-mila/helpers/doctor.sh
```

This script verifies:
1. **Dev server running**: PID file exists and process is alive
2. **Port 3010 responsive**: HTTP GET to `http://localhost:3010` returns 200
3. **Environment variables**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
4. **Playwright installed**: `node_modules/.bin/playwright` exists in helpers directory

**Exit codes**:
- `0`: All checks passed
- `1`: Any check failed (prints diagnostic message)

## Drive

Run the main verification:

```bash
bash .cursor/skills/verify-mila/helpers/drive.sh <feature-id>
```

**Arguments**:
- `<feature-id>`: Feature identifier from `features/` map (e.g., `home`, `login`, `privacy-policy`, `blogs-list`, `journey-cards`)

**What it does**:
1. Runs the Playwright script for the specified feature (e.g., `features/home.spec.ts`)
2. Captures screenshots at key steps
3. Records ARIA snapshots for verification
4. Logs browser console output
5. Saves all evidence to `/tmp/verify-mila/evidence/`

**Exit codes**:
- `0`: Feature verification passed
- `1`: Feature verification failed (check evidence for details)

**Available features**: See `features/README.md` for the complete list and how to add new ones.

## Evidence

After driving features, evidence is organized:

```
/tmp/verify-mila/evidence/
├── screenshots/
│   ├── home-20260902-174530.png
│   ├── login-20260902-174545.png
│   └── privacy-policy-20260902-174600.png
├── aria-snapshots/
│   ├── home-20260902-174530.txt
│   └── privacy-policy-20260902-174600.txt
└── console-logs/
    ├── home-20260902-174530.txt
    └── login-20260902-174545.txt
```

**Retention**: Evidence survives cleanup (only dev server is stopped)

**Reporting**: When verifying a change, include screenshots and relevant ARIA snapshots in PR description or summary

## Cleanup

Stop the dev server and Playwright processes:

```bash
bash .cursor/skills/verify-mila/helpers/cleanup.sh
```

**What it does**:
1. Reads PID from `/tmp/verify-mila/dev-server.pid`
2. Sends `SIGTERM` to dev server process
3. Waits up to 10s for graceful shutdown
4. Removes PID file
5. **Does NOT delete evidence** in `/tmp/verify-mila/evidence/`

**Exit codes**:
- `0`: Cleanup successful (or no server was running)
- `1`: Failed to stop server (manual intervention required)

## Helpers

All helper scripts are in `helpers/` and are executable:

1. **`install-playwright.sh`**: One-time setup to install Playwright locally
   - Installs `playwright` + `@playwright/test` into `helpers/node_modules/`
   - Runs `npx playwright install chromium`
   - Exit code 0 on success

2. **`launch.sh`**: Start dev server on port 3010 (see Launch section)

3. **`doctor.sh`**: Run health checks (see Doctor section)

4. **`drive.sh <feature-id>`**: Drive a specific feature (see Drive section)

5. **`cleanup.sh`**: Stop dev server (see Cleanup section)

**All helpers use the local Playwright**: `helpers/node_modules/.bin/playwright`

**All helpers log to**: `/tmp/verify-mila/<helper-name>.log` (in addition to stdout)

## Feature Map

See `features/README.md` for:
- Baseline preconditions (env vars, auth state)
- Driving conventions (element selectors, waits)
- Proof/skip reporting
- Feature index with links to individual feature files

Each feature file (e.g., `features/home.md`) includes:
- **Sub-features**: What can be tested within this feature
- **How to get to it (user POV)**: Entry points from user's perspective
- **Driving it with Playwright**: Specific commands, selectors, assertions
- **Gotchas**: Known issues, flaky selectors, timing dependencies

## Maintenance

When product code changes:
1. Update feature files if routes, selectors, or flows change
2. Re-run verification to ensure features still work
3. Update this SKILL.md if isolation strategy or harness changes

When adding new features:
1. Create new feature file in `features/` (follow existing format)
2. Add entry in `features/README.md` index
3. Write corresponding `features/<feature-id>.spec.ts` Playwright script
4. Test end-to-end with `helpers/drive.sh <feature-id>`

## Quick Start (from scratch)

```bash
# 1. Install Playwright locally
bash .cursor/skills/verify-mila/helpers/install-playwright.sh

# 2. Ensure minimal env vars are set
# (Agent: check .env.local or set NEXT_PUBLIC_SUPABASE_* from available secrets)

# 3. Launch dev server
bash .cursor/skills/verify-mila/helpers/launch.sh

# 4. Run doctor checks
bash .cursor/skills/verify-mila/helpers/doctor.sh

# 5. Drive a public feature (e.g., home page)
bash .cursor/skills/verify-mila/helpers/drive.sh home

# 6. Check evidence
ls -lh /tmp/verify-mila/evidence/screenshots/

# 7. Clean up
bash .cursor/skills/verify-mila/helpers/cleanup.sh
```

## Skill Invocation

This skill is invoked when:
- User asks to "verify the UI" or "test the app"
- User requests proof that a change works
- User asks to "run verification"
- User mentions `/verify-mila` explicitly
- User asks to "check if the site still works"

**Do not invoke for**:
- Unit tests (use Jest/Vitest)
- API-only verification (use curl or HTTP clients)
- Backend logic testing (use product test suites if they exist)
