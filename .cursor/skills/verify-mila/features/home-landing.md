# Home landing

The home page is a full-bleed, auto-advancing carousel of fourteen photos of Mila with previous and next controls. It is one of only two paths an anonymous visitor can load; everything else redirects to sign-in.

## Sub-features

- `home-anonymous` loads at `/` with no session and returns 200.
- `home-carousel` renders all fourteen slides with the first marked active.
- `home-controls` advances and reverses through Previous and Next.
- `home-autoplay` advances on its own via Bootstrap's `data-bs-ride="carousel"`.
- `home-brand` shows the Mila brand image, which links back to `/`.

## How to get to it (user POV)

- Open `http://127.0.0.1:3000/` directly.
- Choose the Mila brand image at the top left of any page.
- Choose **Go Home** on the 404 page.
- Follow any legacy redirect listed in [site metadata](./site-meta.md), for example `/index.html` or `/about/genealogy`.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0.
- No signed-in session is required. This feature is fully drivable in tier 1.

- **Load the page anonymously.** Open `/`. Run `node .cursor/skills/verify-mila/control-mila.mjs get / --save home-landing/home`. Status is `200 OK`, content-type `text/html`, and no `location` header — the session gate does not fire here.
- **Confirm every slide shipped.** Count the slides in the saved body. Run `grep -o 'carousel-item' .cursor/skills/verify-mila/artifacts/home-landing/home.html | wc -l`. The count is `14`, matching the fourteen imports in `src/app/(public)/page.tsx`.
- **Confirm the first slide is active.** Search the same body for `carousel-item active`. Exactly one slide carries `active`.
- **Confirm the controls exist.** Search for the accessible names `Previous` and `Next`. Both appear as `visually-hidden` labels on the two carousel control buttons.
- **Advance the carousel (browser).** Choose **Next**. In `claude-in-chrome`, open `http://127.0.0.1:3000/`, then click the element with accessible name `Next`. The active slide changes to the following image.
- **Proof.** Screenshot the page with the brand visible and keep the saved body. Artifacts go to `artifacts/home-landing/`.

## Gotchas

- The images are Next.js static imports, so their URLs are content-hashed build output. Do not assert on `/images/landing-page/1.jpg`; assert on the slide count and the `active` slide.
- The carousel autoplays. A screenshot taken seconds apart shows a different photo — that is not a regression. Assert the slide count and the active-slide invariant, never a specific image.
- `/` and `/privacy-policy` are the **only** paths exempt from the session gate (`publicRoutes` in `src/utils/supabase/middleware.ts`). A new public page needs that list updated or it will silently redirect.
- The nav above the carousel is client-rendered and absent from the server HTML. `GET /` returns `navbar-brand` and zero `nav-item`s. Assert nav contents in a browser only — see [site chrome](./site-chrome.md).
- The page sets `overflow: hidden` and a flex height. A viewport shorter than the nav plus footer clips the carousel rather than scrolling; use a normal desktop viewport for screenshots.
