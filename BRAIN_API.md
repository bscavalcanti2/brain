# 🧠 Bruno's Brain API

Quick reference for AI agents to interact with Bruno's Second Brain.

## Base URL
https://brain-bruno.vercel.app/api

## Authentication
Include this header in every request:
Authorization: Bearer <API_KEY>

## Quick Examples

### Search for notes
curl -s -H "Authorization: Bearer <API_KEY>" \
  "https://brain-bruno.vercel.app/api/search?q=pokemon+vendas"

### Create a note
curl -X POST -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Meu pensamento","content":"Detalhes aqui...","source":"auto_claw","tags":["ideia"]}' \
  "https://brain-bruno.vercel.app/api/notes"

### Get a specific note
curl -s -H "Authorization: Bearer <API_KEY>" \
  "https://brain-bruno.vercel.app/api/notes/<NOTE_ID>"

### List recent notes
curl -s -H "Authorization: Bearer <API_KEY>" \
  "https://brain-bruno.vercel.app/api/notes?limit=10&sort=created_at&order=desc"

### Update a note
curl -X PUT -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Updated content..."}' \
  "https://brain-bruno.vercel.app/api/notes/<NOTE_ID>"

### Get knowledge graph
curl -s -H "Authorization: Bearer <API_KEY>" \
  "https://brain-bruno.vercel.app/api/graph"

## Source Values
When creating notes, use these source values:
- "auto_claw" — Created by AutoClaw
- "claude_code" — Created by Claude Code
- "codex" — Created by Codex
- "manual" — Created by Bruno via UI

## Notes
- All content is markdown
- Tags are auto-created if they don't exist
- Search supports English full-text search (tsvector)
- Max 50,000 characters per note content
- Max 10 tags per note
