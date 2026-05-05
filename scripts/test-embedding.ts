import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(import.meta.dirname || __dirname, "../.env.local") });
import { generateEmbedding, EMBEDDING_DIMENSIONS } from "../src/lib/embeddings";

async function test() {
  console.log("Dimensions:", EMBEDDING_DIMENSIONS);
  const start = Date.now();
  const emb = await generateEmbedding("Test note", "This is a test note about productivity and knowledge management");
  console.log("Generated:", emb.length, "dimensions in", Date.now() - start, "ms");
  console.log("First 5:", emb.slice(0, 5));
  console.log("✅ Cohere embeddings working!");
}

test().catch(console.error);
