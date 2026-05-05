// Migration: re-create embedding column with Cohere dimensions (1024)
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(import.meta.dirname || __dirname, "../.env.local") });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) { console.error("No DB URL"); process.exit(1); }

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function migrate() {
  console.log("Dropping existing embedding column...");
  await db.$executeRawUnsafe(`ALTER TABLE notes DROP COLUMN IF EXISTS embedding`);
  console.log("✓ Cleaned");

  console.log("Adding embedding column (vector 1536 — Cohere embed-v4.0)...");
  await db.$executeRawUnsafe(`ALTER TABLE notes ADD COLUMN embedding vector(1536)`);
  console.log("✓ Column added");

  console.log("Creating HNSW index...");
  await db.$executeRawUnsafe(
    `CREATE INDEX idx_notes_embedding ON notes USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)`
  );
  console.log("✓ Index created");

  const check = await db.$queryRawUnsafe<Array<{ column_name: string; udt_name: string }>>(
    `SELECT column_name, udt_name FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'embedding'`
  );
  console.log("Verified:", check);

  await db.$disconnect();
  console.log("\n✅ Migration complete!");
}

migrate().catch((e) => { console.error(e); process.exit(1); });
