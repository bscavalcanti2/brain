import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/auth';

// ─── GET /api/search/hybrid?q=...&limit=20&tag=...&source=... ───────────────
// Combines full-text search + semantic search using Reciprocal Rank Fusion (RRF)
// RRF score = sum(1 / (k + rank_i)) for each ranking method
// k = 60 (standard constant)

const RRF_K = 60;

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

    // ─── Full-text search ──────────────────────────────────────────────────
    const ftsConditions: string[] = [];
    const ftsParams: any[] = [];
    let pi = 1;

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

    const ftsResults: Array<{ id: string; rank: number }> = await db.$queryRawUnsafe(
      `
        SELECT n.id, ts_rank(n.search_vec, websearch_to_tsquery('english', $1)) as rank
        FROM notes n
        WHERE n.search_vec @@ websearch_to_tsquery('english', $1) ${ftsWhere}
        ORDER BY rank DESC
        LIMIT $${pi}
      `,
      query, ...ftsParams, limit * 2
    );

    // ─── Semantic search ───────────────────────────────────────────────────
    let semResults: Array<{ id: string; similarity: number }> = [];

    try {
      const { generateEmbedding } = await import('@/lib/embeddings');
      const queryEmbedding = await generateEmbedding(query, '');
      const embeddingStr = `[${queryEmbedding.join(',')}]`;

      const semConditions: string[] = ['n.embedding IS NOT NULL'];
      const semParams: any[] = [];
      pi = 1;

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

      const semWhere = semConditions.join(' AND ');

      semResults = await db.$queryRawUnsafe(
        `
          SELECT n.id, 1 - (n.embedding <=> $1::vector) as similarity
          FROM notes n
          WHERE ${semWhere}
          ORDER BY similarity DESC
          LIMIT $${pi}
        `,
        embeddingStr, ...semParams, limit * 2
      );
    } catch (err) {
      // If semantic search fails (e.g. no API key), fall back to FTS only
      console.warn('[Hybrid Search] Semantic search unavailable, using FTS only:', err);
    }

    // ─── Reciprocal Rank Fusion ───────────────────────────────────────────
    const rrfScores = new Map<string, { score: number; ftsRank?: number; semRank?: number }>();

    ftsResults.forEach((r, idx) => {
      const existing = rrfScores.get(r.id) || { score: 0 };
      rrfScores.set(r.id, {
        ...existing,
        score: existing.score + 1 / (RRF_K + idx + 1),
        ftsRank: r.rank,
      });
    });

    semResults.forEach((r, idx) => {
      const existing = rrfScores.get(r.id) || { score: 0 };
      rrfScores.set(r.id, {
        ...existing,
        score: existing.score + 1 / (RRF_K + idx + 1),
        semRank: r.similarity,
      });
    });

    // Sort by RRF score and take top N
    const sortedIds = [...rrfScores.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit)
      .map(([id]) => id);

    // Fetch full note data for results
    if (sortedIds.length === 0) {
      return NextResponse.json({ query, mode: 'hybrid', results: [], total: 0 });
    }

    const noteResults = await db.$queryRawUnsafe<any[]>(
      `
        SELECT 
          n.id, n.title, n.source, n.created_at as "createdAt", n.updated_at as "updatedAt",
          array_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug)) FILTER (WHERE t.id IS NOT NULL) as tags,
          ts_headline('english', n.content, websearch_to_tsquery('english', $1), 'MaxWords=60, MinWords=25') as snippet
        FROM notes n
        LEFT JOIN note_tags nt ON n.id = nt.note_id
        LEFT JOIN tags t ON nt.tag_id = t.id
        WHERE n.id = ANY($2::uuid[])
        GROUP BY n.id
      `,
      query, sortedIds
    );

    // Merge scores into results and sort by RRF score
    const results = noteResults.map((r) => {
      const scores = rrfScores.get(r.id)!;
      return {
        id: r.id,
        title: r.title,
        snippet: r.snippet || '',
        tags: (r.tags || []).map((t: any) => ({ id: t.id, name: t.name, slug: t.slug })),
        source: r.source,
        rank: scores.score,
        ftsRank: scores.ftsRank,
        semRank: scores.semRank,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    }).sort((a, b) => b.rank - a.rank);

    return NextResponse.json({
      query,
      mode: semResults.length > 0 ? 'hybrid' : 'fulltext-fallback',
      results,
      total: results.length,
      meta: {
        ftsResults: ftsResults.length,
        semanticResults: semResults.length,
        fusedResults: results.length,
      },
    });
  } catch (error: any) {
    console.error('[Hybrid Search Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
