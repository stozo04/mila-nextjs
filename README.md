# Mila NextJS

![Hero Screenshot](docs/assets/hero.png) <!-- replace path -->

[![Build Status](https://img.shields.io/github/actions/workflow/status/yourusername/mila-nextjs/ci.yml?branch=main)](https://github.com//mila-nextjs/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Deploy on Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/yourusername/mila-nextjs)

Mila NextJS is a modern full‑stack playground for parenting memories.  
It couples **Next.js 15 (App Router)** with **Supabase**, **OpenAI tools**, and a sprinkle of Bootstrap‑powered glam to capture milestones, run a blog with TTS, and explore AI‑native UI patterns.

---

## ✨ Features

- **Next.js 15 & React 19** – App Router, Server Actions, and Edge runtimes  
- **Supabase Auth & Database** – Postgres + Row‑Level Security  
- **Role‑Based Protected Routes** – `(protected)` and `(public)` segments  
- **Responsive UI** – Bootstrap 5 with custom SCSS theming  
- **LLM Tools** – Open AI Assitant - Chatbot to learn about Mila 
- **TTS for blog posts** – Streams audio via `/api/blog/:slug/audio`  
- **Analytics** – Vercel Analytics + Google GA4  
- **CI/CD** – GitHub Actions & one‑click Vercel deploy

---

## 🖥️ Live demo

> **TODO:** drop a link or GIF here once deployed

---

## 📋 Prerequisites

| Tool            | Version (tested) |
|-----------------|------------------|
| **Node.js**     | 20 LTS           |
| **PNPM**        | 9.x (or npm / yarn) |
| **Supabase**    | project & service role key |
| **OpenAI**      | Secret API key |

---

## 🚀 Quick start

```bash
git clone https://github.com/stozo04/mila-nextjs.git
cd mila-nextjs
pnpm i                      # npm install / yarn
cp .env.example .env.local  # fill in the blanks
pnpm dev
```

Open <http://localhost:3000> and enjoy the magic ✨.

---

## 🔧 Environment variables

| Key | Required | Description |
|-----|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔒 | Only if you run migrations locally |
| `OPENAI_API_KEY` | ✅ | Enables AI routes & chat bot |
| `OPENAI_ASSISTANT_ID` | ✅ | OpenAI Assistant ID for chatbot |
| `NEXT_PUBLIC_SITE_URL` | ⬆️ | Used in auth callbacks (deployments) |

Never commit secrets—CI will fail if any of the **✅ required** vars are missing.

---

## 🏗️ Project structure (top‑level)

```
src/
 ├─ app/               # Next.js app router
 │   ├─ (protected)/   # Auth‑gated pages
 │   ├─ (public)/      # Public pages
 │   └─ api/           # Route handlers
 ├─ components/        # Reusable React components
 ├─ lib/               # Client & server helpers (e.g., supabase.ts)
 ├─ styles/            # SCSS & global CSS
 └─ scripts/           # SQL & misc automation
docs/                  # Long‑form docs (architecture, openapi.yaml)
```

For a deep dive see [`docs/architecture.md`](docs/architecture.md).

---

## 🤖 For AI agents

* **OpenAPI spec** – [`/docs/openapi.yaml`](docs/openapi.yaml)  
* **MCP manifest** – [`/mcp.json`](mcp.json)  
* **JSON Schemas** – [`/docs/schemas`](docs/schemas)

Auth: include `Authorization: Bearer <jwt>` header from `supabase.auth.getSession()` when calling protected endpoints.

---

## 📜 Scripts

| Command            | Purpose |
|--------------------|---------|
| `pnpm dev`         | Run dev server |
| `pnpm lint`        | ESLint + Typecheck |
| `pnpm build`       | Production build |
| `pnpm start`       | Start built app |
| `pnpm sql:push`    | Apply Supabase migrations |
| `pnpm test:audio`  | Hit `/api/blog/:slug/audio` locally |

---

## 🤝 Contributing

1. **Fork** the repo  
2. `git checkout -b feat/amazing-idea`  
3. Commit & push  
4. Open a pull request – GitHub Actions will lint & test automatically.

Check out [`CONTRIBUTING.md`](CONTRIBUTING.md) for style guide and commit conventions.

---

## 🆘 Support

Open an issue or ping **@stozo04** on Discord `#mila-nextjs`.

---

## 📝 License

[MIT](LICENSE)

---

Built with ❤️ by Steven Gates & contributors.
