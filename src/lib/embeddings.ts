// ─── Config ──────────────────────────────────────────────────────────────────

const EMBEDDING_MODEL = 'embed-v4.0';
const EMBEDDING_DIMENSIONS = 1536;
const STORED_DIMENSIONS = 1536;
const API_BASE = 'https://api.cohere.com/v2/embed';

// ─── Token Acquisition ──────────────────────────────────────────────────────
// Cohere API key from env var. Free tier: 1000 calls/month.
// Get yours at https://dashboard.cohere.com/api-keys

function getCohereKey(): string {
  const key = process.env.COHERE_API_KEY;
  if (!key) {
    throw new Error(
      'COHERE_API_KEY not set. ' +
      'Get a free API key at https://dashboard.cohere.com/api-keys'
    );
  }
  return key;
}

// ─── Generate Embedding ─────────────────────────────────────────────────────

/**
 * Generate an embedding vector for a given text.
 * Uses Cohere embed-v4.0 (1024 dimensions, multilingual).
 *
 * Works locally AND on Vercel — just set COHERE_API_KEY env var.
 * Free tier: 1000 calls/month at https://dashboard.cohere.com
 */
export async function generateEmbedding(title: string, content: string): Promise<number[]> {
  const key = getCohereKey();

  const text = `${title}\n${title}\n${content}`.slice(0, 8000);

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      texts: [text],
      embedding_types: ['float'],
      input_type: 'search_document',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cohere embedding API error: ${res.status} ${body}`);
  }

  const data = await res.json();

  if (!data.embeddings?.float?.[0]) {
    throw new Error('Invalid embedding response from Cohere API');
  }

  return data.embeddings.float[0];
}

/**
 * Generate embeddings for multiple texts in a single batch call.
 */
export async function generateEmbeddingsBatch(
  texts: Array<{ title: string; content: string }>
): Promise<Array<{ index: number; embedding: number[] }>> {
  const key = getCohereKey();

  const inputs = texts.map(
    ({ title, content }) => `${title}\n${title}\n${content}`.slice(0, 8000)
  );

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      texts: inputs,
      embedding_types: ['float'],
      input_type: 'search_document',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cohere embedding API error: ${res.status} ${body}`);
  }

  const data = await res.json();

  if (!data.embeddings?.float) {
    throw new Error('Invalid batch embedding response from Cohere API');
  }

  return data.embeddings.float.map((embedding: number[], index: number) => ({
    index,
    embedding,
  }));
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
