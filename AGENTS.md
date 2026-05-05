<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🧠 Bruno's Second Brain

You have access to Bruno's shared knowledge base.

**API Base:** `http://localhost:3000/api` (dev) / `https://brain-bruno.vercel.app/api` (prod)
**Auth:** `Authorization: Bearer <BRAIN_API_KEY>` (in `.env.local`)

## Key Endpoints

- `POST /notes` — Create note. Body: `{"title":"...","content":"...","source":"opencode","tags":["..."]}`
- `GET /search?q=...` — Full-text search
- `GET /search/semantic?q=...` — Semantic search (meaning-based)
- `GET /search/hybrid?q=...` — Hybrid search (best results)
- `GET /notes?limit=10` — List recent notes
- `GET /notes/:id` — Get single note
- `PUT /notes/:id` — Update note
- `DELETE /notes/:id` — Delete note
- `GET /graph` — Knowledge graph

## When to Use

- **Before coding:** search for existing decisions, patterns, or context
- **After learning:** save debugging solutions, architecture decisions, lessons
- **Use `"source": "opencode"`** when creating notes

## Example

```bash
# Search
curl -sf -H "Authorization: Bearer $BRAIN_API_KEY" \
  "$BRAIN_URL/search?q=prisma+setup"

# Create
curl -sf -X POST -H "Authorization: Bearer $BRAIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Learned: X","content":"...","source":"opencode","tags":["topic"]}' \
  "$BRAIN_URL/notes"
```
