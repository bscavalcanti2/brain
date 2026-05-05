# 🧠 Brain — Bruno's Second Brain

Personal knowledge base for Bruno and AI agents. Capture, search, and connect your thoughts using full-text search, semantic search, and a knowledge graph.

## Features

- **Full-text search** with Portuguese + English support
- **Semantic search** (meaning-based) via Cohere embeddings
- **Hybrid search** combining both with Reciprocal Rank Fusion
- **Knowledge graph** — interactive force-directed visualization
- **Multi-agent** — AutoClaw, Claude Code, Codex, GLM-5, OpenCode
- **Markdown** notes with tags, source tracking, and note linking
- **Dark mode** — slate/emerald design system
- **Keyboard shortcuts** — ⌘K search, ⌘N new note, ⌘G graph

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **Prisma 7** + **Supabase** (PostgreSQL + pgvector)
- **Cohere** embed-v4.0 (semantic search)
- **react-force-graph-2d** (graph visualization)
- **Tailwind CSS** (styling)
- **TypeScript** (strict mode)

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/bscavalcanti2/brain.git
cd brain
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required:
- `DATABASE_URL` — Supabase connection (with pgbouncer)
- `DIRECT_URL` — Supabase direct connection (no pgbouncer)
- `BRAIN_API_KEY` — API key for authenticating requests
- `COHERE_API_KEY` — [Cohere](https://dashboard.cohere.com/api-keys) API key (free tier)

### 3. Setup Database

```bash
npx prisma generate
npx prisma db push

# Run embedding migration
npx tsx scripts/migrate-embeddings.ts
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Backfill Embeddings

After creating some notes, generate embeddings:

```bash
# Via API (server must be running)
curl -X POST -H "Authorization: Bearer $BRAIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batchSize":20}' \
  http://localhost:3000/api/embeddings/generate

# Or via CLI
./scripts/brain.sh embed-backfill
```

## Multi-Agent Setup

Each agent reads its own instruction file from the repo root:

| Agent | File | Source Value |
|-------|------|-------------|
| AutoClaw | `TOOLS.md` (workspace) | `auto_claw` |
| Claude Code | `CLAUDE.md` | `claude_code` |
| Codex | `CODEX.md` | `codex` |
| GLM-5 | `GLM5.md` | `glm5` |
| OpenCode | `AGENTS.md` | `opencode` |

## CLI

```bash
./scripts/brain.sh add "Title" "Content" "tag1,tag2"
./scripts/brain.sh search "query" [fulltext|semantic|hybrid]
./scripts/brain.sh list [limit]
./scripts/brain.sh get <note-id>
./scripts/brain.sh tags
./scripts/brain.sh embed-status
./scripts/brain.sh embed-backfill
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/notes` | Create a note |
| `GET` | `/api/notes` | List notes (paginated) |
| `GET` | `/api/notes/:id` | Get a note |
| `PUT` | `/api/notes/:id` | Update a note |
| `DELETE` | `/api/notes/:id` | Delete a note |
| `GET` | `/api/search?q=...` | Full-text search |
| `GET` | `/api/search/semantic?q=...` | Semantic search |
| `GET` | `/api/search/hybrid?q=...` | Hybrid search |
| `GET` | `/api/graph` | Knowledge graph data |
| `GET` | `/api/embeddings/generate` | Embedding status |
| `POST` | `/api/embeddings/generate` | Backfill embeddings |

## License

Private — Bruno's personal project.
