# Feature Map: Mila Family Blog

This directory maps user-facing features for the Mila Next.js + Supabase family blog. Each feature file describes how to drive that feature through Playwright, including entry points, selectors, assertions, and gotchas.

## Baseline Preconditions

**Environment variables** (minimum for public pages):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key

**Optional** (for full coverage):
- `OPENAI_API_KEY`, `OPENAI_CHATKIT_WORKFLOW_ID` — For ChatKit embed
- `NEXT_PUBLIC_ADMIN_EMAIL` — Admin user identification

**Authentication**:
- **Public pages** (home, login, privacy-policy): No auth required
- **Protected pages** (blogs, sonograms, journey, etc.): Require Google OAuth via Supabase
  - Currently, automated auth is out of scope (requires real Google credentials)
  - Protected routes can be mapped but marked as `verified-unreachable` without manual login

**Dev server**: Running on port 3010 (`npm run dev -- --port 3010`)

## Driving Conventions

**Element selection** (priority order):
1. `data-testid` attributes (if present — add them if needed for stability)
2. ARIA roles and labels (`role="button"`, `aria-label="..."`)
3. Text content (`.getByText("exact text")`)
4. CSS selectors (last resort, brittle)

**Waits**:
- Use `page.waitForLoadState('networkidle')` after navigation
- Use `page.waitForSelector('selector', { state: 'visible' })` for dynamic content
- Avoid hard-coded `setTimeout` — prefer Playwright's built-in retry logic

**Assertions**:
- Check page URL: `expect(page).toHaveURL(/pattern/)`
- Check element visibility: `expect(locator).toBeVisible()`
- Check text content: `expect(locator).toContainText('expected')`
- ARIA snapshots: `const aria = await page.ariaSnapshot(); expect(aria).toContain('...')`

**Screenshots**:
- Capture at key steps: landing, after interaction, error states
- Naming: `<feature-id>-<step>-<timestamp>.png`
- Save to `/tmp/verify-mila/evidence/screenshots/`

**Console logs**:
- Listen to `page.on('console', msg => ...)` for errors/warnings
- Save to `/tmp/verify-mila/evidence/console-logs/<feature-id>-<timestamp>.txt`

## Proof/Skip Reporting

**Proof outcomes**:
- `verified-success` — Feature works as expected, evidence captured
- `verified-fail` — Feature broken, evidence shows failure
- `verified-unreachable` — Feature exists but requires auth/env not available
- `skipped` — Feature intentionally not tested (reason documented)

**Reporting format** (in evidence or summary):
```
Feature: <feature-id>
Outcome: <proof-outcome>
Evidence: <path-to-screenshot>, <path-to-aria-snapshot>
Notes: <any observations, flakes, or warnings>
```

## Feature Index

| Feature ID | Description | Route(s) | Auth Required | Status |
|------------|-------------|----------|---------------|--------|
| `home` | Landing page carousel | `/` (public) | No | ✅ Mapped |
| `login` | Google OAuth login page | `/login` | No | ✅ Mapped |
| `privacy-policy` | Privacy policy static page | `/privacy-policy` | No | ✅ Mapped |
| `blogs-list` | Protected blog listing with search/filter | `/blogs` | Yes | ✅ Mapped (auth-gated) |
| `journey-cards` | Journey milestones gallery | `/my-journey/first-year` | Yes | ✅ Mapped (auth-gated) |

### Feature Files

Each feature file follows this structure:

```markdown
# <Feature Name>

<One-paragraph description from user's perspective>

## Sub-features

- Sub-feature ID 1: Description
- Sub-feature ID 2: Description
- ...

## How to get to it (user POV)

- Entry point 1: Starting from...
- Entry point 2: Direct URL...

## Driving it with Playwright

### Preconditions
- <List any specific env vars, data setup, or state>

### Steps
1. **Step name**: `<playwright command>`
   - Observable result: <what user sees>
   - Assertion: `<expect statement>`
   
2. **Next step**: ...

### Evidence capture
- Screenshot: `<when-to-capture>`
- ARIA snapshot: `<elements-to-verify>`

## Gotchas

- Gotcha 1: Known timing issue, flaky selector, etc.
- Gotcha 2: ...
```

## Adding New Features

1. **Identify the feature**: Choose a user-facing flow (e.g., "Blog detail page")
2. **Create feature file**: `features/<feature-id>.md` (follow template above)
3. **Write Playwright spec**: `features/<feature-id>.spec.ts`
4. **Update this README**: Add entry to Feature Index table
5. **Test end-to-end**: Run `helpers/drive.sh <feature-id>` and verify evidence

## Maintenance

When product code changes:
- **Route changes**: Update "How to get to it" section
- **Selector changes**: Update "Driving it with Playwright" steps
- **New protected routes**: Add to index, mark auth requirement
- **Deprecated features**: Mark status as `⚠️ Deprecated` and document in Gotchas
