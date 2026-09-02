# Mila feature map

This directory is the maintained source for verifying the user-facing behavior of the Mila site. Read this index before driving the app, then use the matching feature file as the recipe. A proof that drives one convenient entry point is incomplete when the file lists others.

## Baseline preconditions

- Launch with `npm run dev` and drive `http://127.0.0.1:3000`. Run `node .claude/skills/verify-mila/control-mila.mjs doctor` and require exit 0 before driving anything.
- **The dev server talks to the live Supabase project.** There is no seed, no local Supabase, no staging project. Every drive is read-only.
- **Never submit a mutating control.** Create Blog, Create Journey Card, Publish Letter, "Use as featured image", "Use as detail image", the JPEG uploader, and "Create card and letter draft" are verified by presence, enablement, and anonymous rejection — never by clicking submit.
- **Never request `/api/blog/<slug>/audio`, `/api/chat-stream`, or `/api/chatkit/session`.** Each spends money on a single call; the audio route also bypasses RLS on the service-role key and writes `blog_audio`. `control-mila.mjs get` refuses all three.
- Three tiers. **Tier 1** is anonymous `control-mila.mjs get`. **Tier 2** is `session` plus `get --as-admin`, which mints a real admin session from `MILA_ADMIN_*` and drives signed-in requests unattended — gates, redirects, authorization, and server-rendered responses. **Tier 3** is `claude-in-chrome` against the user's signed-in Chrome, for anything the browser assembles after mount. A `200` from tier 2 proves authorization, not page content.
- **Signed-in drives are read-only.** `--as-admin` refuses every non-GET, and refuses to combine with `--expect-unauthorized`. Clear the session with `session --clear` when the run ends.
- Never drive an instance this run did not start, except an already-listening dev server that passes doctor — and then do not tear it down.
- Run every `control-mila.mjs` command from PowerShell. Git Bash mangles leading-slash arguments.

## Driving conventions

- Start every recipe from a freshly loaded page unless its preconditions say otherwise.
- Prefer accessible names, `id`s, and exact button text over CSS position. Stable handles are named per feature.
- Treat every command as literal. Keep quoted names, flags, and slugs unchanged.
- Run anonymous HTTP actions through `control-mila.mjs get`, and signed-in ones through `get --as-admin`.
- Prove a gate from **both** sides where you can: the same path anonymous and `--as-admin`. A `307 → /login` next to a `200 OK` is stronger evidence than either alone.
- Run browser actions through `claude-in-chrome`, starting with `tabs_context_mcp`.
- **Server HTML is not the rendered page.** The nav, galleries, blog list, journey cards, and chatbot all fetch after mount. Assert them in a browser, never from a saved body.

## This map is a specification, not a description

**When the app disagrees with a feature file, the default is that the app is wrong.** Fix the code. Only edit the file when a human decides the *intended* behavior changed — a product decision, not an observation.

Never rewrite a step so that it passes against behavior you just found broken. A check that has been quietly re-pointed at the bug will report green forever, and the person who later fixes the bug will be told they caused a regression.

When you find a defect you are not fixing in this run:

1. Leave the step stating the **intended** behavior.
2. Mark it `**Currently broken**` and describe the observed behavior in `Gotchas`, with the date and how you observed it.
3. Report it as a **failure** on every run until the code is fixed.

A known defect stays a failing check. It does not become the new expectation.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- Gate proof is the request plus the `location` header, both recorded.
- UI proof is a screenshot or accessibility snapshot with the app identity visible, plus the handle that was driven.
- Mutating-control proof is: the control is present and enabled for the right role, **and** its endpoint returns 401 to an anonymous caller. State plainly that the write path was not exercised.
- Record the feature ID and the entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition. Do not report a skipped entry point as verified through a different path.
- Tier-2 features reached with no signed-in Chrome are **skipped**, not failed.

## Full sweep

Unattended sweep (tiers 1 and 2), in order: `site-meta` → `sign-in` → `home-landing`, then the signed-in half of `sign-in` (every gated path re-driven with `--as-admin`, expecting `200`) and the authenticated reads in `prepare-month` and `journey-card`. That is the complete set provable with no browser, and it is the regression floor for any change to `src/proxy.ts`, `src/utils/supabase/middleware.ts`, `src/utils/supabase/server.ts`, `next.config.ts`, or the root layout.

Browser sweep (tier 3), in nav order: `site-chrome` → `sonograms` → `gender-reveal` → `baby-shower` → `blogs-index` → `blog-letter` → `journey-years` → `journey-card` → `chatbot`, then the admin pair `prepare-month` → `admin-password-setup`.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with control-mila` starts with `Preconditions:` and uses labeled bullets pairing each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

### Public surface (tier 1 — drivable now)

- [Home landing](./home-landing.md) covers the auto-playing photo carousel and the only two paths an anonymous visitor can load.
- [Sign in and route protection](./sign-in.md) covers Google OAuth, the OAuth callback, and the redirect gate on every protected and unknown path.
- [Site metadata](./site-meta.md) covers `robots.txt`, `sitemap.xml`, the privacy policy, legacy URL redirects, and the 404 page.

### Chrome

- [Site chrome](./site-chrome.md) covers the top nav, its auth-dependent menus, the admin banner, logout, and the footer.
- [Chatbot](./chatbot.md) covers the bottom-right chat launcher, the streaming reply, and the fresh-session reset.

### Letters

- [Blogs index](./blogs-index.md) covers the letter grid, tag filter pills, title search, View More paging, and the draft badge.
- [Blog letter](./blog-letter.md) covers a single letter, the Listen narration, the publish control for a draft, and the image lightbox.

### Galleries

- [Sonograms](./sonograms.md) covers the five-card index, the per-sonogram carousel, and Previous/Next paging.
- [Gender reveal](./gender-reveal.md) covers the embedded video, the Storage-backed photo grid, and its View More.
- [Baby shower](./baby-shower.md) covers the Houston and Dallas galleries reached from the nav dropdown.

### Journey

- [Journey years](./journey-years.md) covers the five fixed year pages, the dynamic later-year pages, and the Show More paging.
- [Journey card](./journey-card.md) covers a month's card page, its photo gallery, the admin JPEG uploader, and assigning a photo as a letter's featured or detail image.

### Admin

- [Prepare Mila's month](./prepare-month.md) covers the admin banner action, the month preview, and the create-card-and-draft submit.
- [Admin password setup](./admin-password-setup.md) covers the one-time page that adds a password to the admin account for the headless command.
