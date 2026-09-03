# Journey card

A journey card is one month of Mila's life: a heading built from the card's message and date, over a photo gallery for that month's Storage folder. For Steven it also carries a JPEG uploader and, inside each photo's preview, controls that assign the photo as the paired letter's featured or detail image.

## Sub-features

- `card-header` shows the card's message (or title) and its date.
- `card-back` returns to the year listing from a dynamic-year card.
- `card-gallery` lists the month's photos from `birthday/<slug>`, three at a time.
- `card-upload` shows a drop zone and file input to the admin only. Mutating — presence only.
- `card-upload-validation` rejects anything but a `.jpg`/`.jpeg` JPEG up to 50 MB.
- `card-upload-status` announces "Uploading N of M", then uploaded and failed counts.
- `card-image-roles` offers "Use as featured image" and "Use as detail image" in the admin photo preview. Mutating — presence only.
- `card-role-labels` marks a chosen photo with a glow and a "Featured"/"Detail" caption, admin only.

## How to get to it (user POV)

- Choose **View** on any card on a journey year page.
- Open `http://127.0.0.1:3000/my-journey/<year>/<slug>` directly.
- Land here after preparing a month — see [prepare month](./prepare-month.md).

## Driving it with control-mila

Preconditions:

- `doctor` exits 0 and a signed-in session is available (`session` for requests, Chrome for rendered UI).
- Every admin sub-feature needs the admin account.
- **The uploader writes to live Storage and the role controls write to a live blog row. Neither may be submitted.** Verify presence, enablement, and validation copy only.
- Pick an existing card slug from a year page. Never invent one.

- **Confirm the gate.** Open a card signed out. Run `node .cursor/skills/verify-mila/control-mila.mjs get /my-journey/4-year/any-slug --save journey-card/anonymous`. Status is `307` with `location: /login`.
- **Open a card.** In a signed-in tab, choose **View** from a year page. The heading shows the card's message on the left and its date on the right, with the gallery beneath.
- **Return to the year.** On a dynamic-year card, choose **Back to year**. The route returns to `/my-journey/<year>`. Fixed-year cards have no such link — use browser back.
- **Drive the gallery.** Three photos render. Choose **View More** to append three more; the control settles on a disabled **No More Images** at the end. Full recipe in [baby shower](./baby-shower.md); the component is the same.
- **Check the uploader is present for the admin.** In the admin tab, a region labelled `Upload journey photos` sits above the gallery, headed "Add photos to this month", with the label "Drop JPEG photos here or choose files below", a file input with id `journey-photos`, and the help text `JPEG only (.jpg or .jpeg) · up to 50 MB each`. **Do not attach a file and do not drop one.**
- **Confirm the uploader is absent otherwise.** In a non-admin signed-in tab, the region is not rendered at all.
- **Check the image-role controls.** In the admin tab, choose a photo to open its preview. The modal is titled `Photo preview` and its footer holds **Use as featured image** and **Use as detail image**. **Do not press either** — each writes a public URL onto the paired blog row. Close the modal instead.
- **Check the role labels.** A photo already assigned shows a pink glow and a caption reading `Featured`, `Detail`, or `Featured · Detail`. These are admin-only; a non-admin sees neither the labels nor the footer controls.
- **Prove the endpoint rejects an anonymous caller.** Run `node .cursor/skills/verify-mila/control-mila.mjs get /api/blog/test-slug/images --method POST --body '{}' --expect-unauthorized`. It returns `401` with `{"error":"Sign in to continue."}` — rejected before any write.
- **Read the current role assignments headlessly.** Run `node .cursor/skills/verify-mila/control-mila.mjs session`, then `... get /api/blog/<slug>/images --as-admin --save journey-card/letter-images` with a real card slug. Status is `200 OK` with `{"images":{"featured_image":...,"detail_image":...}}`. Either value may be `null` when that role is unset. This is the read half of `card-image-roles`; the write half stays unexercised. `--as-admin` refuses the `POST`, so there is no way to slip into a write from here.
- **Proof.** Screenshot the card with the heading and gallery, the uploader region in the admin tab, and the open photo preview showing both role controls. State that no upload or role assignment was performed.

## Gotchas

- **The uploader has no confirmation step.** Choosing files starts the upload immediately in the `change` handler, and a drop starts it on `drop`. There is no "are you sure" and no way to cancel — which is exactly why attaching a file is forbidden during verification.
- Every month's photos live under `birthday/<slug>`, including months that have nothing to do with a birthday. The folder name is not a bug.
- The upload loop stops at the **first** failure and reports "N uploaded, 1 failed, M not attempted". A partial batch is the designed behavior; the remaining files must be reselected. Do not report a partial count as a lost batch.
- Uploads never overwrite: each file gets a fresh `crypto.randomUUID()` name and `upsert: false`. So a "duplicate" photo is a second object, not a replaced one.
- Admin state comes from the `is_mila_admin` RPC after the session resolves, so the uploader and the role controls appear a beat after the rest of the page. Let the page settle before reporting them missing.
- The role controls are disabled until the paired letter's current images load from `/api/blog/<slug>/images`. A card whose month has no letter shows an error instead: "No matching blog letter exists for this month." That is the expected message, not a failure of the card.
- Assigning a role stores Storage's **public** URL. The bucket is public, so those images are readable without a session — the page is private, the photo URL is not.
- The gallery is keyed by `<slug>-<revision>`, so a successful upload remounts it. Screenshots taken across an upload show a different component instance.
