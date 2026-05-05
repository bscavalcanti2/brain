import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import type { UpdateNoteInput } from '@/types';

// GET /api/notes/:id — Get single note
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateApiKey(req);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  try {
    const note = await db.note.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        linksFrom: { select: { sourceId: true, targetId: true, createdAt: true } },
        linksTo: { select: { sourceId: true, targetId: true, createdAt: true } },
      },
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 });
  }
}

// PUT /api/notes/:id — Update note
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateApiKey(req);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  try {
    const body: UpdateNoteInput = await req.json();

    // Check note exists
    const existing = await db.note.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Validation
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.length === 0) {
        return NextResponse.json({ error: 'Title must be a non-empty string' }, { status: 400 });
      }
      if (body.title.length > 500) {
        return NextResponse.json({ error: 'Title must be 500 characters or less' }, { status: 400 });
      }
    }
    if (body.content !== undefined && body.content.length > 50000) {
      return NextResponse.json({ error: 'Content must be 50,000 characters or less' }, { status: 400 });
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

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    // Handle tag replacement
    if (body.tags !== undefined) {
      // Delete existing tags
      await db.noteTag.deleteMany({ where: { noteId: id } });

      // Create new tags
      const uniqueTags = [...new Set(body.tags)];
      const tagRecords: Array<{ id: string }> = [];
      for (const tagName of uniqueTags) {
        const tagSlug = slugify(tagName);
        const tag = await db.tag.upsert({
          where: { slug: tagSlug },
          update: {},
          create: { name: tagName, slug: tagSlug },
          select: { id: true },
        });
        tagRecords.push(tag);
      }

      updateData.tags = {
        create: tagRecords.map((t) => ({ tagId: t.id })),
      };
    }

    const note = await db.note.update({
      where: { id },
      data: updateData,
      include: {
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        linksFrom: { select: { sourceId: true, targetId: true, createdAt: true } },
        linksTo: { select: { sourceId: true, targetId: true, createdAt: true } },
      },
    });

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

// DELETE /api/notes/:id — Delete note
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateApiKey(req);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  try {
    const existing = await db.note.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    await db.note.delete({ where: { id } });

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
