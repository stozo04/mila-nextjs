# Sonograms

Five prenatal sonogram entries, each a card on an index page and a detail page with a three-image carousel, a description in Mila's voice, her gestational age, and Previous/Next controls that walk the series. The content is hardcoded in the source, not in Supabase.

## Sub-features

- `sono-index` lists five cards with image, title, and date under the heading "Welcome to the world, Mila!".
- `sono-open` opens a card's detail page at `/sonograms/<id>`.
- `sono-carousel` cycles three images per sonogram with Previous and Next controls.
- `sono-meta` shows the title, date, description, and an **Age** line.
- `sono-paging` shows **Previous** except on `1` and **Next** except on `5`.
- `sono-unknown` renders "Sonogram not found" for any other id.

## How to get to it (user POV)

- Choose **Sonograms** in the top nav.
- Open `http://127.0.0.1:3000/sonograms` directly.
- Open a specific entry at `http://127.0.0.1:3000/sonograms/3`.
- Walk the series with **Previous** and **Next** from any detail page.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0 and a signed-in session is available (`session` for requests, Chrome for rendered UI).
- No database state is involved; this feature is pure static content and is safe to drive fully.

- **Confirm the gate.** Open `/sonograms` signed out. Run `node .claude/skills/verify-mila/control-mila.mjs get /sonograms --save sonograms/anonymous`. Status is `307` with `location: /login`.
- **Load the index.** In a signed-in tab, open `http://127.0.0.1:3000/sonograms`. The heading reads `Welcome to the world, Mila!` and exactly five cards render, titled `Sonogram 1` through `Sonogram 5`.
- **Open an entry.** Choose the `Sonogram 3` card. The route becomes `/sonograms/3`, the heading reads `Sonogram 3`, the date reads `January 10, 2023`, and the **Age** line reads `19 weeks`.
- **Cycle the carousel.** Choose **Next** inside the image panel. The displayed image advances; three images exist per entry. Choose **Previous** to return.
- **Walk the series.** On `/sonograms/1`, only **Next** is present. Choose it repeatedly to reach `/sonograms/5`, where only **Previous** is present. Both controls appear on `2`, `3`, and `4`.
- **Check an unknown id.** Open `/sonograms/9`. The page reads `Sonogram not found`. It is a rendered message, not the site 404 page.
- **Proof.** Screenshot the index showing all five cards, and one detail page showing the title, date, Age line, and both paging controls. Artifacts go to `artifacts/sonograms/`.

## Gotchas

- **Sonogram 5's date disagrees between the two pages.** The index card says `May 10, 2023`; the detail page says `April 10, 2023`. Both are hardcoded, in two separate arrays in two files. Do not "fix" one during a verification run — report it.
- The five entries are duplicated as separate literals in `src/app/(protected)/sonograms/page.tsx` and `.../[id]/SonogramDetail.tsx`. Any content check must look at both, or a drift like the date above goes unnoticed.
- The detail page renders its own "Sonogram not found" text instead of calling `notFound()`, so an unknown id returns HTTP 200 with a message — not the 404 page from [site metadata](./site-meta.md). A status-code check passes where a content check should fail.
- The carousel autoplays via `data-bs-ride="carousel"`. Screenshots taken seconds apart show different images; assert the controls and metadata, not a specific image.
- Images are served from `/public/images/sonograms/...`, so this page works with Supabase entirely unavailable. It is the best smoke test for "is the app rendering at all" behind the gate.
- Both paging links are plain `Link`s built by incrementing the id string. There is no validation, so `/sonograms/6` renders the not-found message rather than redirecting.
