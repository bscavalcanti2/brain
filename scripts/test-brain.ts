import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(import.meta.dirname || __dirname, "../.env.local") });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function test() {
  console.log("=== Recent Notes ===");
  const notes = await db.note.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { tags: { include: { tag: { select: { name: true } } } } },
  });
  for (const n of notes) {
    const tags = n.tags.map(t => t.tag.name).join(", ");
    console.log(`• ${n.title} [${n.source}] ${tags ? `(${tags})` : ""}`);
  }

  console.log("\n=== Full-text Search: 'prompt engineering' ===");
  const fts = await db.$queryRawUnsafe(`
    SELECT n.title, ts_rank(n.search_vec, plainto_tsquery('english', 'prompt engineering')) as rank
    FROM notes n WHERE n.search_vec @@ plainto_tsquery('english', 'prompt engineering')
    ORDER BY rank DESC LIMIT 5
  `);
  console.log(fts);

  console.log("\n=== Semantic Search: 'tokens economia' ===");
  const { generateEmbedding } = await import("../src/lib/embeddings");
  const emb = await generateEmbedding("tokens economia", "");
  const embStr = `[${emb.join(",")}]`;
  const sem = await db.$queryRawUnsafe(`
    SELECT n.title, 1 - (n.embedding <=> $1::vector) as similarity
    FROM notes n WHERE n.embedding IS NOT NULL
    ORDER BY similarity DESC LIMIT 5
  `, embStr);
  console.log(sem);

  console.log("\n=== All Notes with Embeddings ===");
  const withEmb = await db.$queryRawUnsafe(`
    SELECT id, title, CASE WHEN embedding IS NOT NULL THEN true ELSE false END as has_emb FROM notes ORDER BY created_at DESC
  `);
  console.log(withEmb);

  await db.$disconnect();
}

test().catch(console.error);
