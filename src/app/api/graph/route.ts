import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/auth';

// GET /api/graph — Knowledge graph (nodes + edges + stats)
export async function GET(req: NextRequest) {
  const auth = validateApiKey(req);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const [notes, links, tagCounts] = await Promise.all([
      // Get all notes as nodes
      db.note.findMany({
        select: {
          id: true,
          title: true,
          source: true,
          tags: { select: { tag: { select: { name: true } } } },
        },
      }),
      // Get all links as edges
      db.noteLink.findMany({
        select: {
          sourceId: true,
          targetId: true,
        },
      }),
      // Get total tag count
      db.tag.count(),
    ]);

    const nodes = notes.map((note) => ({
      id: note.id,
      title: note.title,
      tags: note.tags.map((nt) => nt.tag.name),
      source: note.source,
    }));

    const edges = links.map((link) => ({
      source: link.sourceId,
      target: link.targetId,
    }));

    const stats = {
      totalNotes: notes.length,
      totalLinks: links.length,
      totalTags: tagCounts,
    };

    return NextResponse.json({ nodes, edges, stats });
  } catch (error) {
    console.error('Error fetching graph:', error);
    return NextResponse.json({ error: 'Failed to fetch graph' }, { status: 500 });
  }
}
