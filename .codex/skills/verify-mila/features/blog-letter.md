# Blog letter

A letter renders as a dated note from Papa to Mila, with a **Listen** control that streams an AI narration of the text, an optional detail image, YouTube embed and photo gallery that open in a lightbox, and — for the admin on a draft — a **Publish Letter** button.

## Sub-features

- `letter-render` shows the greeting "My Precious Mila,", the formatted date, and the letter's HTML body.
- `letter-signoff` closes with "With all the love in the world," and "Your Papa".
- `letter-listen` requests narration and swaps the control for an audio player. Billable — presence only.
- `letter-listen-disabled` disables **Listen** on a draft or an empty letter.
- `letter-publish` shows **Publish Letter** for the admin on a draft, and hides it once published. Mutating — presence only.
- `letter-media` renders the detail image, a normalized YouTube embed, and any additional images.
- `letter-lightbox` opens a clicked image full-size and closes it via the corner control or the backdrop.
- `letter-missing` renders the 404 page for an unknown or invisible slug.

## How to get to it (user POV)

- Choose **Read More** on any card on the blogs index.
- Open `http://127.0.0.1:3000/blogs/<slug>` directly.
- Follow the redirect after preparing a month, which lands on the journey card rather than the letter — see [prepare month](./prepare-month.md).

## Driving it with control-mila

Preconditions:

- `doctor` exits 0 and a signed-in session is available (`session` for requests, Chrome for rendered UI).
- `letter-publish` needs the admin account **and** a letter currently in draft. Do not create one to test this.
- Pick a published letter slug from the index. Never invent a slug for a mutating check.

- **Confirm the gate.** Open a letter signed out. Run `node .claude/skills/verify-mila/control-mila.mjs get /blogs/any-slug --save blog-letter/anonymous`. Status is `307` with `location: /login`.
- **Open a published letter.** In a signed-in tab, choose **Read More** from the index. The page shows `My Precious Mila,`, a long-form date, the body, and the sign-off `Your Papa`.
- **Check the Listen control.** The control reads **Listen** with a play glyph and is enabled on a published letter with content. **Do not press it.** It calls `/api/blog/<slug>/audio`, which bills OpenAI TTS per uncached letter and writes a `blog_audio` row on the service-role key. Verify presence and enabled state only; `control-mila.mjs` refuses that route outright.
- **Check Listen is disabled where it should be.** On a draft, or a letter whose content is blank, the same control is disabled. Assert the disabled state rather than pressing.
- **Check the publish control.** In the admin tab on a draft letter, a green **Publish Letter** button sits above the greeting. On a published letter, and in any non-admin tab, it is absent. **Do not press it** — it flips `is_draft` on a live row. Prove the endpoint instead: `node .claude/skills/verify-mila/control-mila.mjs get /api/blog/test-slug/publish --method POST --expect-unauthorized` returns `401` with `{"error":"Sign in to continue."}`.
- **Open the lightbox.** Choose the detail image. A centered modal shows it full-size with a close control at the top right. Choose the close control; the modal dismisses. Choose the image again and click the dark backdrop; it also dismisses.
- **Check an unknown slug.** In a signed-in tab, open `/blogs/__no_such_letter`. The 404 page renders with **Go Home**.
- **Proof.** Screenshot the letter with the greeting, date, and Listen control visible; screenshot the open lightbox; save the anonymous-gate body. Record explicitly that narration and publishing were verified by presence and by anonymous rejection, not by exercising the write path.

## Gotchas

- **Never drive `/api/blog/<slug>/audio` directly.** It runs on `SUPABASE_SERVICE_ROLE_KEY`, so it bypasses RLS, and each uncached letter costs an OpenAI TTS call plus a `blog_audio` upsert. The harness refuses it; do not work around that.
- A long letter can exceed the audio route's time budget and return `202 {"pending":true}`; the client then polls every two seconds. A "nothing happened" report after pressing Listen may be this path, not a failure.
- A failed narration surfaces through a **native `alert()`**, which blocks browser automation entirely. If the tab stops responding to `claude-in-chrome`, this is the likely cause and the user must dismiss it manually. One more reason not to press Listen.
- Draft letters 404 for non-admins rather than showing a permission message: the client fetch uses `.single()`, RLS returns no row, and the page calls `notFound()`. "Letter not found" and "letter not visible to you" are indistinguishable from the UI.
- The date is parsed here by splitting the `YYYY-MM-DD` string into parts, unlike the index which passes the raw string to `new Date()`. The same letter can show a different day on the index than on its own page west of UTC.
- The letter body is raw HTML from the database rendered through `html-react-parser`. Assert on visible text, not on markup structure.
- `letter-publish` and the draft badge both depend on a draft existing. The live database had zero drafts at last documented count, so this sub-feature is normally unreachable — report it skipped rather than passed.
