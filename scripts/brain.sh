#!/usr/bin/env bash
# brain.sh — CLI for Bruno's Second Brain
# Usage: brain add "title" "content" [tag1,tag2]
#        brain search "query"
#        brain list [limit]
#        brain get <note-id>
#        brain tags

set -euo pipefail

BRAIN_URL="${BRAIN_URL:-http://localhost:3000/api}"
BRAIN_KEY="${BRAIN_KEY:-}"

if [ -z "$BRAIN_KEY" ]; then
  # Try to load from workspace brain env
  ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env.local"
  if [ -f "$ENV_FILE" ]; then
    BRAIN_KEY=$(grep BRAIN_API_KEY "$ENV_FILE" | cut -d= -f2 | tr -d '"' | tr -d ' ')
  fi
fi

if [ -z "$BRAIN_KEY" ]; then
  echo "Error: BRAIN_API_KEY not set. Set BRAIN_KEY env var or add to .env.local" >&2
  exit 1
fi

AUTH="Authorization: Bearer $BRAIN_KEY"

case "${1:-}" in
  add)
    TITLE="${2:?Usage: brain add \"title\" \"content\" [tag1,tag2]}"
    CONTENT="${3:-}"
    TAGS="${4:-}"
    
    BODY=$(jq -n \
      --arg title "$TITLE" \
      --arg content "$CONTENT" \
      --arg source "auto_claw" \
      --argjson tags "$(echo "$TAGS" | jq -R 'split(",") | map(select(length > 0))' 2>/dev/null || echo '[]')" \
      '{title: $title, content: $content, source: $source, tags: $tags}')
    
    curl -sf -X POST -H "$AUTH" -H "Content-Type: application/json" \
      "$BRAIN_URL/notes" -d "$BODY" | jq '{id, title, tags: [.tags[].name]}'
    ;;

  search)
    QUERY="${2:?Usage: brain search \"query\"}"
    MODE="${3:-fulltext}"  # fulltext | semantic | hybrid
    
    curl -sf -H "$AUTH" "$BRAIN_URL/search/$( [ "$MODE" = "fulltext" ] && echo "" || echo "$MODE")?q=$(echo "$QUERY" | jq -sRr @uri)&limit=10" 2>/dev/null | \
      jq -r '.results[]? // .[]? | "\(.id | split("-")[0])… \(.title)\n   \(.tags // [] | map(.name) | join(", "))\n   \(.snippet // "" | .[0:120])\n"'
    ;;

  list)
    LIMIT="${2:-10}"
    curl -sf -H "$AUTH" "$BRAIN_URL/notes?limit=$LIMIT&sort=created_at&order=desc" | \
      jq -r '.notes[] | "\(.id | split("-")[0])… \(.title)\n   \(.tags | map(.name) | join(", "))\n"'
    ;;

  get)
    ID="${2:?Usage: brain get <note-id>}"
    curl -sf -H "$AUTH" "$BRAIN_URL/notes/$ID" | jq '{title, content, tags: [.tags[].name], source}'
    ;;

  tags)
    curl -sf -H "$AUTH" "$BRAIN_URL/notes?limit=100" | \
      jq -r '[.notes[].tags[].name] | flatten | group_by(.) | map({tag: .[0], count: length}) | sort_by(-.count) | .[] | "\(.tag) (\(.count))"'
    ;;

  embed-status)
    curl -sf -H "$AUTH" "$BRAIN_URL/embeddings/generate" | jq .
    ;;

  embed-backfill)
    curl -sf -X POST -H "$AUTH" -H "Content-Type: application/json" \
      "$BRAIN_URL/embeddings/generate" -d '{"batchSize":20}' | jq .
    ;;

  *)
    echo "🧠 Bruno's Brain CLI"
    echo ""
    echo "Usage:"
    echo "  brain add \"title\" \"content\" [tag1,tag2]  — Add a note"
    echo "  brain search \"query\" [mode]               — Search (fulltext|semantic|hybrid)"
    echo "  brain list [limit]                         — List recent notes"
    echo "  brain get <note-id>                        — Get note details"
    echo "  brain tags                                 — Show tag cloud"
    echo "  brain embed-status                         — Check embedding coverage"
    echo "  brain embed-backfill                       — Generate embeddings for all notes"
    echo ""
    echo "Env:"
    echo "  BRAIN_URL  — API base URL (default: http://localhost:3000/api)"
    echo "  BRAIN_KEY  — API key (or set in .env.local)"
    ;;
esac
