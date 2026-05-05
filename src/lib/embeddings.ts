// ─── Config ──────────────────────────────────────────────────────────────────

const EMBEDDING_MODEL = 'embedding-3';
const EMBEDDING_DIMENSIONS = 2048;
const TOKEN_URL = 'http://127.0.0.1:18432/get_token';
const API_BASE = 'https://open.bigmodel.cn/api/paas/v4/embeddings';

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }
  const res = await fetch(TOKEN_URL);
  if (!res.ok) throw new Error('Failed to get token from local service');
  const text = await res.text();
  // Response is "Bearer <token>" or just "<token>"
  cachedToken = text.replace(/^Bearer\s+/i, '').trim();
  // Cache for 30 minutes (tokens typically last longer)
  tokenExpiry = now + 30 * 60 * 1000;
  return cachedToken;
}

// ─── Generate Embedding ─────────────────────────────────────────────────────

/**
 * Generate an embedding vector for a given text.
 * Combines title (weighted) + content for better relevance.
 * Uses Zhipu embedding-3 model via AutoGLM token service.
 */
export async function generateEmbedding(title: string, content: string): Promise<number[]> {
  const token = await getToken();

  // Combine title and content with weighting
  const text = `${title}\n${title}\n${content}`.slice(0, 8000);

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zhipu embedding API error: ${res.status} ${body}`);
  }

  const data = await res.json();

  if (!data.data?.[0]?.embedding) {
    throw new Error('Invalid embedding response from Zhipu API');
  }

  return data.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a single batch call.
 */
export async function generateEmbeddingsBatch(
  texts: Array<{ title: string; content: string }>
): Promise<Array<{ index: number; embedding: number[] }>> {
  const token = await getToken();

  const inputs = texts.map(
    ({ title, content }) => `${title}\n${title}\n${content}`.slice(0, 8000)
  );

  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zhipu embedding API error: ${res.status} ${body}`);
  }

  const data = await res.json();

  if (!data.data || !Array.isArray(data.data)) {
    throw new Error('Invalid batch embedding response from Zhipu API');
  }

  return data.data.map((item: any) => ({
    index: item.index,
    embedding: item.embedding,
  }));
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
