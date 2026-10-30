# People

Steven teaches the site who's who. While the search index builds, his browser finds the faces in every photo and groups look-alike faces together. On the People page he sees those groups as piles of face thumbnails, biggest first, and types a name on a pile — Mila, Steven, Mila's mom, grandparents. He merges piles that are the same person (newborn Mila and toddler Mila), moves a face out of a pile it doesn't belong in, and hides strangers. Named people then appear in the photo viewer and can be found by typing their name in the search bar (see [search anything](./search-anything.md)).

## Sub-features

- `people-entry` shows a **People** link in the admin banner, admin only.
- `people-scan` finds faces as part of **Start indexing** on [search index](./search-index.md), which gains a `Faces` row reading `Scanned X of Y photos`. New uploads are scanned with their indexing. Faces too small to recognise, such as people far in the background, are skipped.
- `people-named` lists named people at the top of `/admin/people`, each with a face thumbnail, their name, and how many photos they are in.
- `people-groups` lists unnamed groups below, biggest first, each as a pile of face thumbnails with a count.
- `people-name` names a group: typing a name and choosing **Save** makes it that person. Typing the name of someone already named adds the group to them.
- `people-merge` joins two or more selected groups (named or not) into one with **Merge**.
- `people-open` opens a group or person to show all of its faces, each with its photo.
- `people-remove-face` takes a face that doesn't belong out of a group with **Not this person**; it returns to the unnamed groups.
- `people-hide` hides a group of strangers with **Hide**; a **Show hidden** switch brings hidden groups back.
- `people-rename` renames a person; `people-unname` turns a person back into an unnamed group with **Remove name**.
- `people-auto` puts newly scanned faces that closely match a named person straight into that person; less certain ones wait in the unnamed groups.
- `people-gate` sends anonymous visitors to sign-in, shows non-admins "Only Steven can manage people.", and rejects anonymous people writes with 401.

## How to get to it (user POV)

- Sign in as Steven and choose **People** in the admin banner above the nav.
- Open `http://127.0.0.1:3000/admin/people` directly.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0. The page needs the admin account in a signed-in Chrome.
- Faces must already be scanned. If the `Faces` row on [search index](./search-index.md) reads `Scanned 0 of Y photos`, the page says so and has no groups.
- **Naming, merging, removing, hiding, and renaming all write to the live database. Never press Save, Merge, Not this person, Hide, or Remove name.** Verify presence and the guards only.

- **Prove the page gate.** Run `node .codex/skills/verify-mila/control-mila.mjs get /admin/people --save people/anonymous`. Status is `307` with `location: /login`.
- **Prove the write guard.** Run `node .codex/skills/verify-mila/control-mila.mjs get /api/people --method POST --body '{}' --expect-unauthorized`. It returns `401` with `{"error":"Sign in to continue."}` before anything is written.
- **Read the people headlessly.** Run `node .codex/skills/verify-mila/control-mila.mjs session`, then `... get /api/people --as-admin --save people/list`. Status is `200 OK` with `people` (each with `id`, `name`, `photos`) and `groups` (each with `id`, `faces`), groups biggest first.
- **Find the entry point.** In the admin tab, the banner holds a **People** link beside **Build search index**. In a non-admin signed-in tab the banner is absent.
- **Open the page.** Choose **People**. The route becomes `/admin/people`, the heading reads `People`, named people come first with name and photo count, then unnamed groups as piles of face thumbnails, biggest first.
- **Check the controls.** Each unnamed group has a name field with **Save** and a **Hide** button; groups have checkboxes, and **Merge** enables once two or more are checked. **Do not press any of them.**
- **Open a group.** Choose a group's pile. Its faces show, each beside its photo, each with **Not this person**. **Do not press it.** Close it.
- **Check the non-admin view.** In a non-admin signed-in tab, open `/admin/people`. The page reads "Only Steven can manage people." with no faces and no controls.
- **Proof.** Screenshot the banner link, the page with named people and groups, and an opened group. Save the anonymous `307`, the `401`, and the list JSON. State plainly that nothing was named, merged, removed, or hidden.

## Gotchas

- **There is no staging database.** Every control on this page writes to production, so verification is presence and guards only.
- Face finding runs in Steven's browser during indexing, like the photo index. The first run downloads the face models before the first face is found; a long first pause is the download.
- Babies change fast. Expect Mila as several groups at first (newborn, baby, toddler); merging them is the designed fix, not a defect.
- Group membership comes from similarity, so a group can hold a wrong face. **Not this person** is the designed fix.
- Hidden groups are still scanned and stored; hiding only removes them from the list and from search.
- Face data is stored in Supabase behind sign-in, alongside the search index, and never leaves Steven's accounts.
