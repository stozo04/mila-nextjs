# Mila

Mila is a blog dedicated to my daughter to capture her life memories month to month.

## Features

- Next.js App Router + React 19
- Supabase Auth & Database (Postgres, RLS)
- Role‑based protected routes: `(protected)` and `(public)` segments
- Responsive UI with Bootstrap 5 + SCSS
- AI chatbot about Mila (OpenAI Responses API + File Search)
- TTS for blog posts via `/api/blog/[slug]/audio`
- Vercel Analytics, ready for CI/CD

## Requirements

- Node.js 20.x (LTS)
- npm / pnpm / yarn
- Supabase project and keys
- OpenAI API key

## Quick Start

```bash
git clone https://github.com/stozo04/mila-nextjs.git
cd mila-nextjs
npm install                # or pnpm/yarn
cp .env.example .env.local # fill in values
npm run dev
```

Open http://localhost:3000

## Environment Variables
# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=""          # Supabase project URL (from dashboard > Settings > API)
NEXT_PUBLIC_SUPABASE_ANON_KEY=""     # Supabase anon/public key (used in client/browser)
SUPABASE_SERVICE_ROLE_KEY=""         # Supabase service role key (server-side only, keep secret!)
# --- OpenAI ---
OPENAI_API_KEY=""                    # Your OpenAI secret key
OPENAI_VECTOR_STORE_ID=""            # Optional: OpenAI Vector Store ID for File Search
OPENAI_MODEL=""                      # Optional: override the default model (e.g., gpt-4.1, gpt-4o-mini)
# --- Site URLs ---
SITE_URL=""                          # Used for backend or deployment config (sometimes Netlify/Vercel)
NEXT_PUBLIC_SITE_URL=""              # Base URL for auth callbacks (e.g., https://yourapp.com)
# --- Auth / Access Control ---
NEXT_PUBLIC_ALLOWED_EMAIL=""         # Whitelist for allowed sign-in emails (comma-separated if multiple)
NEXT_PUBLIC_ADMIN_EMAIL=""           # Email for admin account (grants elevated privileges)

## Chatbot Architecture

- Client: `src/components/Shared/Chatbot/OpenAIChatBot.tsx`
  - Streams tokens from `/api/chat-stream`
  - Resets state on mount and when closed (no history persisted)
- API: `src/app/api/chat-stream/route.ts`
  - Edge runtime, uses OpenAI Responses API stream
  - File Search tool is included if `OPENAI_VECTOR_STORE_ID` is set
  - Emits SSE: token chunks (default), `event: done` with `{ conversationId, sources }`, and `event: error`

## Project Structure

```
src/
  app/                 # App Router
    api/               # Route handlers
      blog/[slug]/audio/route.ts
      chat-stream/route.ts
  components/          # Reusable React components
  lib/                 # Client & server helpers
  styles/              # SCSS & global CSS
docs/                  # Long‑form docs, assets
```

## Scripts

- `npm run dev`: Start dev server
- `npm run build`: Production build
- `npm run start`: Start built app
- `npm run lint`: ESLint / Next lint

## Troubleshooting

- 400 Missing `tools[0].vector_store_ids`: Ensure `OPENAI_VECTOR_STORE_ID` is set and the ID exists in your OpenAI project.
- Vector store not found: Verify the ID and that your OpenAI API key has access to that project.
- Streaming works but no citations: Confirm your vector store has files and that File Search is enabled (env var set).

## License

[MIT](LICENSE)

Built by Steven Gates.

