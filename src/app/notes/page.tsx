'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import NoteCard from '@/components/NoteCard';
import SearchBar from '@/components/SearchBar';
import { getNotes } from '@/app/actions';

const SOURCES = [
  { value: '', label: 'All Sources' },
  { value: 'auto_claw', label: '🦞 AutoClaw' },
  { value: 'claude_code', label: '🤖 Claude Code' },
  { value: 'codex', label: '🧑‍💻 Codex' },
  { value: 'manual', label: '✋ Manual' },
];

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Created' },
  { value: 'updated_at', label: 'Updated' },
  { value: 'title', label: 'Title' },
];

function NotesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [notes, setNotes] = useState<Awaited<ReturnType<typeof getNotes>>['notes']>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const q = searchParams.get('q') || '';
  const tag = searchParams.get('tag') || '';
  const source = searchParams.get('source') || '';
  const sort = searchParams.get('sort') || 'created_at';
  const order = searchParams.get('order') || 'desc';
  const searchMode = searchParams.get('mode') || 'fulltext';

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    // Reset to page 1 when changing filters
    params.delete('page');
    router.push(`/notes?${params.toString()}`);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getNotes({
          page,
          limit: 20,
          tag: tag || undefined,
          source: source || undefined,
          sort,
          order,
          q: q || undefined,
          searchMode: (searchMode as 'fulltext' | 'semantic' | 'hybrid') || undefined,
        });
        setNotes(data.notes);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch {
        setNotes([]);
      }
      setLoading(false);
    }
    load();
  }, [page, tag, source, sort, order, q, searchMode]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Notes</h1>
          {q && (
            <p className="text-sm text-slate-400 mt-1">
              Search: &ldquo;{q}&rdquo; · {total} results
            </p>
          )}
          {tag && (
            <p className="text-sm text-slate-400 mt-1">
              Tag: <span className="text-emerald-400">{tag}</span> · {total} notes
            </p>
          )}
        </div>
        <a
          href="/notes/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Note
        </a>
      </div>

      {/* Search */}
      <SearchBar defaultValue={q} />

      {/* Search mode toggle (only when searching) */}
      {q && (
        <div className="flex items-center gap-1">
          {([
            { value: 'fulltext', label: '📝 Text' },
            { value: 'semantic', label: '🧠 Semantic' },
            { value: 'hybrid', label: '⚡ Hybrid' },
          ] as const).map((mode) => (
            <button
              key={mode.value}
              onClick={() => updateParams({ mode: searchMode === mode.value ? '' : mode.value })}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                searchMode === mode.value
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {mode.label}
            </button>
          ))}
          {searchMode !== 'fulltext' && (
            <span className="text-xs text-slate-600 ml-1">
              {searchMode === 'semantic' ? 'meaning-based' : 'best of both'}
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Source filter */}
        <select
          value={source}
          onChange={(e) => updateParams({ source: e.target.value })}
          className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:border-emerald-500 transition-colors"
        >
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:border-emerald-500 transition-colors"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Order toggle */}
        <button
          onClick={() => updateParams({ order: order === 'desc' ? 'asc' : 'desc' })}
          className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
          title={order === 'desc' ? 'Newest first' : 'Oldest first'}
        >
          {order === 'desc' ? '↓ Desc' : '↑ Asc'}
        </button>

        {/* Clear filters */}
        {(tag || source || q) && (
          <button
            onClick={() => router.push('/notes')}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-slate-400 animate-pulse">Loading notes...</div>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-slate-400">
            {q ? 'No notes found for that search.' : 'No notes yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                id={note.id}
                title={note.title}
                content={note.content}
                source={note.source}
                createdAt={note.createdAt}
                tags={note.tags}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="text-sm text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense>
      <NotesContent />
    </Suspense>
  );
}
