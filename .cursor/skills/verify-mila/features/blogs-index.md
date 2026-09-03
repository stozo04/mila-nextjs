# Blogs index

The letters index is a card grid of Mila's letters, newest first, with tag filter pills, a title search box, and a View More control that reveals three more at a time. Steven additionally sees a Create Blog button and a warning-bordered badge on any letter still in draft.

## Sub-features

- `blogs-grid` lists letter cards with featured image, title, and long-form date.
- `blogs-readmore` opens a letter from its **Read More** control.
- `blogs-tags` filters by tag pill, each showing its own count, with **All** selected by default.
- `blogs-search` narrows the grid by a case-insensitive substring of the title.
- `blogs-paging` reveals three more letters per **View More** press.
- `blogs-draft-badge` marks a draft letter with "Draft · Needs publishing" and a warning border, for the admin only.
- `blogs-create` shows the **Create Blog** button to the admin email only. Mutating — presence only.

## How to get to it (user POV)

- Choose **Blogs** in the top nav.
- Open `http://127.0.0.1:3000/blogs` directly.
- Return from a letter using the browser back control.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0 and a signed-in session is available (`session` for requests, Chrome for rendered UI). Every sub-feature below the gate check is tier 2.
- `blogs-draft-badge` and `blogs-create` additionally need the admin account.
- The live database currently holds 68 letters. Do not create, edit, or publish any of them here.

- **Confirm the gate.** Open `/blogs` signed out. Run `node .cursor/skills/verify-mila/control-mila.mjs get /blogs --save blogs-index/anonymous`. Status is `307` with `location: /login`.
- **Load the index.** In a signed-in tab, open `http://127.0.0.1:3000/blogs`. A loading state appears first, then a card grid. Three cards are visible before any paging.
- **Read the filter pills.** The pill row starts with **All** in the filled style and its total in parentheses, followed by one pill per distinct tag with that tag's count.
- **Filter by a tag.** Choose any tag pill other than All. The grid reloads showing only that tag's letters and the visible count resets to three. The chosen pill becomes filled and All becomes outlined.
- **Search by title.** Type a substring of a known letter title into the box placeheld `Search by title`. The grid narrows to matching titles. Clear the box; the full list returns.
- **Page the grid.** Choose **View More**. Three additional cards append. The control disappears once fewer letters remain than the visible count.
- **Open a letter.** Choose **Read More** on the first card. The route becomes `/blogs/<slug>` and the letter renders — continue in [blog letter](./blog-letter.md).
- **Check the admin controls.** In the admin tab, a green **Create Blog** button precedes the tag pills, and any draft letter's card carries a warning header reading `Draft · Needs publishing` with the line "Only you can see this letter." In a non-admin tab both are absent, and draft letters do not appear at all. **Do not open the Create Blog modal's submit path** — it writes to the live database.
- **Proof.** Screenshot the grid in the filtered and unfiltered states with the pill row visible, plus the saved anonymous-gate body.

## Gotchas

- Filtering, searching, and paging all refetch from Supabase rather than filtering in memory; each re-runs the query with a new `limit`. A slow network shows the previous grid until the new one lands.
- **Search and tag filter compose with the limit, not with each other's counts.** The pill counts come from a separate query over all letters and do not update when a search narrows the grid. A pill reading `(12)` next to three visible cards is expected.
- The **View More** control is shown whenever `blogs.length >= visibleCount`, so on an exact multiple of three it appears with nothing left to load. Pressing it then returns the same set. Do not report that as a paging bug without checking the total.
- Draft visibility is enforced by RLS, not by the client. A non-admin session receives no draft rows at all, so "the badge is missing" and "the letter is hidden" look identical from the grid.
- `Create Blog` is gated on `user.email === NEXT_PUBLIC_ADMIN_EMAIL`, a client-side comparison against a public env var — a different check from the `is_mila_admin` RPC used by the admin banner and every server route. They can disagree.
- The date under each title is parsed with `new Date(blog.date)` and rendered in the browser's locale and time zone. A UTC-midnight date can display as the previous day west of UTC. The letter detail page parses the same value differently — see [blog letter](./blog-letter.md).
