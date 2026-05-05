import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import type { CreateNoteInput } from '@/types';

const VALID_SOURCES = ['auto_claw', 'claude_code', 'codex', 'manual'];

// ─── Background Embedding Generation ─────────────────────────────────────────

async function generateEmbeddingInBackground(noteId: string, title: string, content: string) {
  try {
    const { generateEmbedding } = await import('@/lib/embeddings');
    const embedding = await generateEmbedding(title, content);
    const embeddingStr = `[${embedding.join(',')}]`;
    await db.$executeRawUnsafe(
      `UPDATE notes SET embedding = $1::vector WHERE id = $2`,
      embeddingStr,
      noteId
    );
  } catch (err) {
    // Silently fail — semantic search just won't work for this note
    // Most common cause: AutoGLM token service unavailable
  }
}

// GET /api/notes — List notes
export async function GET(req: NextRequest) {
  const auth = validateApiKey(req);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const tag = searchParams.get('tag') || undefined;
  const source = searchParams.get('source') || undefined;
  const sort = searchParams.get('sort') || 'created_at';
  const order = searchParams.get('order') || 'desc';

  const sortParamToField: Record<string, string> = {
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    title: 'title',
  };
  const sortField = sortParamToField[sort] || 'createdAt';
  const sortOrder = order === 'asc' ? 'asc' : 'desc';

  const where: Prisma.NoteWhereInput = {};
  if (tag) {
    where.tags = { some: { tag: { slug: tag } } };
  }
  if (source) {
    where.source = source;
  }

  const orderBy = { [sortField]: sortOrder } as Prisma.NoteOrderByWithRelationInput;

  try {
    const [notes, total] = await Promise.all([
      db.note.findMany({
        where,
        select: {
          id: true,
          title: true,
          source: true,
          createdAt: true,
          updatedAt: true,
          tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.note.count({ where }),
    ]);

    const formattedNotes = notes.map((note) => ({
      id: note.id,
      title: note.title,
      source: note.source,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      tags: note.tags.map((nt) => nt.tag),
    }));

    return NextResponse.json({
      notes: formattedNotes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error listing notes:', error);
    return NextResponse.json({ error: 'Failed to list notes' }, { status: 500 });
  }
}

// POST /api/notes — Create note
export async function POST(req: NextRequest) {
  const auth = validateApiKey(req);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body: CreateNoteInput = await req.json();

    // Validation
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (body.title.length > 500) {
      return NextResponse.json({ error: 'Title must be 500 characters or less' }, { status: 400 });
    }
    if (body.content !== undefined && body.content.length > 50000) {
      return NextResponse.json({ error: 'Content must be 50,000 characters or less' }, { status: 400 });
    }
    if (body.source !== undefined && !VALID_SOURCES.includes(body.source)) {
      return NextResponse.json(
        { error: `Source must be one of: ${VALID_SOURCES.join(', ')}` },
        { status: 400 }
      );
    }
    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags) || body.tags.length > 10) {
        return NextResponse.json({ error: 'Tags must be an array of up to 10 strings' }, { status: 400 });
      }
      for (const tag of body.tags) {
        if (typeof tag !== 'string' || tag.length > 50) {
          return NextResponse.json({ error: 'Each tag must be a string of 50 characters or less' }, { status: 400 });
        }
      }
    }
    if (body.linksTo !== undefined) {
      if (!Array.isArray(body.linksTo)) {
        return NextResponse.json({ error: 'linksTo must be an array of note IDs' }, { status: 400 });
      }
    }

    // Validate that linked notes exist
    if (body.linksTo && body.linksTo.length > 0) {
      const existingNotes = await db.note.findMany({
        where: { id: { in: body.linksTo } },
        select: { id: true },
      });
      const existingIds = new Set(existingNotes.map((n) => n.id));
      const missingIds = body.linksTo.filter((id) => !existingIds.has(id));
      if (missingIds.length > 0) {
        return NextResponse.json(
          { error: `Notes not found: ${missingIds.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Create or find tags
    let tagRecords: Array<{ id: string; name: string; slug: string }> = [];
    if (body.tags && body.tags.length > 0) {
      const uniqueTags = [...new Set(body.tags)];
      for (const tagName of uniqueTags) {
        const tagSlug = slugify(tagName);
        const tag = await db.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { name: tagName, slug: tagSlug },
          select: { id: true, name: true, slug: true },
        });
        tagRecords.push(tag);
      }
    }

    const note = await db.note.create({
      data: {
        title: body.title,
        content: body.content || '',
        source: body.source || 'manual',
        metadata: (body.metadata || {}) as Prisma.InputJsonValue,
        tags: tagRecords.length > 0
          ? { create: tagRecords.map((t) => ({ tagId: t.id })) }
          : undefined,
        // linksTo in the API means "this note links TO those notes"
        // In the schema, linksFrom means "this note is the source of links"
        // So we create links FROM this note TO the target note IDs
        linksFrom: body.linksTo && body.linksTo.length > 0
          ? { create: body.linksTo.map((targetId) => ({ targetId })) }
          : undefined,
      },
      include: {
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        linksFrom: { select: { sourceId: true, targetId: true, createdAt: true } },
        linksTo: { select: { sourceId: true, targetId: true, createdAt: true } },
      },
    });

    return NextResponse.json(
      {
        id: note.id,
        title: note.title,
        content: note.content,
        source: note.source,
        metadata: note.metadata as Record<string, unknown>,
        tags: note.tags.map((nt) => nt.tag),
        linksFrom: note.linksFrom,
        linksTo: note.linksTo,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
      { status: 201 }
    );

    // Generate embedding in background (non-blocking)
    generateEmbeddingInBackground(note.id, note.title, note.content).catch((err) => {
      console.warn('[Embedding] Background generation failed:', err);
    });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
