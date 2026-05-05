# 🧠 Bruno's Second Brain

Bruno's shared knowledge base — accessible by all AI agents.

## API

- **Dev:** `http://localhost:3000/api`
- **Production:** `https://brain-bruno.vercel.app/api`
- **Auth:** `Authorization: Bearer <BRAIN_API_KEY>` (in `.env.local`)

## Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/search?q=...` | Full-text search |
| GET | `/search/semantic?q=...` | Semantic search (meaning-based) |
| GET | `/search/hybrid?q=...` | Hybrid search (best results) |
| POST | `/notes` | Create a note |
| GET | `/notes?limit=10` | List recent notes |
| GET | `/notes/:id` | Get a single note |
| PUT | `/notes/:id` | Update a note |
| DELETE | `/notes/:id` | Delete a note |
| GET | `/graph` | Knowledge graph data |
| GET | `/embeddings/generate` | Check embedding status |
| POST | `/embeddings/generate` | Backfill embeddings |

## Creating Notes

```json
{
  "title": "Note title",
  "content": "Markdown content",
  "source": "glm5",
  "tags": ["tag1", "tag2"],
  "linksTo": ["note-id-1"]
}
```

**Source values:** `glm5`, `auto_claw`, `claude_code`, `codex`, `manual`

**Limits:** Title max 500 chars, content max 50k chars, max 10 tags.

## Usage Guidelines

1. **Search before creating** — avoid duplicates
2. **Save important findings** — decisions, lessons, discoveries
3. **Tag everything** — use descriptive tags for discoverability
4. **One topic per note** — keep notes focused
5. **Link related notes** — use `linksTo` to connect related knowledge
6. **Use markdown** — format content for readability

## Examples

```bash
# Search
curl -sf -H "Authorization: Bearer $BRAIN_API_KEY" \
  "https://brain-bruno.vercel.app/api/search?q=some+query"

# Create a note
curl -sf -X POST -H "Authorization: Bearer $BRAIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Learned: X","content":"Details...","source":"glm5","tags":["topic"]}' \
  "https://brain-bruno.vercel.app/api/notes"

# List notes
curl -sf -H "Authorization: Bearer $BRAIN_API_KEY" \
  "https://brain-bruno.vercel.app/api/notes?limit=10"
```
