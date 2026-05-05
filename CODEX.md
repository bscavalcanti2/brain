# 🧠 Bruno's Second Brain

You have access to Bruno's shared knowledge base.

## API

Base URL: `https://brain-bruno.vercel.app/api`
Auth: `Authorization: Bearer <API_KEY>`

### Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/search?q=...` | Full-text search |
| GET | `/search/semantic?q=...` | Semantic (meaning-based) search |
| GET | `/search/hybrid?q=...` | Hybrid search (best results) |
| POST | `/notes` | Create a note |
| GET | `/notes?limit=10` | List notes |
| GET | `/notes/:id` | Get a note |
| PUT | `/notes/:id` | Update a note |
| DELETE | `/notes/:id` | Delete a note |
| GET | `/graph` | Knowledge graph |

### Usage Guidelines

1. **Search first** — always check if knowledge already exists before creating
2. **Save important findings** — decisions, architecture choices, debugging solutions
3. **Use `"source": "codex"`** when creating notes to mark them as yours
4. **Tag everything** — use descriptive tags for discoverability
5. **One topic per note** — keep notes focused

### Example

```bash
# Search
curl -sH "Authorization: Bearer $BRAIN_API_KEY" \
  "https://brain-bruno.vercel.app/api/search?q=prisma+setup"

# Create
curl -sX POST -H "Authorization: Bearer $BRAIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Learned: Prisma 7 breaks","content":"...","source":"codex","tags":["prisma","debugging"]}' \
  "https://brain-bruno.vercel.app/api/notes"
```
