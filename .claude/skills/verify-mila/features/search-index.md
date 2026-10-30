# Search index

Steven's tool for keeping [search anything](./search-anything.md) complete. An admin page shows how many photos and letters in each collection are searchable and indexes the rest in his own browser on **Start indexing**, with live progress, and picks up where it left off if it is paused or closed. Photos uploaded through a journey card's uploader are indexed right after they upload, so the page is only needed for catching up and for repairs.

## Sub-features

- `index-entry` shows a **Build search index** link in the admin banner, admin only.
- `index-counts` lists each collection — Monthly journey, Sonograms, Baby shower, Gender reveal, Homepage, Letters — with `Indexed X of Y`.
- `index-run` indexes everything not yet indexed on **Start indexing**, announcing `Indexing N of M`. Mutating — presence only.
- `index-pause` stops after the current item on **Pause**. The next **Start indexing** carries on with what is left.
- `index-cleanup` removes items whose photo has been deleted or whose letter was unpublished, and reports `Removed N`.
- `index-letters` re-indexes a letter whose text changed since it was last indexed.
- `index-browser-check` says "This browser can't build the index. Use Chrome on your computer." when the browser can't run the model, with **Start indexing** disabled.
- `index-on-upload` indexes photos right after they upload on a journey card and reports it in the upload status. Mutating — presence only.
- `index-gate` sends anonymous visitors to sign-in, shows non-admins "Only Steven can build the search index.", and rejects anonymous index writes with 401.

## How to get to it (user POV)

- Sign in as Steven and choose **Build search index** in the admin banner above the nav.
- Open `http://127.0.0.1:3000/admin/search-index` directly.
- Upload photos on any journey card; indexing runs on its own after the upload.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0. The page and the uploader need the admin account in a signed-in Chrome, on a desktop with WebGPU.
- **Start indexing writes to the live search index, and the uploader writes to live Storage. Never press either.** Verify the counts, the controls, and the guards only.

- **Prove the page gate.** Run `node .claude/skills/verify-mila/control-mila.mjs get /admin/search-index --save search-index/anonymous`. Status is `307` with `location: /login`.
- **Prove the write guard.** Run `node .claude/skills/verify-mila/control-mila.mjs get /api/search/index --method POST --body '{}' --expect-unauthorized`. It returns `401` with `{"error":"Sign in to continue."}` before anything is written.
- **Read the counts headlessly.** Run `node .claude/skills/verify-mila/control-mila.mjs session`, then `... get /api/search/index --as-admin --save search-index/status`. Status is `200 OK` with one entry per collection, each carrying `indexed` and `total`. Letters count only published letters.
- **Find the entry point.** In the admin tab, the banner labelled `Mila's monthly preparation` holds a **Build search index** link beside **Prepare Mila's Month**. In a non-admin signed-in tab, the banner is absent.
- **Open the page.** Choose **Build search index**. The route becomes `/admin/search-index` and the heading reads `Search index`. Each of the six collections shows `Indexed X of Y`, and the numbers match the headless read.
- **Check the controls.** **Start indexing** is enabled when anything is left to index and disabled with "Everything is indexed." otherwise. **Do not press it.**
- **Check the non-admin view.** In a non-admin signed-in tab, open `/admin/search-index`. The page reads "Only Steven can build the search index." with no counts and no controls.
- **Check the uploader mentions indexing.** On any journey card in the admin tab, the help text under the uploader reads `JPEG only (.jpg or .jpeg) · up to 50 MB each · indexed for search after upload`. **Do not attach a file.**
- **Proof.** Screenshot the banner link, the page with all six counts, and the non-admin message. Save the anonymous `307`, the `401`, and the status JSON. State plainly that indexing and uploads were not run.

## Gotchas

- **There is no staging index.** Start indexing and the uploader both write to production, so they are verified by presence and guards only.
- Indexing runs in Steven's browser, not on the server. The first run downloads the photo model, roughly 100 MB, before **Indexing 1 of M** appears. A long first pause is the download, not a hang.
- Closing the tab mid-run loses nothing already indexed. Reopening the page shows the smaller remaining count, and **Start indexing** carries on from there.
- The Homepage and Sonograms collections are built into the site rather than uploaded, so their totals only change when the site's code changes.
- A count of `Indexed X of Y` where X is below Y after an upload means indexing failed or the tab was closed during it. Running the page catches it up. It is not a lost photo.
- `index-on-upload` adds a step after each upload. The upload counts in the status line are unchanged; the indexing result follows them.
