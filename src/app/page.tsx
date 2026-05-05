import Link from 'next/link';
import NoteCard from '@/components/NoteCard';
import QuickCapture from '@/components/QuickCapture';
import { getNotes, getDashboardStats } from '@/app/actions';

function sourceIcon(source: string): string {
  switch (source) {
    case 'auto_claw': return '🦞';
    case 'claude_code': return '🤖';
    case 'codex': return '🧑‍💻';
    default: return '✋';
  }
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'auto_claw': return 'AutoClaw';
    case 'claude_code': return 'Claude Code';
    case 'codex': return 'Codex';
    default: return 'Manual';
  }
}

export default async function DashboardPage() {
  let stats = { totalNotes: 0, notesThisWeek: 0, totalTags: 0, bySource: {} as Record<string, number> };
  let recentNotes: Array<{
    id: string;
    title: string;
    content?: string;
    source: string;
    createdAt: string;
    updatedAt: string;
    tags: Array<{ id: string; name: string; slug: string }>;
  }> = [];

  try {
    const notesData = await getNotes({ limit: 10, sort: 'created_at', order: 'desc' });
    recentNotes = notesData.notes;
    stats = await getDashboardStats();
  } catch {
    // DB not configured yet
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Your knowledge base at a glance</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-2xl font-bold text-white">{stats.totalNotes}</p>
          <p className="text-sm text-slate-400 mt-1">Total Notes</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-2xl font-bold text-emerald-400">{stats.notesThisWeek}</p>
          <p className="text-sm text-slate-400 mt-1">This Week</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-2xl font-bold text-blue-400">{stats.totalTags}</p>
          <p className="text-sm text-slate-400 mt-1">Total Tags</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.entries(stats.bySource).map(([source, count]) => (
              <span key={source} className="text-sm text-slate-300" title={sourceLabel(source)}>
                {sourceIcon(source)} {count}
              </span>
            ))}
            {Object.keys(stats.bySource).length === 0 && (
              <span className="text-sm text-slate-500">No notes yet</span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-2">By Source</p>
        </div>
      </div>

      {/* Quick Capture */}
      <QuickCapture />

      {/* Recent Notes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Notes</h2>
          <Link href="/notes" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
            View all →
          </Link>
        </div>

        {recentNotes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🧠</p>
            <p className="text-slate-400 mb-4">Your brain is empty. Start capturing knowledge!</p>
            <Link
              href="/notes/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              Create your first note
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentNotes.map((note) => (
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
        )}
      </div>
    </div>
  );
}
