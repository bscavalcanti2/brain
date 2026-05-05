# 🧠 Bruno's Second Brain

You have access to Bruno's Second Brain — a shared knowledge base used by all AI agents.

## Quick Reference

**Base URL:** `https://brain-bruno.vercel.app/api`
**Auth:** Include `Authorization: Bearer <API_KEY>` header (key is in your environment)

### Common Operations

```bash
# Search notes (full-text)
curl -sf -H "Authorization: Bearer $BRAIN_API_KEY" \
  "https://brain-bruno.vercel.app/api/search?q=some+query"

# Search notes (semantic — meaning-based)
curl -sf -H "Authorization: Bearer $BRAIN_API_KEY" \
  "https://brain-bruno.vercel.app/api/search/semantic?q=some+query"

# Search notes (hybrid — best of both)
curl -sf -H "Authorization: Bearer $BRAIN_API_KEY" \
  "https://brain-bruno.vercel.app/api/search/hybrid?q=some+query"

# Add a note
curl -sf -X POST -H "Authorization: Bearer $BRAIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Note Title","content":"Markdown content here","source":"claude_code","tags":["tag1","tag2"]}' \
  "https://brain-bruno.vercel.app/api/notes"

# List recent notes
curl -sf -H "Authorization: Bearer $BRAIN_API_KEY" \
  "https://brain-bruno.vercel.app/api/notes?limit=10"

# Get a specific note
curl -sf -H "Authorization: Bearer $BRAIN_API_KEY" \
  "https://brain-bruno.vercel.app/api/notes/<NOTE_ID>"
```

### When to Use the Brain

- **Before starting work:** Search for relevant context from previous sessions
- **After learning something:** Save it as a note (decisions, lessons, discoveries)
- **When switching contexts:** Quick search to rebuild context
- **For persistent memory:** Notes survive sessions — use them for anything worth remembering

### Source Values

When creating notes, use `"source": "claude_code"` to mark notes as yours.

### Best Practices

- Always search before adding — avoid duplicates
- Use descriptive titles
- Add relevant tags (max 10)
- Keep content focused — one topic per note
- Use markdown formatting in content
- Link related notes together when possible
