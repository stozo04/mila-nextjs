# AGENTS.md

This guide helps AI agents work effectively in this repository.

## Purpose

Build and run a Next.js app that features:
- Supabase auth and content
- An OpenAI‑powered chatbot with streaming and optional File Search (RAG)
- Blog TTS endpoint that streams audio

## Core Concepts

- App Router: API routes live under `src/app/api/**/route.ts`.
- Edge runtime: `chat-stream` runs on the edge for low latency.
- Streaming UX: The UI consumes Server‑Sent Events (SSE) from `/api/chat-stream`.
- Fresh sessions: Chat clears messages and conversation on open/close and first mount.

## How To Run

1) Use Node 20.x
- Local: `node -v` must start with `v20`.
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
  - `SITE_URL`

4) Start
- `npm run dev` → http://localhost:3000

## Key Files

- UI chatbot: `src/components/Shared/Chatbot/OpenAIChatBot.tsx`
  - Posts to `/api/chat-stream`
  - Parses SSE events: default token data, `event: done`, `event: error`
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
- Use Node 20+ locally and in CI/CD
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

- Debug File Search
  - Verify `OPENAI_VECTOR_STORE_ID` is set
  - Confirm the ID exists and is accessible by the API key’s project
  - Expect citations in the `done` payload

## Troubleshooting

- Node warning from `@supabase/supabase-js`
  - Your environment is not using Node 20. Switch Node and reinstall deps.

- 400 Missing `tools[0].vector_store_ids`
  - Set `OPENAI_VECTOR_STORE_ID` or omit File Search tools (the code already omits when missing).

- Vector store not found
  - Correct or recreate the vector store in the OpenAI project associated with your API key.

## Release Notes (recent changes)

- Standardized on streaming `/api/chat-stream` only
- Removed non‑stream `/api/chat` route
- Added Node 20 requirement via `engines`, `.nvmrc`, `.node-version`
- Chat resets on mount and close (no history)

