import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(import.meta.dirname || __dirname, "../.env.local") });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function cleanup() {
  // Find duplicate prompt engineering notes
  const dups = await db.$queryRawUnsafe(`
    SELECT id, title, created_at FROM notes 
    WHERE title = 'Prompt Engineering como disciplina essencial' 
    ORDER BY created_at DESC
  `);
  console.log("Found notes:", dups);

  // Keep the first one, delete the rest
  if (dups.length > 1) {
    const toDelete = dups.slice(1);
    for (const n of toDelete) {
      console.log(`Deleting duplicate: ${n.id}`);
      await db.note.delete({ where: { id: n.id } });
    }
    console.log(`✅ Kept ${dups[0].id}, deleted ${toDelete.length} duplicates`);
  }

  // Backfill embeddings for notes without them
  const missing = await db.$queryRawUnsafe<{ id: string; title: string; content: string }[]>(
    `SELECT id, title, content FROM notes WHERE embedding IS NULL`
  );
  console.log(`\nBackfilling ${missing.length} notes...`);

  const { generateEmbedding } = await import("../src/lib/embeddings");
  for (const note of missing) {
    console.log(`  Embedding: ${note.title}`);
    const emb = await generateEmbedding(note.title, note.content);
    const embStr = `[${emb.join(",")}]`;
    await db.$executeRawUnsafe(
      `UPDATE notes SET embedding = $1::vector WHERE id = $2`,
      embStr, note.id
    );
  }
  console.log("✅ All embeddings up to date");

  await db.$disconnect();
}

cleanup().catch(console.error);
