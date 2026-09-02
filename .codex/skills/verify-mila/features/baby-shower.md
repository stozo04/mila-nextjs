# Baby shower

Two dated gallery pages, Houston and Dallas, each a heading plus the shared photo gallery reading its own folder from Supabase Storage. They are the simplest use of the gallery component and the cleanest place to verify its paging and lightbox behavior.

## Sub-features

- `shower-nav` opens either city from the **Baby Shower** dropdown in the top nav.
- `shower-houston` shows the heading "Houston" and the date "May 15, 2023" over the `baby-shower/houston` folder.
- `shower-dallas` shows the heading "Dallas" and the date "May 15, 2023" over the `baby-shower/dallas` folder.
- `shower-grid` lists photos three at a time, sorted by name.
- `shower-paging` appends three more per **View More**, then settles on a disabled **No More Images**.
- `shower-lightbox` opens a photo full-size with an accessible close control and an Escape handler.

## How to get to it (user POV)

- Choose **Baby Shower** in the top nav, then **Houston** or **Dallas**.
- Open `http://127.0.0.1:3000/baby-shower/houston` or `/baby-shower/dallas` directly.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0 and a signed-in session is available (`session` for requests, Chrome for rendered UI).
- Reads Supabase Storage. Read-only — neither page has an upload control.

- **Confirm the gate.** Open a city signed out. Run `node .claude/skills/verify-mila/control-mila.mjs get /baby-shower/houston --save baby-shower/anonymous`. Status is `307` with `location: /login`.
- **Reach it from the nav.** In a signed-in tab, choose **Baby Shower**, then **Houston**. The route becomes `/baby-shower/houston` and the heading reads `Houston` on the left with `May 15, 2023` on the right.
- **Confirm the first page.** Three photo cards render once the Storage list resolves. Each card's image sits inside a button whose accessible name is `View photo <filename>`.
- **Page to the end.** Choose **View More** repeatedly. Each press appends up to three photos. When the folder is exhausted the control's text becomes **No More Images** and it is disabled — that is the terminal state, unlike the gender reveal page.
- **Watch the loading state.** While a page is in flight the control shows a spinner and reads `Loading...` and is disabled. Capture that state if paging is what you are verifying.
- **Open the lightbox.** Choose a photo card. A modal opens with the photo and a close control named `Close photo preview`, which takes focus automatically. Press `Escape`; it dismisses. Reopen and click the dark backdrop; it also dismisses.
- **Repeat for Dallas.** Choose **Baby Shower**, then **Dallas**. The heading reads `Dallas` with the same date, `May 15, 2023`; the folder differs, and the grid, paging, and lightbox behave identically.
- **Proof.** Screenshot each city's page after one paging press, plus the open lightbox with its close control visible.

## Gotchas

- `hasMore` is set when a page returns **fewer** items than the limit, so a folder whose photo count is an exact multiple of three needs one extra press — returning an empty page — before the control settles on **No More Images**. An apparently unresponsive press at the boundary is this.
- The gallery filters out `.emptyFolderPlaceholder` and any entry without an `id`, so the number of cards can be lower than the number of objects Storage returned for that page.
- A Storage failure renders an inline `Unable to load photos. Please reload the page.` alert above the grid rather than an empty state. Check for it before reporting "no photos".
- This is the same `Gallery` component the journey cards use, but here it is called **without** the admin props, so no upload panel, no Featured/Detail labels, and the plain lightbox instead of the `react-bootstrap` modal. Behavior verified here does not carry over to the admin variant — see [journey card](./journey-card.md).
- Photo URLs are built through the storage client's `getPublicUrl`, so they follow `NEXT_PUBLIC_SUPABASE_URL` correctly — unlike the gender reveal page's hardcoded CDN string.
- The bucket is public. A photo URL works without a session even though the page does not, so a passing image request is not evidence the gate is holding.
- **Both cities are dated `May 15, 2023`**, hardcoded separately in each page. That may be correct or may be a copy-paste from Houston; it is stated here so a run does not "discover" it every time. Do not change it during verification.
