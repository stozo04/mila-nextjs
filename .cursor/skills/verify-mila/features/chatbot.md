# Chatbot

A round chat launcher sits in the bottom-right corner of every page. Opening it reveals a small panel titled "Chat with me" that answers questions about Mila's life in her own first-person voice, streaming the reply token by token from her letters.

## Sub-features

- `chat-launcher` shows a round button on every page, labelled "Open chat" or "Close chat".
- `chat-panel` opens a 300px panel headed "Chat with me" with the prompt "What would you like to know about me...".
- `chat-send` submits a question and streams the reply into a bot bubble. Billable — presence only.
- `chat-typing` shows an animated typing indicator while a reply is in flight.
- `chat-disabled` disables the input and **Send** while a reply streams, and disables **Send** on an empty box.
- `chat-reset` clears messages and the conversation on open, on close, and on first mount.
- `chat-close` dismisses the panel from the header `×` or the launcher.

## How to get to it (user POV)

- Choose the round chat control at the bottom right of any page, signed in or out.
- Choose the `×` in the panel header, or the launcher again, to close it.

## Driving it with control-mila

Preconditions:

- `doctor` exits 0.
- The launcher is in the root layout, so it is present on `/` **without a session** — the only tier-2-looking feature reachable anonymously.
- **Never send a message.** Each submit calls `/api/chat-stream`, which bills the OpenAI Responses API and stores the conversation. `control-mila.mjs` refuses that route.

- **Confirm the launcher ships.** Open `/`. Run `node .cursor/skills/verify-mila/control-mila.mjs get / --save chatbot/home`, then search the saved body for `Open chat`. The launcher's `aria-label` is present in the server HTML.
- **Open the panel.** In `claude-in-chrome`, open `http://127.0.0.1:3000/` and click the control named `Open chat`. A panel appears bottom-right headed `Chat with me`, showing the placeholder text `What would you like to know about me...` and an input placeheld `Type your message...`.
- **Confirm Send is disabled when empty.** With the input empty, **Send** is disabled. Type a character; it enables. Clear it; it disables again. **Stop here — do not submit.**
- **Close the panel.** Choose the `×` in the header. The panel dismisses and the launcher returns to its "Open chat" state. Reopen and close it with the launcher instead; both paths work.
- **Confirm the reset.** Reopen the panel. The message list is empty and shows the placeholder prompt again, with no history from the previous open.
- **Exercise a real answer.** Not drivable — sending costs an OpenAI call. Report as skipped with that precondition. If the user explicitly asks for a live chat check, they should drive it themselves and hand you the transcript.
- **Proof.** Screenshot the open panel with the header, placeholder, and disabled Send visible, plus the saved body proving the launcher ships in the server HTML.

## Gotchas

- **The rendered chatbot is the SSE `OpenAIChatBot`, not ChatKit.** `src/app/layout.tsx` mounts it and has `ChatKitWidget` commented out along with its import. A run that verifies "the ChatKit widget" is verifying something that is not mounted. `/api/chatkit/session` and `ChatKitWidget.tsx` still exist but nothing reaches them. `README.md` and `AGENTS.md` described the reverse until 2026-09-02; if you see a doc claiming ChatKit is live, it has regressed.
- The panel is fixed bottom-right at `z-index: 1050` on every page. It overlaps page content on short viewports and can intercept a click intended for something beneath it — including gallery controls. Close it before driving another feature.
- The launcher resets the conversation on **open as well as close**, so there is no history to verify across sessions. An empty panel is correct behavior, not a lost transcript.
- Questions are rewritten before sending: "you" becomes "Mila", "your" becomes "Mila's". The text sent is not the text typed, so a transcript check must expect the transformed question.
- A stream failure appends a bot bubble reading `Sorry, something went wrong: <message>` rather than surfacing an error state. Assert on that text if you are verifying the failure path.
- `/api/chat-stream` declares the `nodejs` runtime with `maxDuration = 60`, so a long answer can be cut off at 60 seconds even though the UI shows no timeout.
