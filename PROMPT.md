# Project Agent Prompt

This document equips an AI agent to work productively in this repository.

## Purpose

- Build and run a Next.js App Router app that features:
  - Supabase auth and content (blogs, protected segments)
  - An OpenAI-powered chatbot with streaming SSE and optional File Search (RAG)
  - A blog TTS API that generates and caches audio

## Stack & Conventions

- Framework: Next.js 15 (App Router) + React 19 + TypeScript
- Styling: Bootstrap 5 + SCSS (imported in `src/app/layout.tsx`)
- Components: Custom components (no shadcn/Tailwind/Zustand)
- Icons/UX: `react-icons` and Bootstrap utilities
- Analytics: `@vercel/analytics` + `src/components/Shared/Google/googleAnalytics.tsx`
- Auth/DB: Supabase (`@supabase/ssr` for browser/server clients)
- OpenAI: Responses API streaming for chat; TTS via `audio.speech`
- Runtime: Node 20.x is required (see `package.json` `engines`)
- Routing: `(public)` and `(protected)` route groups; API routes under `src/app/api/**/route.ts`

## Environment

Copy `.env.example` to `.env.local` and set:

Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

OpenAI
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional)
- `OPENAI_PROMPT_ID` (optional)
- `OPENAI_VECTOR_STORE_ID` (optional, enables File Search)
- `OPENAI_TTS_MODEL` (optional, default: `gpt-4o-mini-tts`)
- `OPENAI_TTS_VOICE` (optional, default: `sage`)

Site / Access
- `SITE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_ALLOWED_EMAIL`
- `NEXT_PUBLIC_ADMIN_EMAIL`

## Architecture

### Chat UI
- File: `src/components/Shared/Chatbot/OpenAIChatBot.tsx`
- Posts to `/api/chat-stream` and parses Server-Sent Events (SSE).
- No history persistence; resets on open/close and initial mount.
- Streams default token lines (`data: ...`) plus special events:
  - `event: error` with `{ message }`
  - `event: done` with `{ conversationId, sources }` (citations)

### Chat API
- File: `src/app/api/chat-stream/route.ts`
- `export const runtime = "edge"` for low latency.
- Uses OpenAI Responses API with `store: true`.
- Tools: Includes `file_search` only when `OPENAI_VECTOR_STORE_ID` is set:
  - `tools: [{ type: "file_search", vector_store_ids: [ID] }]`
- System instruction:
  - Respond as Mila in first person ("I", "me", "my").
  - Use File Search to ground answers in blog content; otherwise say you don’t know.
  - Compute Mila’s exact age from May 30, 2023 as of current time (America/Chicago).
- SSE protocol:
  - Initial `event: ping` to signal readiness.
  - Token deltas on `response.output_text.delta` and `response.refusal.delta`.
  - On `end`, fetch `finalResponse()` to emit `event: done` with `{ conversationId, sources }`.
- Cancellation: terminate upstream with `stream.abort()` in `ReadableStream.cancel()`.

### Blog TTS API
- File: `src/app/api/blog/[slug]/audio/route.ts`
- Runtime: `nodejs`, `maxDuration = 60` seconds.
- Loads blog (`blogs` table) from Supabase; converts HTML to plain text.
- Chunks text (~900 chars, up to 6 parts), synthesizes MP3 via `openai.audio.speech.create`.
- Returns `202 { pending: true }` when nearing timeout; client retries.
- Caches final MP3 in Supabase `blog_audio` as base64; serves cached bytes on subsequent requests.

### Auth & Routing
- Middleware: `src/middleware.ts`
  - Normalizes URLs (strip trailing slash), enforces HTTPS in production, strips `www.`
  - Calls `updateSession` (`src/utils/supabase/middleware.ts`) to refresh session cookies.
  - Protects routes: `/blogs`, `/sonograms`, `/baby-shower`, `/gender-reveal`, `/my-journey`.
  - Redirects unauthenticated users to `/login`.
- Login: `src/app/login/page.tsx` (Google OAuth via Supabase), callback at `src/app/auth/callback/route.ts`.

## UI/UX Guidelines

- Consistency: Use Bootstrap components/utilities; SCSS under `public/scss/**` for theme.
- Rhythm: Use Bootstrap spacing scale; align paddings/margins to multiples of 4.
- Hierarchy: Favor 4–5 text sizes (Bootstrap headings/utilities).
- Feedback: Show loading states (e.g., `src/app/loading.tsx`), typing indicator in chat.
- Accessibility: Semantic HTML and proper `aria-*`; label interactive controls.
- Long content: Fixed-height containers with internal scroll for chat and lists.

## Coding Practices

- Keep API routes focused; return clear HTTP errors with JSON.
- Don’t block edge handlers; stream promptly.
- Guard on missing env vars; omit tools (File Search) when not configured.
- No secret keys in source; use `process.env.*`.
- Avoid persisting chat history unless explicitly requested.

## Key Files

- Chat UI: `src/components/Shared/Chatbot/OpenAIChatBot.tsx`
- Chat API: `src/app/api/chat-stream/route.ts`
- Blog TTS: `src/app/api/blog/[slug]/audio/route.ts`
- Supabase clients: `src/utils/supabase/{client,server,middleware}.ts`, `src/lib/supabase.ts`
- Middleware: `src/middleware.ts`
- Pages: `src/app/(public)/page.tsx`, `src/app/(protected)/**`

## Chat Streaming Details

- Client request: `{ question: string, conversationId?: string }`.
- Server options: `OPENAI_MODEL`, optional `OPENAI_PROMPT_ID`, optional conversation.
- System item: persona/timezone and age computation instructions.
- File Search: enabled only when `OPENAI_VECTOR_STORE_ID` exists.
- SSE events:
  - Default `data: <text>` for token deltas
  - `event: error` → `{ message }`
  - `event: done` → `{ conversationId, sources }`

## Blog TTS Details

- Text prep: strip HTML, join title + content.
- Chunking: sentence-aware, hard cap to fit function time.
- Timeout: return `202` when close to 60s and let client poll.
- Caching: final MP3 stored in `blog_audio` (Supabase); reuse on next request.

## Common Tasks

- Add a chat tool
  - Update `src/app/api/chat-stream/route.ts` tools and extend `extractSources` if needed.
  - Update the client SSE parser if introducing new events.

- Switch model or prompt
  - Change `OPENAI_MODEL` or `OPENAI_PROMPT_ID`; streaming logic remains the same.

- Debug File Search
  - Ensure `OPENAI_VECTOR_STORE_ID` is set and accessible by the API key’s project.
  - Expect citations in `event: done` payload.

- Extend TTS
  - Tune `OPENAI_TTS_MODEL` / `OPENAI_TTS_VOICE`; keep chunking and 202-retry pattern.
  - If cache schema changes, update `getCachedAudio`/`saveAudioToCache`.

## Do / Don’t

Do
- Use Node 20 locally and in CI/CD
- Keep changes small and composable
- Preserve streaming semantics (tokens + `done`/`error`)
- Validate env and fail fast with clear messages

Don’t
- Persist chat history in localStorage without request
- Hardcode keys or IDs
- Block or buffer edge streams
- Introduce Tailwind/shadcn/Zustand without explicit scope change

## Runbook

- Install: `npm install`
- Dev: `npm run dev` → http://localhost:3000
- Lint: `npm run lint`
- Env: copy `.env.example` → `.env.local` and fill required vars

