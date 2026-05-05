'use server';

import { db } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import type { Note, Tag, NoteLink, SearchResult, GraphNode, GraphEdge } from '@/types';

// ─── GET /api/notes (list) ───────────────────────────────────────────────────

export interface ListNotesParams {
  page?: number;
  limit?: number;
  tag?: string;
  source?: string;
  sort?: string;
  order?: string;
  q?: string;
  searchMode?: 'fulltext' | 'semantic' | 'hybrid';
}

export interface ListNotesResult {
  notes: Array<{
    id: string;
    title: string;
    content?: string;
    source: string;
    createdAt: string;
    updatedAt: string;
    tags: Tag[];
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getNotes(params: ListNotesParams = {}): Promise<ListNotesResult> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const tag = params.tag || undefined;
  const source = params.source || undefined;
  const sort = params.sort || 'created_at';
  const order = params.order || 'desc';

  const sortParamToField: Record<string, string> = {
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    title: 'title',
  };
  const sortField = sortParamToField[sort] || 'createdAt';
  const sortOrder = order === 'asc' ? 'asc' : 'desc';

  // If search query, use full-text search
  if (params.q && params.q.trim().length > 0) {
    const mode = params.searchMode || 'fulltext';
    if (mode === 'semantic') {
      return searchNotesSemantic(params.q.trim(), { page, limit, tag, source });
    } else if (mode === 'hybrid') {
      return searchNotesHybrid(params.q.trim(), { page, limit, tag, source });
    }
    return searchNotesList(params.q.trim(), { page, limit, tag, source, sortField, sortOrder });
  }

  const where: Prisma.NoteWhereInput = {};
  if (tag) {
    where.tags = { some: { tag: { slug: tag } } };
  }
  if (source) {
    where.source = source;
  }

  const orderBy = { [sortField]: sortOrder } as Prisma.NoteOrderByWithRelationInput;

  const [notes, total] = await Promise.all([
    db.note.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
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

  return {
    notes: notes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      source: note.source,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      tags: note.tags.map((nt) => nt.tag),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function searchNotesList(
  query: string,
  opts: {
    page: number;
    limit: number;
    tag?: string;
    source?: string;
    sortField: string;
    sortOrder: string;
  }
): Promise<ListNotesResult> {
  const { page, limit, tag, source } = opts;

  let sql = `
    SELECT
      n.id, n.title, n.content, n.source, n.created_at, n.updated_at,
      array_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug)) as tags,
      ts_rank(n.search_vec, plainto_tsquery('portuguese', $1)) as rank
    FROM notes n
    LEFT JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN tags t ON nt.tag_id = t.id
    WHERE n.search_vec @@ plainto_tsquery('portuguese', $1)
  `;
  const params: unknown[] = [query];
  let paramIndex = 2;

  if (tag) {
    sql += ` AND EXISTS (SELECT 1 FROM note_tags nt2 JOIN tags t2 ON nt2.tag_id = t2.id WHERE nt2.note_id = n.id AND t2.slug = $${paramIndex})`;
    params.push(tag);
    paramIndex++;
  }
  if (source) {
    sql += ` AND n.source = $${paramIndex}`;
    params.push(source);
    paramIndex++;
  }

  sql += ` GROUP BY n.id ORDER BY rank DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const results = await db.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      content: string;
      source: string;
      created_at: Date;
      updated_at: Date;
      tags: Array<{ id: string; name: string; slug: string }> | null;
      rank: number;
    }>
  >(sql, ...params);

  return {
    notes: results.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      source: row.source,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      tags: row.tags || [],
    })),
    total: results.length,
    page,
    limit,
    totalPages: 1,
  };
}

// ─── Semantic Search (pgvector) ──────────────────────────────────────────────

async function searchNotesSemantic(
  query: string,
  opts: { page: number; limit: number; tag?: string; source?: string }
): Promise<ListNotesResult> {
  const { limit, tag, source } = opts;

  try {
    const { generateEmbedding } = await import('@/lib/embeddings');
    const queryEmbedding = await generateEmbedding(query, '');
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const conditions: string[] = ['n.embedding IS NOT NULL'];
    const params: unknown[] = [embeddingStr];
    let pi = 2;

    if (tag) {
      conditions.push(`EXISTS (SELECT 1 FROM note_tags nt JOIN tags t ON nt.tag_id = t.id WHERE nt.note_id = n.id AND t.slug = $${pi})`);
      params.push(tag);
      pi++;
    }
    if (source) {
      conditions.push(`n.source = $${pi}`);
      params.push(source);
      pi++;
    }

    const whereClause = conditions.join(' AND ');

    const results = await db.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        content: string;
        source: string;
        created_at: Date;
        updated_at: Date;
        tags: Array<{ id: string; name: string; slug: string }> | null;
        similarity: number;
      }>
    >(
      `
      SELECT n.id, n.title, n.content, n.source, n.created_at, n.updated_at,
        array_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug)) FILTER (WHERE t.id IS NOT NULL) as tags,
        1 - (n.embedding <=> $1::vector) as similarity
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE ${whereClause}
      GROUP BY n.id
      ORDER BY similarity DESC
      LIMIT $${pi}
      `,
      ...params,
      limit
    );

    return {
      notes: results.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        source: row.source,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        tags: row.tags || [],
      })),
      total: results.length,
      page: 1,
      limit,
      totalPages: 1,
    };
  } catch (err) {
    // If semantic search fails (no API key, etc.), fall back to full-text
    console.warn('[Actions] Semantic search failed, falling back to full-text:', err);
    return searchNotesList(query, { ...opts, sortField: 'created_at', sortOrder: 'desc' });
  }
}

// ─── Hybrid Search (RRF) ─────────────────────────────────────────────────────

async function searchNotesHybrid(
  query: string,
  opts: { page: number; limit: number; tag?: string; source?: string }
): Promise<ListNotesResult> {
  const { limit, tag, source } = opts;
  const RRF_K = 60;

  // Full-text results
  const ftsConditions: string[] = [];
  const ftsParams: unknown[] = [query];
  let pi = 2;

  if (tag) {
    ftsConditions.push(`EXISTS (SELECT 1 FROM note_tags nt JOIN tags t ON nt.tag_id = t.id WHERE nt.note_id = n.id AND t.slug = $${pi})`);
    ftsParams.push(tag);
    pi++;
  }
  if (source) {
    ftsConditions.push(`n.source = $${pi}`);
    ftsParams.push(source);
    pi++;
  }

  const ftsWhere = ftsConditions.length > 0 ? `AND ${ftsConditions.join(' AND ')}` : '';

  const ftsResults = await db.$queryRawUnsafe<
    Array<{ id: string; rank: number }>
  >(
    `
    SELECT n.id, ts_rank(n.search_vec, plainto_tsquery('portuguese', $1)) as rank
    FROM notes n
    WHERE n.search_vec @@ plainto_tsquery('portuguese', $1) ${ftsWhere}
    ORDER BY rank DESC
    LIMIT $${pi}
    `,
    ...ftsParams,
    limit * 2
  );

  // Semantic results
  let semResults: Array<{ id: string; similarity: number }> = [];
  try {
    const { generateEmbedding } = await import('@/lib/embeddings');
    const queryEmbedding = await generateEmbedding(query, '');
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const semConditions: string[] = ['n.embedding IS NOT NULL'];
    const semParams: unknown[] = [embeddingStr];
    pi = 2;

    if (tag) {
      semConditions.push(`EXISTS (SELECT 1 FROM note_tags nt JOIN tags t ON nt.tag_id = t.id WHERE nt.note_id = n.id AND t.slug = $${pi})`);
      semParams.push(tag);
      pi++;
    }
    if (source) {
      semConditions.push(`n.source = $${pi}`);
      semParams.push(source);
      pi++;
    }

    semResults = await db.$queryRawUnsafe<
      Array<{ id: string; similarity: number }>
    >(
      `
      SELECT n.id, 1 - (n.embedding <=> $1::vector) as similarity
      FROM notes n
      WHERE ${semConditions.join(' AND ')}
      ORDER BY similarity DESC
      LIMIT $${pi}
      `,
      ...semParams,
      limit * 2
    );
  } catch (err) {
    console.warn('[Actions] Hybrid: semantic unavailable, using FTS only');
  }

  // Reciprocal Rank Fusion
  const rrfScores = new Map<string, number>();

  ftsResults.forEach((r, idx) => {
    rrfScores.set(r.id, (rrfScores.get(r.id) || 0) + 1 / (RRF_K + idx + 1));
  });

  semResults.forEach((r, idx) => {
    rrfScores.set(r.id, (rrfScores.get(r.id) || 0) + 1 / (RRF_K + idx + 1));
  });

  const sortedIds = [...rrfScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (sortedIds.length === 0) {
    return { notes: [], total: 0, page: 1, limit, totalPages: 1 };
  }

  const noteResults = await db.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      content: string;
      source: string;
      created_at: Date;
      updated_at: Date;
      tags: Array<{ id: string; name: string; slug: string }> | null;
    }>
  >(
    `
    SELECT n.id, n.title, n.content, n.source, n.created_at, n.updated_at,
      array_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug)) FILTER (WHERE t.id IS NOT NULL) as tags
    FROM notes n
    LEFT JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN tags t ON nt.tag_id = t.id
    WHERE n.id = ANY($1::uuid[])
    GROUP BY n.id
    `,
    sortedIds
  );

  // Sort by RRF score
  const scoreOrder = new Map(sortedIds.map((id, idx) => [id, idx]));
  noteResults.sort((a, b) => (scoreOrder.get(a.id) || 0) - (scoreOrder.get(b.id) || 0));

  return {
    notes: noteResults.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      source: row.source,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      tags: row.tags || [],
    })),
    total: noteResults.length,
    page: 1,
    limit,
    totalPages: 1,
  };
}

// ─── GET /api/notes/:id ──────────────────────────────────────────────────────

export async function getNote(id: string): Promise<Note | null> {
  const note = await db.note.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      linksFrom: { select: { sourceId: true, targetId: true, createdAt: true } },
      linksTo: { select: { sourceId: true, targetId: true, createdAt: true } },
    },
  });

  if (!note) return null;

  return {
    id: note.id,
    title: note.title,
    content: note.content,
    source: note.source as Note['source'],
    metadata: note.metadata as Record<string, unknown>,
    tags: note.tags.map((nt) => nt.tag),
    linksFrom: note.linksFrom.map((l) => ({
      sourceId: l.sourceId,
      targetId: l.targetId,
      createdAt: l.createdAt.toISOString(),
    })),
    linksTo: note.linksTo.map((l) => ({
      sourceId: l.sourceId,
      targetId: l.targetId,
      createdAt: l.createdAt.toISOString(),
    })),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

// ─── POST /api/notes (create) ────────────────────────────────────────────────

export interface CreateNoteParams {
  title: string;
  content?: string;
  source?: string;
  tags?: string[];
  linksTo?: string[];
  metadata?: Record<string, unknown>;
}

const VALID_SOURCES = ['auto_claw', 'claude_code', 'codex', 'manual'];

export async function createNote(params: CreateNoteParams): Promise<Note> {
  if (!params.title || typeof params.title !== 'string' || params.title.length === 0) {
    throw new Error('Title is required');
  }
  if (params.title.length > 500) {
    throw new Error('Title must be 500 characters or less');
  }
  if (params.content !== undefined && params.content.length > 50000) {
    throw new Error('Content must be 50,000 characters or less');
  }
  if (params.source !== undefined && !VALID_SOURCES.includes(params.source)) {
    throw new Error(`Source must be one of: ${VALID_SOURCES.join(', ')}`);
  }

  // Validate linked notes exist
  if (params.linksTo && params.linksTo.length > 0) {
    const existingNotes = await db.note.findMany({
      where: { id: { in: params.linksTo } },
      select: { id: true },
    });
    const existingIds = new Set(existingNotes.map((n) => n.id));
    const missingIds = params.linksTo.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      throw new Error(`Notes not found: ${missingIds.join(', ')}`);
    }
  }

  // Create or find tags
  let tagRecords: Array<{ id: string; name: string; slug: string }> = [];
  if (params.tags && params.tags.length > 0) {
    const uniqueTags = [...new Set(params.tags)];
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
      title: params.title,
      content: params.content || '',
      source: params.source || 'manual',
      metadata: (params.metadata || {}) as Prisma.InputJsonValue,
      tags:
        tagRecords.length > 0
          ? { create: tagRecords.map((t) => ({ tagId: t.id })) }
          : undefined,
      linksFrom:
        params.linksTo && params.linksTo.length > 0
          ? { create: params.linksTo.map((targetId) => ({ targetId })) }
          : undefined,
    },
    include: {
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      linksFrom: { select: { sourceId: true, targetId: true, createdAt: true } },
      linksTo: { select: { sourceId: true, targetId: true, createdAt: true } },
    },
  });

  return {
    id: note.id,
    title: note.title,
    content: note.content,
    source: note.source as Note['source'],
    metadata: note.metadata as Record<string, unknown>,
    tags: note.tags.map((nt) => nt.tag),
    linksFrom: note.linksFrom.map((l) => ({
      sourceId: l.sourceId,
      targetId: l.targetId,
      createdAt: l.createdAt.toISOString(),
    })),
    linksTo: note.linksTo.map((l) => ({
      sourceId: l.sourceId,
      targetId: l.targetId,
      createdAt: l.createdAt.toISOString(),
    })),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

// ─── PUT /api/notes/:id (update) ──────────────────────────────────────────────

export interface UpdateNoteParams {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export async function updateNote(params: UpdateNoteParams): Promise<Note> {
  const { id, ...body } = params;

  const existing = await db.note.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Note not found');
  }

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.length === 0) {
      throw new Error('Title must be a non-empty string');
    }
    if (body.title.length > 500) {
      throw new Error('Title must be 500 characters or less');
    }
  }
  if (body.content !== undefined && body.content.length > 50000) {
    throw new Error('Content must be 50,000 characters or less');
  }

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.metadata !== undefined) updateData.metadata = body.metadata;

  if (body.tags !== undefined) {
    await db.noteTag.deleteMany({ where: { noteId: id } });
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

  return {
    id: note.id,
    title: note.title,
    content: note.content,
    source: note.source as Note['source'],
    metadata: note.metadata as Record<string, unknown>,
    tags: note.tags.map((nt) => nt.tag),
    linksFrom: note.linksFrom.map((l) => ({
      sourceId: l.sourceId,
      targetId: l.targetId,
      createdAt: l.createdAt.toISOString(),
    })),
    linksTo: note.linksTo.map((l) => ({
      sourceId: l.sourceId,
      targetId: l.targetId,
      createdAt: l.createdAt.toISOString(),
    })),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

// ─── DELETE /api/notes/:id ────────────────────────────────────────────────────

export async function deleteNote(id: string): Promise<{ deleted: boolean; id: string }> {
  const existing = await db.note.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Note not found');
  }
  await db.note.delete({ where: { id } });
  return { deleted: true, id };
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchNotes(
  query: string,
  limit = 20
): Promise<{ query: string; results: SearchResult[]; total: number }> {
  if (!query || query.trim().length === 0) {
    return { query: '', results: [], total: 0 };
  }

  const results = await db.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      source: string;
      snippet: string;
      rank: number;
      tags: Array<{ id: string; name: string; slug: string }> | null;
    }>
  >(
    `
      SELECT
        n.id, n.title, n.source,
        ts_headline('portuguese', n.content, plainto_tsquery('portuguese', $1), 'MaxWords=50, MinWords=20') as snippet,
        ts_rank(n.search_vec, plainto_tsquery('portuguese', $1)) as rank,
        array_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug)) as tags
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.search_vec @@ plainto_tsquery('portuguese', $1)
      GROUP BY n.id
      ORDER BY rank DESC
      LIMIT $2;
    `,
    query.trim(),
    Math.min(100, Math.max(1, limit))
  );

  return {
    query,
    results: results.map((row) => ({
      id: row.id,
      title: row.title,
      snippet: row.snippet,
      tags: row.tags || [],
      source: row.source,
      rank: row.rank,
    })),
    total: results.length,
  };
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export interface GraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNotes: number;
    totalLinks: number;
    totalTags: number;
  };
}

export async function getGraph(): Promise<GraphResult> {
  const [notes, links, tagCounts] = await Promise.all([
    db.note.findMany({
      select: {
        id: true,
        title: true,
        source: true,
        tags: { select: { tag: { select: { name: true } } } },
      },
    }),
    db.noteLink.findMany({
      select: { sourceId: true, targetId: true },
    }),
    db.tag.count(),
  ]);

  return {
    nodes: notes.map((note) => ({
      id: note.id,
      title: note.title,
      tags: note.tags.map((nt) => nt.tag.name),
      source: note.source,
    })),
    edges: links.map((link) => ({
      source: link.sourceId,
      target: link.targetId,
    })),
    stats: {
      totalNotes: notes.length,
      totalLinks: links.length,
      totalTags: tagCounts,
    },
  };
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export interface TagWithCount {
  name: string;
  slug: string;
  count: number;
}

export async function getTopTags(limit = 20): Promise<TagWithCount[]> {
  const tags = await db.tag.findMany({
    select: {
      name: true,
      slug: true,
      _count: { select: { notes: true } },
    },
    orderBy: { notes: { _count: 'desc' } },
    take: limit,
  });

  return tags.map((t) => ({
    name: t.name,
    slug: t.slug,
    count: t._count.notes,
  }));
}

export async function getAllTags(): Promise<{ name: string; slug: string }[]> {
  const tags = await db.tag.findMany({
    select: { name: true, slug: true },
    orderBy: { name: 'asc' },
  });
  return tags;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalNotes: number;
  notesThisWeek: number;
  totalTags: number;
  bySource: Record<string, number>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [totalNotes, notesThisWeek, totalTags, sourceGroups] = await Promise.all([
    db.note.count(),
    db.note.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    db.tag.count(),
    db.note.groupBy({
      by: ['source'],
      _count: { id: true },
    }),
  ]);

  const bySource: Record<string, number> = {};
  for (const group of sourceGroups) {
    bySource[group.source] = group._count.id;
  }

  return { totalNotes, notesThisWeek, totalTags, bySource };
}

// ─── Links ────────────────────────────────────────────────────────────────────

export async function addLink(sourceId: string, targetId: string): Promise<void> {
  // Verify both notes exist
  const [source, target] = await Promise.all([
    db.note.findUnique({ where: { id: sourceId }, select: { id: true } }),
    db.note.findUnique({ where: { id: targetId }, select: { id: true } }),
  ]);
  if (!source) throw new Error('Source note not found');
  if (!target) throw new Error('Target note not found');

  await db.noteLink.create({
    data: { sourceId, targetId },
  });
}

export async function removeLink(sourceId: string, targetId: string): Promise<void> {
  await db.noteLink.delete({
    where: { sourceId_targetId: { sourceId, targetId } },
  });
}

// ─── Backlinks ────────────────────────────────────────────────────────────────

export interface BacklinkNote {
  id: string;
  title: string;
  source: string;
  createdAt: string;
  tags: Tag[];
}

export async function getBacklinks(noteId: string): Promise<BacklinkNote[]> {
  const links = await db.noteLink.findMany({
    where: { targetId: noteId },
    include: {
      source: {
        select: {
          id: true,
          title: true,
          source: true,
          createdAt: true,
          tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
        },
      },
    },
  });

  return links.map((link) => ({
    id: link.source.id,
    title: link.source.title,
    source: link.source.source,
    createdAt: link.source.createdAt.toISOString(),
    tags: link.source.tags.map((nt) => nt.tag),
  }));
}
