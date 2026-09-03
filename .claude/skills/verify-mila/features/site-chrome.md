# Site chrome

The top nav is the site's spine: it shows a brand image, a donate link, and — only once a Supabase session resolves — the section links, two dropdowns, and Logout. Signed-out visitors get a single Sign In control. Steven additionally gets an admin banner above the nav. A footer with a copyright line and a privacy link sits on every page.

## Sub-features

- `chrome-brand` shows the Mila brand image linking to `/`.
- `chrome-anonymous` shows only **Support Mila** and **Sign In** with no session.
- `chrome-authenticated` shows Sonograms, Gender Reveal, Blogs, the Baby Shower and My Journey dropdowns, About Me, and Logout.
- `chrome-dropdowns` opens **Baby Shower** (Houston, Dallas) and **My Journey** (Birthday, My First Year, One Year, Two Year, Three Year).
- `chrome-admin-banner` shows "Steven's admin tools" with the Prepare Mila's Month button, for the admin account only.
- `chrome-logout` signs out and routes to `/login`.
- `chrome-toggler` collapses the menu behind a hamburger below the `lg` breakpoint.
- `chrome-footer` shows the year, the Gates Company link, and **Privacy Policy**.

## How to get to it (user POV)

- Load any page; the nav and footer are in the root layout.
- Choose the hamburger control (`aria-label="Toggle navigation"`) on a narrow viewport.
- Choose **Support Mila**, which opens `https://go.fidelity.com/knfo0b` in a new tab.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0.
- `chrome-authenticated`, `chrome-dropdowns`, `chrome-admin-banner`, and `chrome-logout` need a signed-in browser. `chrome-admin-banner` needs the admin account specifically.

- **Confirm the nav is not server-rendered.** Open `/`. Run `node .claude/skills/verify-mila/control-mila.mjs get / --save site-chrome/home-ssr`, then search the body for `nav-item`. There are **zero** matches and exactly one `navbar-brand`. This is the baseline fact that forces every other check in this file into a browser.
- **See the signed-out nav.** In `claude-in-chrome`, open `http://127.0.0.1:3000/` while signed out and wait for the auth check to settle. The nav shows **Support Mila** and **Sign In** and no section links. Confirm with the DOM, not the accessibility tree: `javascript_tool` running `[...document.querySelectorAll('#navbarNav a, #navbarNav button')].map(n => n.textContent.trim())` returns exactly those two. Verified 2026-09-02 against this dev server.
- **See the signed-in nav.** In a signed-in tab, reload `/`. The nav shows Sonograms, Gender Reveal, Blogs, Baby Shower, My Journey, About Me, and Logout.
- **Check mobile nav alignment.** Below the `lg` breakpoint, open the hamburger and compare the left edge and text alignment of every top-level item. Sign In when signed out, and Logout when signed in, align with the link items rather than centering inside the menu.
- **Open each dropdown.** Choose **Baby Shower**, then **My Journey**. Each expands; the first lists Houston and Dallas, the second lists Birthday, My First Year, One Year, Two Year, Three Year. Assert the item text, then close without navigating.
- **Check the admin banner.** In the admin account's tab, the region labelled `Mila's monthly preparation` sits above the nav, reading "Steven's admin tools" with a **Prepare Mila's Month** button. In a non-admin signed-in tab it is absent. Do not press the button here — see [prepare month](./prepare-month.md).
- **Confirm the footer.** On any page, the footer shows the current year, a **Gates Company** link to `https://www.stevengates.io`, and a **Privacy Policy** link to `/privacy-policy`. The footer is server-rendered and *is* present in the saved body.
- **Log out.** Not drivable — it ends the user's real Google session in their own browser and no scripted sign-in exists to restore it. Report as skipped with that precondition.
- **Proof.** Screenshot the nav in each session state with the brand visible, plus the saved server body for the SSR baseline.

## Gotchas

- **`read_page` and `find` do not reliably expose this menu's children.** Both report the `<ul>` with no contents while the DOM holds two rendered, visible items. Assert nav contents with `javascript_tool` against the DOM. Trusting the accessibility tree here produced a confident, wrong "the nav is empty" report on 2026-09-02.
- **A stale Supabase cookie on `localhost` triggers a full-screen dev overlay that hides the page.** `getSession()` fails with `AuthApiError: Invalid Refresh Token: Refresh Token Not Found`, and Next 16 escalates that console error into a modal covering the nav. The app handles the condition correctly — it calls `signOut()` on that message — and the overlay is dev-only. It is *not* a nav defect. Clear `sb-*` cookies for `localhost`, or drive `127.0.0.1`, which has its own cookie jar. Cookies from **other** Supabase projects on `localhost` are a common source of this.
- The menu renders `null` while `isLoading` is true, so a screenshot taken immediately after navigation can catch a bare brand bar. Wait for the auth check, then assert via the DOM.
- **About Me** does not open an about page. It links to `/about/genealogy`, which 308s to `/`. The user lands on the home carousel.
- The admin banner is gated on the `is_mila_admin` RPC, not on `NEXT_PUBLIC_ADMIN_EMAIL`. The env var still gates the Create Blog button on the blogs index, so the two admin surfaces use different checks and can disagree.
- A stale refresh token makes the nav sign itself out: the auth check calls `signOut()` when the error mentions `Invalid Refresh Token` or `Refresh Token Not Found`. A nav that suddenly shows Sign In mid-run is this path, not a regression in what you were testing.
- The dropdowns need Bootstrap's JS, loaded by the `Bootstrap` client component. If the bundle has not hydrated, clicking a dropdown does nothing and the failure looks like a missing menu item.
- **Support Mila** is an external donation link. Do not follow it in a drive.
