# Draft letter notes

While a month's letter is still a private draft, Steven can open it, choose **Edit Draft**, write in a rich-text editor — bold, italic, underline, strikethrough, headings, lists, quotes, and emoji — and choose **Save Draft**, returning as often as he likes during the month. Notes and letter are the same thing. Saved text renders as the draft's body with its formatting intact, stays hidden from every other visitor, and becomes the letter itself when he chooses **Publish Letter**. Published letters are never editable here.

## Sub-features

- `notes-entry` shows **Edit Draft** beside **Publish Letter** for the admin on a draft, and nowhere else.
- `notes-editor` replaces the letter body with an editable region labelled `Draft letter text`, prefilled with the saved letter, plus **Save Draft** and **Cancel**.
- `notes-toolbar` offers **Bold**, **Italic**, **Underline**, **Strikethrough**, **Heading**, **Bullet list**, **Numbered list**, **Quote**, **Undo**, and **Redo**; each toggle shows pressed while active at the cursor. Ctrl+B, Ctrl+I, and Ctrl+U also work.
- `notes-emoji` accepts emoji typed or pasted from the system picker (Win + . on Windows, the emoji key on phones), and a hint under the toolbar says so.
- `notes-save` stores the text, returns to the rendered draft, and shows "Draft saved." Mutating — presence only.
- `notes-format` renders the saved formatting on the draft page exactly as it looked in the editor.
- `notes-cancel` discards unsaved edits and restores the rendered draft unchanged.
- `notes-error` keeps the editor open with the typed text and shows the server's message when a save fails.
- `notes-guard` rejects anonymous callers (401), non-admins (403), and published letters (409) server-side.
- `notes-foreign-markup` refuses to open the editor on a draft whose body contains markup the editor cannot represent (images, embeds, tables, inline styles), so edits made outside the site are never silently dropped.

## How to get to it (user POV)

- Sign in as Steven, open **Blogs**, and choose **Read More** on the letter badged as a draft.
- Open `http://127.0.0.1:3000/blogs/<draft-slug>` directly, for example `/blogs/three-years-four-months`.
- After **Prepare Mila's Month**, which lands on the journey card, reach the new draft through the blogs index.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0 and a signed-in **admin** Chrome is available.
- A draft letter exists. Read its slug from the blogs index draft badge. Do not create one to test this.
- **Save Draft writes to the live `blogs` row.** Never press it during verification without Steven's explicit approval for that run.

- **Prove the guard first.** Run `node .codex/skills/verify-mila/control-mila.mjs get /api/blog/test-slug/draft --method POST --body '{"html":"<p>x</p>"}' --expect-unauthorized`. It returns `401` with `{"error":"Sign in to continue."}`.
- **Find the entry point.** In the admin tab, open the draft. **Edit Draft** and **Publish Letter** sit above the greeting. Open any published letter: neither button is present.
- **Open the editor.** Choose **Edit Draft**. The body becomes an editable region labelled `Draft letter text` containing the saved letter (empty for a fresh draft), with the formatting toolbar above it, with **Save Draft** and **Cancel** below it. **Publish Letter** is disabled while editing.
- **Check formatting.** Type a word, select it, and choose **Bold**; the word renders bold and **Bold** shows pressed. Repeat for **Italic** and **Underline**. Paste an emoji; it appears inline.
- **Check cancel.** Type a short string, then choose **Cancel**. The rendered draft returns unchanged; reopening the editor shows the saved text, not the typed string.
- **Stop at the save.** Do not press **Save Draft** unless Steven approved a write for this run. With approval: type two paragraphs with one bold and one underlined word and an emoji, save, confirm "Draft saved." and the same formatting on the rendered draft, reload to confirm persistence, then restore the original text and save again.
- **Verify the logic offline.** Run `node scripts/check-monthly-workflow.mjs`, which exercises the save handler's guards and draft-only update without network access.
- **Proof.** Screenshot the draft with both admin buttons, the open editor, and the published letter without them, plus the `401` output. State whether the save path was exercised and with whose approval.

## Gotchas

- **Saved text is the letter.** There is no separate private notes field: whatever is in the draft when **Publish Letter** is pressed is what readers see.
- The editor saves HTML, the same format published letters use. Photos, videos, and inline colours are not typed here — images come from the journey card gallery's featured/detail buttons. Markup added through Supabase that the editor cannot represent makes it refuse to open (`notes-foreign-markup`).
- There is no emoji button: browsers cannot open the operating system's picker from a page, so emoji come from the system picker or keyboard.
- Draft letters 404 for non-admins, so a missing **Edit Draft** in a reader tab is proven by the 404, not by an absent button.
- **Listen** stays disabled on drafts even after text is saved; narration only runs once the letter is published.
- Two open tabs can overwrite each other: the last **Save Draft** wins. Reload before editing in a second tab.
