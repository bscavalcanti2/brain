// ─── Config ──────────────────────────────────────────────────────────────────

const EMBEDDING_MODEL = 'embedding-3';
const EMBEDDING_DIMENSIONS = 2048;
const TOKEN_URL = 'http://127.0.0.1:18432/get_token';
const API_BASE = 'https://open.bigmodel.cn/api/paas/v4/embeddings';

let cachedToken: string | null = null;
let tokenExpiry = 0;

// ─── JWT Generation (for production — ZHIPU_API_KEY) ────────────────────────
// Zhipu API keys are in the format "{id}.{secret}"
// We generate a JWT from them: header.payload.signature

function generateJwt(apiKey: string): string {
  const [id, secret] = apiKey.split('.');
  if (!id || !secret) throw new Error('Invalid ZHIPU_API_KEY format. Expected "{id}.{secret}"');

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', sign_type: 'SIGN' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ api_key: id, exp: now + 3600, timestamp: now })
  ).toString('base64url');

  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

// ─── Token Acquisition ──────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  // Production: use ZHIPU_API_KEY env var (works on Vercel, any cloud)
  const zhipuKey = process.env.ZHIPU_API_KEY;
  if (zhipuKey) {
    cachedToken = generateJwt(zhipuKey);
    tokenExpiry = now + 50 * 60 * 1000; // 50 min (JWT lasts 1h)
    return cachedToken;
  }

  // Local dev: use AutoGLM token service (zero config)
  try {
    const res = await fetch(TOKEN_URL, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const text = await res.text();
      cachedToken = text.replace(/^Bearer\s+/i, '').trim();
      tokenExpiry = now + 30 * 60 * 1000;
      return cachedToken;
    }
  } catch {
    // Local service not available
  }

  throw new Error(
    'No embedding token source available. ' +
    'Set ZHIPU_API_KEY env var for production, or ensure AutoGLM token service is running locally.'
  );
}

// ─── Generate Embedding ─────────────────────────────────────────────────────

/**
 * Generate an embedding vector for a given text.
 * Combines title (weighted) + content for better relevance.
 * Uses Zhipu embedding-3 model.
 *
 * Token source priority:
 * 1. ZHIPU_API_KEY env var (production / Vercel)
 * 2. AutoGLM token service at 127.0.0.1:18432 (local dev)
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
