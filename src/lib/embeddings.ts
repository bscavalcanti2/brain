import OpenAI from 'openai';

// ─── Config ──────────────────────────────────────────────────────────────────

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ─── Generate Embedding ─────────────────────────────────────────────────────

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate an embedding vector for a given text.
 * Combines title (weighted) + content for better relevance.
 */
export async function generateEmbedding(title: string, content: string): Promise<number[]> {
  const client = getOpenAIClient();

  // Combine title and content with weighting
  // Repeating the title gives it more influence in the embedding
  const text = `${title}\n${title}\n${content}`.slice(0, 8000); // OpenAI limit ~8k tokens

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in a single batch call (more efficient).
 */
export async function generateEmbeddingsBatch(
  texts: Array<{ title: string; content: string }>
): Promise<Array<{ index: number; embedding: number[] }>> {
  const client = getOpenAIClient();

  const inputs = texts.map(
    ({ title, content }) => `${title}\n${title}\n${content}`.slice(0, 8000)
  );

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: inputs,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data.map((item) => ({
    index: item.index,
    embedding: item.embedding,
  }));
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
