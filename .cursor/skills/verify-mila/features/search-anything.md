# Search anything

A signed-in visitor who opens `/` gets a full-screen, zoomable atlas of every photo of Mila instead of the carousel: the monthly journey photos, the sonograms, the baby shower and gender reveal galleries, the photos shown inside letters, and the fourteen homepage photos, laid out as a tidy grid of large rounded glass tiles on Mila's light pink background, in a fresh random order on every visit. The tiles look like thick glass: photos bend near the rounded edges, catch a highlight along their rims, and at every zoom level the grid curves away toward the edges of the screen as if lying on a globe, with tiles near the edges smaller and turned away. Typing words such as "beach" or "birthday cake" into the glass search bar floating at the bottom of the screen lights up the matching photos where they sit, dims everything else, and flies the view to the best match. An **Include letters** switch adds matching monthly letters to the results as letter cards. Tapping any photo opens a large viewer with Previous and Next and a link to where that photo lives. Signed-out visitors still get the original carousel.

## Sub-features

- `atlas-signed-in` shows the atlas at `/` for any signed-in visitor, in place of the carousel. The atlas fills the whole window: the footer is hidden and the site menu floats over it as a glass pill (see [site chrome](./site-chrome.md)).
- `atlas-every-photo` places one tile for every indexed photo from all six photo collections.
- `atlas-random` lays the tiles out as a tidy grid in a new random order on each visit, and opens zoomed in on a random spot showing about a dozen photos.
- `atlas-glass` draws each tile as 3D glass with WebGL: edge refraction, a glossy highlight, a bright rim, and a soft shadow, on a light pink background. A browser without WebGL 2 sees "This browser can't show Mila's memories. Try the latest Chrome, Safari, or Edge." instead of the atlas.
- `atlas-pan-zoom` pans on drag and zooms on scroll or pinch, with **Zoom in**, **Zoom out**, and **Reset view** buttons for keyboard users.
- `atlas-wrap` has no edges: panning past the last column or row continues from the first, in every direction.
- `atlas-globe` curls the grid into a globe of photos as you zoom out past the whole grid, and unrolls it as you zoom back in. The globe spins slowly on its own, a drag spins it by hand, and it resumes spinning a moment after you let go. **Reset view** flies out to the globe. Tapping a photo on the globe opens it, and search highlights show on the globe too.
- `search-box` accepts typed words in a field labelled `Search Mila's memories`, inside a glass search bar floating at the bottom centre of the atlas.
- `search-highlight` highlights matching photos in place, dims the rest, flies the view to the best match, and announces how many matched.
- `search-waking` shows "Waking up Mila's memory…" while the first search after a quiet spell is slow.
- `search-no-match` says "No close matches. Try different words." when nothing is similar enough.
- `search-clear` restores the full atlas with **Clear**.
- `search-letters` adds matching published letters as letter cards when **Include letters** is on, in the places of dimmed photos nearest the best match. Off by default, and letters never appear in the atlas without a search.
- `search-letter-open` opens the letter at `/blogs/<slug>` when a letter card is chosen.
- `viewer-open` opens a tapped photo in a large viewer titled `Photo viewer`.
- `viewer-paging` moves through the current matches with **Previous** and **Next**, or through every photo when nothing is searched.
- `viewer-source` links to where the photo lives: the month's journey card, the sonogram, the baby shower or gender reveal page, or the letter that shows it. Homepage photos, months without a journey card, and letter photos no letter uses have no link.
- `search-gate` rejects an anonymous search request with 401.

## How to get to it (user POV)

- Sign in, then open `http://127.0.0.1:3000/`.
- Choose the Mila brand image at the top left of any page while signed in.
- Sign in from the home page; the sign-in callback returns to `/`.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0. A signed-in Chrome is needed for every atlas and viewer step. `session` is needed for the headless search read.
- The search index must already hold photos. If **Build search index** has never been run, the atlas is empty and says so — see [search index](./search-index.md).
- Searching is a read and costs nothing per call, but the first search after the server has been idle can take 10–20 seconds.
- Use a desktop viewport. The atlas fills the space between the nav and the footer.

- **Prove the gate.** Run `node .cursor/skills/verify-mila/control-mila.mjs get "/api/search?q=beach" --expect-unauthorized --save search-anything/anonymous`. It returns `401` with `{"error":"Sign in to continue."}`.
- **Prove signed-out `/` is unchanged.** Run `node .cursor/skills/verify-mila/control-mila.mjs get / --save search-anything/home-anonymous`. Status is `200` and the body still holds 14 `carousel-item`s, exactly as in [home landing](./home-landing.md).
- **Search headlessly.** Run `node .cursor/skills/verify-mila/control-mila.mjs session`, then `... get "/api/search?q=sonogram" --as-admin --save search-anything/search-sonogram`. Status is `200 OK` with JSON whose `results` array is ordered best match first. Each item carries `kind` (`photo`), a `url`, a `collection` (`journey`, `sonograms`, `baby-shower`, `gender-reveal`, `letter-photos`, or `homepage`), and a `score`. The top results are from the `sonograms` collection. Repeat with `&letters=1` and confirm items with `kind` `letter` may now appear, each with a `slug` and `title`. With letters off, no item has `kind` `letter`.
- **Open the atlas.** In a signed-in tab, open `/`. The carousel is gone. A region labelled `Mila's memories atlas. Drag to explore, scroll or pinch to zoom.` fills the page, with a grid of rounded glass photo tiles on a light pink background, and a glass search bar at the bottom centre holding the field labelled `Search Mila's memories` and the **Include letters** switch.
- **Check the opening view.** Open `/`. The atlas starts zoomed in, with roughly 10–15 photos filling the view.
- **See the globe.** Choose **Reset view**. The view flies out and the grid curls into a globe of photo tiles on the pink background, spinning slowly. Drag across it; it spins with the pointer, then resumes on its own. Choose a photo on the globe; the `Photo viewer` opens with that photo. Scroll to zoom in; the globe unrolls into the flat grid around the spot that was facing you.
- **Check the arrangement is random.** Reload. The opening view lands on a different spot and the photos are in a different order.
- **Check the curve.** At the opening zoom and again zoomed in until a few tiles fill the screen, tiles at the left, right, top, and bottom edges are visibly smaller than those in the middle and turned away from you, like the surface of a globe; the middle tiles face you squarely.
- **Check the glass.** Zoom in until a few tiles fill the screen. Each tile has rounded corners, a photo that bends slightly near its edges with faint colour fringes, a glossy highlight, and a soft shadow on the pink background.
- **Pan and zoom.** Drag inside the atlas; the tiles move with the pointer. Scroll to zoom in and out. Choose **Zoom in** and **Zoom out**.
- **Wrap around.** Zoom in, then keep dragging in one direction well past the width of the grid. Photos keep coming with no edge or gap, and the photos you started on come round again.
- **Search.** Type `sonogram` in the search field and press Enter. If the server was idle, "Waking up Mila's memory…" shows first. Then the sonogram images stay bright, the rest dim, the view moves to the best match, and a status line reads `N matches`.
- **Check no-match copy.** Search for `zzqx`. The status reads "No close matches. Try different words." and nothing is highlighted.
- **Clear.** Choose **Clear**. Every tile returns to full brightness and the view resets.
- **Include letters.** Turn on the **Include letters** switch, then search `first birthday`. Letter cards showing a title, a month, and the letter's featured image appear among the highlighted photos, each in the place of a dimmed photo. Turn the switch off; the letter cards disappear. With the search cleared, no letter cards are present whether or not the switch is on.
- **Open a letter.** With letters included, choose a letter card. The route becomes `/blogs/<slug>` and that letter renders.
- **Open the viewer.** Choose any highlighted photo. A dialog titled `Photo viewer` shows it large. **Previous** and **Next** step through the current matches in ranked order.
- **Follow the source link.** For a monthly photo the viewer shows a link to its month. Choose it and the route becomes `/my-journey/<section>/<slug>`, the journey card that holds that photo. For a sonogram the link goes to `/sonograms/<id>`. For a letter photo it reads **Go to the letter** and goes to `/blogs/<slug>`.
- **Close the viewer.** Choose its close control or press Escape. Focus returns to the tile that opened it.
- **Proof.** Screenshot the full atlas, a search with highlights and the match count, a search with letter cards included, and the open viewer with its source link. Save the anonymous `401`, the anonymous `/` body, and the headless search JSON.

## Gotchas

- **Never assert a tile's position.** The arrangement reshuffles on every visit, the grid wraps, and the globe spins, all by design. Assert tile counts, highlight state, and the match count instead.
- The atlas is drawn with WebGL into a single canvas, so tiles are not DOM elements. Assert them through screenshots, the match count, and the keyboard-reachable match buttons, not by querying for tile elements.
- Headless Chrome renders WebGL in software. It works but is slow, so give the first frame a few seconds before screenshotting.
- The atlas, its tiles, and the search results are built in the browser. `GET /` as admin returns server HTML without them — assert the atlas in Chrome only.
- The first search after an idle spell is slow because the server has to load the search model. Wait for the waking message to clear before calling a search broken. A second search right after should return within a couple of seconds.
- An empty atlas with the message pointing to **Build search index** means nothing has been indexed yet. That is missing data, not a broken atlas.
- A photo uploaded but never indexed is not in the atlas. New uploads are indexed automatically while the uploader runs, so check [search index](./search-index.md) before reporting a missing photo.
- Letters only appear while a search is active and **Include letters** is on. Draft letters are never searchable.
- Videos are not part of this feature yet. They arrive with the video upload tool and a later search update.
- The photo links are Storage's public URLs, the same as the existing galleries. The page is private; the image files are not.
