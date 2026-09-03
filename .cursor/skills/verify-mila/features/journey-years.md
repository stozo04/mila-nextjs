# Journey years

My Journey groups Mila's monthly milestone cards by age. Five destinations are fixed in the nav — Birthday, My First Year, One Year, Two Year, Three Year — and any later year that has cards appears automatically in a secondary nav above the page.

## Sub-features

- `years-nav` lists the five fixed destinations in the **My Journey** dropdown.
- `years-birthday` shows the delivery-day page with its own heading and gallery.
- `years-fixed` lists that year's cards at `/my-journey/first-year`, `/one-year`, `/second-year`, `/third-year`.
- `years-paging` reveals three more cards per **Show More** press, up to the total.
- `years-later` shows an "Age N" link per later year that has cards, in a secondary nav.
- `years-dynamic` lists a later year's cards at `/my-journey/<n>-year`.
- `years-invalid` 404s a year segment that is not `<n>-year` with `n` ≥ 4.
- `years-create` shows a create-card control on the one/two/three-year pages for the admin. Mutating — presence only.

## How to get to it (user POV)

- Choose **My Journey** in the top nav, then any of the five destinations.
- Open `http://127.0.0.1:3000/my-journey/first-year` directly.
- Choose an **Age N** link in the secondary nav above a journey page.
- Follow the legacy bookmarks `/my-journey/birthday/birthday.html` or `/my-journey/first-year/my-first-year.html`.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0 and a signed-in session is available (`session` for requests, Chrome for rendered UI).
- `years-create` needs the admin account. Do not submit the modal.
- The live database currently holds 42 journey cards. Read only.

- **Confirm the gate.** Open a year signed out. Run `node .cursor/skills/verify-mila/control-mila.mjs get /my-journey/first-year --save journey-years/anonymous`. Status is `307` with `location: /login`.
- **Confirm both legacy redirects.** Run `node .cursor/skills/verify-mila/control-mila.mjs get /my-journey/birthday/birthday.html` and `... get /my-journey/first-year/my-first-year.html`. Each returns `308` with `location` set to the clean route.
- **Open the dropdown.** In a signed-in tab, choose **My Journey**. The menu lists exactly: Birthday, My First Year, One Year, Two Year, Three Year.
- **Load a fixed year.** Choose **My First Year**. The heading reads `My First Year Journey` with the lead paragraph beneath it. Three cards render, each with a title, a message, and a **View** control.
- **Page the cards.** Choose **Show More**. Three more cards append. The control disappears once every card for that year is visible.
- **Open a card.** Choose **View** on any card. The route becomes `/my-journey/first-year/<slug>` — continue in [journey card](./journey-card.md).
- **Load the birthday page.** Choose **Birthday**. The heading reads "When you were placed in my arms, I understood that love is infinite." with the date `May 30, 2023`, over the `birthday/delivery-day` gallery.
- **Check the later-year nav.** On any `/my-journey/*` page, a secondary nav labelled `Later journey years` lists one `Age N` link per year of four or above that has cards. If no such cards exist, the nav is absent — that is correct, not a failure.
- **Load a dynamic year.** Choose an `Age N` link, or open `/my-journey/4-year`. The heading reads `My Journey at 4` and cards render with **View** links.
- **Check an invalid year.** Open `/my-journey/2-year`. The 404 page renders — the dynamic route only accepts `4` and above, because one, two, and three are served by their own fixed pages.
- **Check the admin control.** In the admin tab on `/my-journey/one-year`, a create-card control is present; on `/my-journey/first-year` it is **not**. **Do not open and submit it.**
- **Proof.** Screenshot one fixed year after paging and one dynamic year, both with the secondary nav visible if present.

## Gotchas

- **The five fixed years are not one component.** `first-year` has no create control; `one-year`, `second-year`, and `third-year` each carry their own copy of the modal wiring. A change to one does not reach the others — verify each separately.
- The route segment and the database value differ: `/my-journey/second-year` maps to `journey_type` `two_year`, and `third-year` to `three_year`. A slug that looks right can still query the wrong group.
- The dynamic route regex is `^([4-9]|[1-9]\d+)-year$`, so `/my-journey/1-year` and `/my-journey/0-year` 404 while `/my-journey/10-year` is valid. Age 4 and above only.
- The fixed year pages fetch through a browser Supabase client, so cards are absent from the server HTML and appear only after hydration. A spinner with `Loading...` shows first. The dynamic year page is server-rendered instead, so its cards *are* in the initial HTML — the two behave differently under a slow network.
- The dynamic year page throws on a query error rather than rendering an empty state, producing the Next error overlay in dev. That is the error path, not a crash of the app.
- `Show More` clamps to the card total, so the control vanishes rather than paging past the end — the opposite of the gender reveal page's unbounded control.
- The secondary nav's sort uses `parseInt` on strings like `4_year`, which works, but any non-numeric `journey_type` sorts as `NaN` and lands unpredictably. Assert the links present, not their order, if odd values exist.
