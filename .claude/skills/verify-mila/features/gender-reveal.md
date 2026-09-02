# Gender reveal

A single dated page for the January 21, 2023 gender reveal party: a YouTube embed of the reveal above a photo grid loaded from Supabase Storage three at a time, with a lightbox on each photo.

## Sub-features

- `reveal-header` shows "Gender Reveal Party" and the date "January 21, 2023".
- `reveal-video` embeds the reveal video in a 16:9 frame.
- `reveal-grid` lists photos from the `gender-reveal` folder of `mila_storage_bucket`, three at a time, sorted by name.
- `reveal-paging` appends the next three photos per **View More** press.
- `reveal-lightbox` opens a clicked photo full-size and closes it via the corner control or the backdrop.

## How to get to it (user POV)

- Choose **Gender Reveal** in the top nav.
- Open `http://127.0.0.1:3000/gender-reveal` directly.
- Follow the legacy bookmark `/gender-reveal.html`, which 308s here.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0 and a signed-in session is available (`session` for requests, Chrome for rendered UI).
- Reads Supabase Storage. Read-only — the page has no upload or delete control.

- **Confirm the gate.** Open `/gender-reveal` signed out. Run `node .claude/skills/verify-mila/control-mila.mjs get /gender-reveal --save gender-reveal/anonymous`. Status is `307` with `location: /login`.
- **Confirm the legacy redirect.** Run `node .claude/skills/verify-mila/control-mila.mjs get /gender-reveal.html`. Status is `308 Permanent Redirect` with `location: /gender-reveal`.
- **Load the page.** In a signed-in tab, open `http://127.0.0.1:3000/gender-reveal`. The header reads `Gender Reveal Party` on the left and `January 21, 2023` on the right.
- **Confirm the video frame.** A YouTube iframe titled `Gender Reveal` renders above the grid in a 16:9 container. Assert the frame's presence and title. Do not play it.
- **Confirm the first page of photos.** Three photo cards render below the video once the Storage list resolves.
- **Page the grid.** Choose **View More**. Three more photos append, for six total. Repeat once more and confirm nine.
- **Open the lightbox.** Choose any photo. A centered modal shows it full-size with a close control at the top right. Choose the close control, then reopen and click the dark backdrop. Both dismiss it.
- **Proof.** Screenshot the page showing the header, the video frame, and the grid after one paging press. Record how many photos were visible before and after.

## Gotchas

- **View More never stops.** Unlike the shared gallery, this page has no `hasMore` guard: the button is always enabled and each press raises the offset by three. Past the end of the folder, Storage returns an empty list and pressing it does nothing visible. That is not a hang — check the photo count before reporting.
- Photos come from the live bucket, so the count is whatever is in Storage today. Never hardcode an expected total; assert that a press adds up to three more.
- The page builds its image URLs from a **hardcoded CDN string** containing the Supabase project ref, rather than from `NEXT_PUBLIC_SUPABASE_URL` or the storage client. Pointing the app at a different project leaves this page loading images from the original one.
- Photos are deduplicated by filename across pages, so a duplicate name in Storage silently reduces the visible count below three.
- React Strict Mode double-invokes effects in dev; the page guards against that with a fetched-offsets set. A missing page of photos after a fast double-press is that guard, not a lost request.
- The lightbox here is hand-rolled markup, not the `react-bootstrap` modal used by the shared gallery. It has no `role="dialog"` and no Escape handler, so a keyboard-only close is unavailable. Drive it by clicking.
