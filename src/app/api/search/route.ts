import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateApiKey } from '@/lib/auth';

// GET /api/search?q=query — Full-text search
export async function GET(req: NextRequest) {
  const auth = validateApiKey(req);
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const tag = searchParams.get('tag') || undefined;
  const source = searchParams.get('source') || undefined;

  try {
    let sql = `
      SELECT
        n.id, n.title, n.source,
        ts_headline('portuguese', n.content, plainto_tsquery('portuguese', $1), 'MaxWords=50, MinWords=20') as snippet,
        ts_rank(n.search_vec, plainto_tsquery('portuguese', $1)) as rank,
        array_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug)) as tags
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.search_vec @@ plainto_tsquery('portuguese', $1)
    `;

    const params: unknown[] = [query];

    let paramIndex = 2;

    if (tag) {
      sql += ` AND EXISTS (
        SELECT 1 FROM note_tags nt2
        JOIN tags t2 ON nt2.tag_id = t2.id
        WHERE nt2.note_id = n.id AND t2.slug = $${paramIndex}
      )`;
      params.push(tag);
      paramIndex++;
    }

    if (source) {
      sql += ` AND n.source = $${paramIndex}`;
      params.push(source);
      paramIndex++;
    }

    sql += `
      GROUP BY n.id
      ORDER BY rank DESC
      LIMIT $${paramIndex};
    `;
    params.push(limit);

    const results = await db.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        source: string;
        snippet: string;
        rank: number;
        tags: Array<{ id: string; name: string; slug: string }> | null;
      }>
    >(sql, ...params);

    const formattedResults = results.map((row) => ({
      id: row.id,
      title: row.title,
      snippet: row.snippet,
      tags: row.tags || [],
      source: row.source,
      rank: row.rank,
    }));

    return NextResponse.json({
      query,
      results: formattedResults,
      total: formattedResults.length,
    });
  } catch (error) {
    console.error('Error searching notes:', error);
    return NextResponse.json({ error: 'Failed to search notes' }, { status: 500 });
  }
}
