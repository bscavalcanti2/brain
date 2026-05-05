import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/auth';

// ─── GET /api/search/semantic?q=...&limit=20&tag=...&source=... ─────────────

export async function GET(request: NextRequest) {
  try {
    const auth = validateApiKey(request);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const tag = searchParams.get('tag') || undefined;
    const source = searchParams.get('source') || undefined;

    // Generate embedding for the query
    const { generateEmbedding } = await import('@/lib/embeddings');
    const queryEmbedding = await generateEmbedding(query, '');

    // Convert to string format for pgvector
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Build filters ($1=embedding, $2=query headline, filters start at $3)
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 3;

    conditions.push(`n.embedding IS NOT NULL`);

    if (tag) {
      conditions.push(`EXISTS (
        SELECT 1 FROM note_tags nt 
        JOIN tags t ON nt.tag_id = t.id 
        WHERE nt.note_id = n.id AND t.slug = $${paramIndex}
      )`);
      params.push(tag);
      paramIndex++;
    }

    if (source) {
      conditions.push(`n.source = $${paramIndex}`);
      params.push(source);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
      SELECT 
        n.id,
        n.title,
        n.content,
        n.source,
        n.created_at as "createdAt",
        n.updated_at as "updatedAt",
        1 - (n.embedding <=> $1::vector) as similarity,
        array_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug)) FILTER (WHERE t.id IS NOT NULL) as tags,
        ts_headline('english', n.content, plainto_tsquery('english', $2), 'MaxWords=60, MinWords=25') as snippet
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE ${whereClause}
      GROUP BY n.id
      ORDER BY similarity DESC
      LIMIT $${paramIndex}
    `;

    // $1 = embedding vector, $2 = query string for headline, $3+ = filters, $last = limit
    const sqlParams: unknown[] = [embeddingStr, query, ...params, limit];

    const results = await db.$queryRawUnsafe<any[]>(sql, ...sqlParams);

    return NextResponse.json({
      query,
      mode: 'semantic',
      results: results.map((r) => ({
        id: r.id,
        title: r.title,
        snippet: r.snippet || r.content?.slice(0, 200) || '',
        tags: (r.tags || []).map((t: any) => ({ id: t.id, name: t.name, slug: t.slug })),
        source: r.source,
        rank: parseFloat(r.similarity),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      total: results.length,
    });
  } catch (error: any) {
    if (error?.message?.includes('token')) {
      return NextResponse.json(
        { error: 'Semantic search is not configured. AutoGLM token service is required.' },
        { status: 503 }
      );
    }
    console.error('[Semantic Search Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
