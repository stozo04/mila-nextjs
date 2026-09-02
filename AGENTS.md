# AGENTS.md

This guide helps AI agents work effectively in this repository.

## Before you start

Pick the one that matches the work and follow it:

- **Building a feature** → [`FEATURE-PROMPT.md`](FEATURE-PROMPT.md). Write the feature file in `.claude/skills/verify-mila/features/` **before** the code, and stop for review.
- **Fixing a bug** → [`BUG-PROMPT.md`](BUG-PROMPT.md). Reproduce it first-hand and prove the mechanism before changing anything or writing anything down.
- **Verifying that a change actually works** → the [`verify-mila`](.claude/skills/verify-mila/SKILL.md) skill. Drive the running app and capture evidence; do not assert behavior from the diff.

Three rules that override convenience:

1. **`npm run dev` talks to the live Supabase project.** There is no seed and no staging project. Drives are read-only: never submit a mutating control (Create Blog, Publish Letter, image roles, the uploader, Prepare Mila's Month), and never request `/api/blog/<slug>/audio`, `/api/chat-stream`, or `/api/chatkit/session` — each costs money on a single call. If verifying something genuinely requires a write, stop and ask.
2. **The feature map is a specification, not a description.** When the app disagrees with it, the default is that the app is wrong — fix the code. Never rewrite a check so it passes against behavior you just found broken; a known defect stays a failing check.
3. **Verify against the real artifact.** The DOM, the actual response, the actual row — not a summary, an accessibility tree, or an inference from source. A passing proxy is not a passing feature.
4. **Find a bug, fix the bug.** Do not route around it, leave a TODO, or report it and move on — including when it is outside the task you were given and you did not cause it. Follow [`BUG-PROMPT.md`](BUG-PROMPT.md): prove the cause, then fix it. If the fix is genuinely too large or too risky to fold in, stop and say so plainly, with what you found and what it would take — never leave it silently broken.

**The tree must be green when you finish.** `npm run build`, `npm run lint`, and `npx tsc --noEmit` all pass. Run them before you say you are done; a build error reaching `main` blocks every deploy, and `next.config.ts` deliberately sets `ignoreBuildErrors: false` so type errors cannot hide behind a green deploy.

## Purpose

Build and run a Next.js app that features:
- Supabase auth and content
- An OpenAI-backed chatbot with optional File Search (RAG). **The live widget is the SSE `OpenAIChatBot`, streaming from `/api/chat-stream`.** The ChatKit embed is built but parked — `ChatKitWidget` is commented out in `src/app/layout.tsx`.
- Blog TTS endpoint that streams audio

## Core Concepts

- App Router: API routes live under `src/app/api/**/route.ts`.
- Edge runtime: `chat-stream` runs on the edge for low latency.
- Chat UX: The live bottom-right widget is `OpenAIChatBot`, consuming SSE from `/api/chat-stream`. ChatKit (`ChatKitWidget` + `/api/chatkit/session`) is dormant code — do not assume it is mounted.
- Streaming UX: Legacy chat consumes Server-Sent Events (SSE) from `/api/chat-stream`.
- Fresh sessions: Chat clears messages and conversation on open/close and first mount.

## How To Run

1) Use Node 22.x
- Local: `node -v` must start with `v22`. `package.json` `engines`, `.nvmrc`, and `.node-version` all say 22.
- If not, install/switch via nvm or nvm‑windows.

2) Install deps
- `npm install`

3) Configure env
- Copy `.env.example` to `.env.local` and fill:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `OPENAI_API_KEY`
  - `OPENAI_VECTOR_STORE_ID`
  - `OPENAI_MODEL`
  - `OPENAI_CHATKIT_WORKFLOW_ID`
  - `SITE_URL`

4) Start
- `npm run dev` → http://localhost:3000

## Key Files

- Live chat widget: `src/components/Shared/Chatbot/OpenAIChatBot.tsx`
  - Mounted in `src/app/layout.tsx`; this is the chatbot users actually see
  - Posts to `/api/chat-stream` and parses SSE events (`data`, `event: done`, `event: error`)
- ChatKit widget (dormant): `src/components/Shared/Chatbot/ChatKitWidget.tsx`
  - Commented out in `src/app/layout.tsx`, along with its import — nothing renders it
  - Fetches client secrets from `/api/chatkit/session`
- ChatKit session API (unused while the widget is parked): `src/app/api/chatkit/session/route.ts`
  - Exchanges the workflow ID for a client secret (requires `OPENAI_CHATKIT_WORKFLOW_ID`)
- Streaming API: `src/app/api/chat-stream/route.ts`
  - Uses OpenAI Responses API streaming
  - Includes File Search tool if `OPENAI_VECTOR_STORE_ID` is set
- Blog TTS: `src/app/api/blog/[slug]/audio/route.ts`

## OpenAI File Search (RAG)

- Env var: `OPENAI_VECTOR_STORE_ID`
- Behavior:
  - If present: request includes `tools: [{ type: 'file_search', vector_store_ids: [ID] }]`
  - If missing: request omits File Search tools (no RAG)
- Best practices:
  - Ensure the vector store exists in the same OpenAI project as your API key
  - Ingestion should complete before usage to return citations

## Coding Practices (Do/Don’t)

Do
- Use Node 22 locally and in CI/CD, matching `package.json` `engines`
- Keep API routes focused; prefer small, composable helpers
- Handle streaming cancelation (call `stream.abort()` in `cancel()`)
- Fail fast with clear error messages (HTTP 400/500 with `error` JSON)
- Guard on missing env vars when necessary

Don’t
- Introduce localStorage history for chat unless explicitly requested
- Hardcode secret IDs/keys in source
- Block the event loop inside edge handlers

## Common Tasks for Agents

- Add a new tool to the chatbot
  - Update `chat-stream/route.ts`: expand `tools` and handle response annotations
  - Update the client SSE parser if new events are introduced

- Switch models or prompts
  - Change `OPENAI_MODEL` or `OPENAI_PROMPT_ID` env vars
  - Keep streaming logic the same

- Update ChatKit workflow
  - Set `OPENAI_CHATKIT_WORKFLOW_ID` to the new workflow ID
  - Restart the dev server to ensure the widget picks up the change

- Debug File Search
  - Verify `OPENAI_VECTOR_STORE_ID` is set
  - Confirm the ID exists and is accessible by the API key’s project
  - Expect citations in the `done` payload

## Troubleshooting

- Node warning from `@supabase/supabase-js`
  - Your environment is not using Node 22. Switch Node and reinstall deps.

- 400 Missing `tools[0].vector_store_ids`
  - Set `OPENAI_VECTOR_STORE_ID` or omit File Search tools (the code already omits when missing).

- Vector store not found
  - Correct or recreate the vector store in the OpenAI project associated with your API key.

## Release Notes (recent changes)

- Added OpenAI ChatKit embed (`ChatKitWidget`) and `/api/chatkit/session`
- ChatKit was subsequently parked: `layout.tsx` mounts `OpenAIChatBot` and comments out
  `ChatKitWidget`. An earlier note here claimed the reverse — corrected 2026-09-02 against
  the running app.
- Added `OPENAI_CHATKIT_WORKFLOW_ID` env var alongside existing OpenAI config
- Node moved to 22.x; `.nvmrc` and `.node-version` had lagged at 20 and now match the manifest

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
