import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(import.meta.dirname || __dirname, "../.env.local") });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function addNote() {
  const note = await db.note.create({
    data: {
      title: "Prompt Engineering como disciplina essencial",
      content: "Prompt engineering gera economia de tokens e é uma disciplina que vai ser MUITO relevante nesse novo mundo de IA.",
      source: "auto_claw",
    },
  });

  // Create tags
  const tags = ["prompt-engineering", "ia", "tokens", "economia"];
  for (const tagName of tags) {
    const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const tag = await db.tag.upsert({
      where: { slug },
      update: {},
      create: { name: tagName, slug },
    });
    await db.noteTag.create({ data: { noteId: note.id, tagId: tag.id } });
  }

  console.log("✅ Note created:", note.id);
  console.log("Title:", note.title);
  console.log("Tags:", tags);
  await db.$disconnect();
}

addNote().catch(console.error);
