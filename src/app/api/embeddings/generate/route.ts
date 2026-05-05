import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/auth';

// ─── POST /api/embeddings/generate ──────────────────────────────────────────
// Generate embeddings for existing notes that don't have one yet.
// Call this after setting OPENAI_API_KEY to backfill embeddings.

export async function POST(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const batchSize = Math.min(50, Math.max(1, body.batchSize || 20));
    const dryRun = body.dryRun === true;

    // Find notes without embeddings
    const notes = await db.$queryRawUnsafe<Array<{ id: string; title: string; content: string }>>(
      `SELECT id, title, content FROM notes WHERE embedding IS NULL ORDER BY created_at ASC LIMIT $1`,
      batchSize
    );

    if (notes.length === 0) {
      return NextResponse.json({ message: 'All notes already have embeddings', processed: 0 });
    }

    if (dryRun) {
      return NextResponse.json({
        message: `Would process ${notes.length} notes`,
        notes: notes.map(n => ({ id: n.id, title: n.title, contentLength: n.content.length })),
        processed: 0,
      });
    }

    // Generate embeddings
    const { generateEmbeddingsBatch } = await import('@/lib/embeddings');
    const batch = await generateEmbeddingsBatch(notes);

    // Update notes with embeddings
    let updated = 0;
    for (const item of batch) {
      const note = notes[item.index];
      const embeddingStr = `[${item.embedding.join(',')}]`;
      await db.$executeRawUnsafe(
        `UPDATE notes SET embedding = $1::vector WHERE id = $2`,
        embeddingStr,
        note.id
      );
      updated++;
    }

    return NextResponse.json({
      message: `Generated embeddings for ${updated} notes`,
      processed: updated,
      remaining: await getRemainingCount(),
    });
  } catch (error: any) {
    if (error?.message?.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY environment variable is not set' },
        { status: 503 }
      );
    }
    console.error('[Embedding Generation Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── GET /api/embeddings/generate ───────────────────────────────────────────
// Check how many notes are missing embeddings

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const remaining = await getRemainingCount();
    const total = await getTotalCount();

    return NextResponse.json({
      total,
      withEmbeddings: total - remaining,
      withoutEmbeddings: remaining,
    });
  } catch (error: any) {
    console.error('[Embedding Status Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getRemainingCount(): Promise<number> {
  const result = await db.$queryRawUnsafe<Array<{ count: string }>>(
    `SELECT COUNT(*)::text as count FROM notes WHERE embedding IS NULL`
  );
  return parseInt(result[0]?.count || '0');
}

async function getTotalCount(): Promise<number> {
  const result = await db.$queryRawUnsafe<Array<{ count: string }>>(
    `SELECT COUNT(*)::text as count FROM notes`
  );
  return parseInt(result[0]?.count || '0');
}
