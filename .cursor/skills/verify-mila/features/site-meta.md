# Site metadata

The site ships crawler and legal surfaces around the app: a generated `robots.txt`, a two-entry `sitemap.xml`, a public privacy policy, five legacy URL redirects, and a 404 page with a Go Home control.

## Sub-features

- `meta-robots` serves `/robots.txt` disallowing the private sections and pointing at the sitemap.
- `meta-sitemap` serves `/sitemap.xml` listing `/` and `/privacy-policy` only.
- `meta-privacy` serves `/privacy-policy` publicly, with no session.
- `meta-redirects` 308s five legacy paths to their current routes.
- `meta-404` renders "Page Not Found" with a **Go Home** link for a signed-in visitor on an unknown path.
- `meta-title` sets the document title from the root template.

## How to get to it (user POV)

- Open `http://127.0.0.1:3000/robots.txt` or `/sitemap.xml` as a crawler would.
- Choose **Privacy Policy** in the footer, on any page.
- Follow a legacy bookmark: `/index.html`, `/gender-reveal.html`, `/my-journey/birthday/birthday.html`, `/my-journey/first-year/my-first-year.html`, or `/about/genealogy`.
- Choose **About Me** in the top nav, which is the `/about/genealogy` redirect.
- Open any unknown path while signed in.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0.
- `meta-404` needs a signed-in browser; every other sub-feature is tier 1.

- **Request robots as a crawler.** Open `/robots.txt`. Run `node .cursor/skills/verify-mila/control-mila.mjs get /robots.txt --save site-meta/robots-anonymous`. Observed result is `307 Temporary Redirect` with `location: /login` — **the file is not served to an anonymous client.** Record this; it is the expected-vs-actual finding for this feature.
- **Request the sitemap as a crawler.** Open `/sitemap.xml`. Run `node .cursor/skills/verify-mila/control-mila.mjs get /sitemap.xml --save site-meta/sitemap-anonymous`. Same result: `307` to `/login`.
- **Load the privacy policy.** Open `/privacy-policy`. Run `node .cursor/skills/verify-mila/control-mila.mjs get /privacy-policy --save site-meta/privacy-policy`. Status is `200 OK` and the body contains the policy text.
- **Follow each legacy redirect.** Run `node .cursor/skills/verify-mila/control-mila.mjs get /about/genealogy`. Status is `308 Permanent Redirect` with `location: /`. Repeat for `/index.html` → `/`, `/gender-reveal.html` → `/gender-reveal`, `/my-journey/birthday/birthday.html` → `/my-journey/birthday`, `/my-journey/first-year/my-first-year.html` → `/my-journey/first-year`.
- **Reach the 404 page.** Not drivable anonymously — the session gate turns every unknown path into a `307` before Next renders `not-found.tsx`. In a signed-in browser, open `http://127.0.0.1:3000/__no_such_page`; the page reads `Page Not Found` with a **Go Home** link. Skipped without a session.
- **Proof.** For the crawler surfaces, the proof is the status and `location` together, saved. State the expected value alongside the observed one.

## Gotchas

- **`robots.txt` and `sitemap.xml` are behind the login gate.** `src/app/robots.ts` and `src/app/sitemap.ts` are configured for search engines, but the matcher in `src/proxy.ts` excludes only `_next/static`, `_next/image`, `favicon.ico`, image extensions, and `api` — not these two. A crawler receives a redirect to `/login`. This is production behavior, not a dev-only artifact.
- The 404 page is effectively unreachable while signed out, so `meta-404` and the catch-all gate in [sign in](./sign-in.md) contradict each other by design. Verify each in its own session state.
- `/about/genealogy` is **not** a dead link even though no `src/app/about/` directory exists — it is a configured redirect in `next.config.ts`. Do not report it as a 404 without driving it.
- The privacy page emits a doubled title, `Privacy Policy | Mila Rose Gates | Mila Rose Gates`: its own metadata already contains the site name and the root template appends it again. The root layout also hardcodes a second `<title>` in `<head>`, so the served document contains two title elements. Assert on the page heading, not the title, until this is fixed.
- `robots.ts` and `sitemap.ts` hardcode `https://milagates.com` regardless of `NEXT_PUBLIC_SITE_URL`. A local drive still reports production URLs in the body — that is expected.
