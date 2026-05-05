'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TagBadge from '@/components/TagBadge';
import BackLinks from '@/components/BackLinks';
import { markdownToHtml } from '@/lib/markdown';
import { relativeTime, formatDate } from '@/lib/relative-time';
import { deleteNote } from '@/app/actions';
import type { Note, Tag } from '@/types';

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

interface NoteViewClientProps {
  note: Note;
  backlinks: Array<{
    id: string;
    title: string;
    source: string;
    createdAt: string;
    tags: Tag[];
  }>;
}

export default function NoteViewClient({ note, backlinks }: NoteViewClientProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  const htmlContent = markdownToHtml(note.content);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteNote(note.id);
      router.push('/notes');
      router.refresh();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
    setIsDeleting(false);
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/notes" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">
          ← Back to notes
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-white leading-tight">{note.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-slate-800 text-slate-400">
              {sourceIcon(note.source)} {sourceLabel(note.source)}
            </span>
            <span className="text-xs text-slate-500">
              Created {formatDate(note.createdAt)}
            </span>
            {note.updatedAt !== note.createdAt && (
              <span className="text-xs text-slate-500">
                Updated {relativeTime(note.updatedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/notes/${note.id}/edit`}
            className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            ✏️ Edit
          </Link>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              🗑️ Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-lg text-sm bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Confirm'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {note.tags.map((tag) => (
            <TagBadge key={tag.id} name={tag.name} slug={tag.slug} size="md" />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="prose min-h-[100px]">
        {note.content ? (
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        ) : (
          <p className="text-slate-500 italic">No content</p>
        )}
      </div>

      {/* Outgoing links */}
      {note.linksFrom.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-800">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            ↗️ Outgoing Links ({note.linksFrom.length})
          </h3>
          <div className="space-y-2">
            {note.linksFrom.map((link) => (
              <OutgoingLink key={link.targetId} targetId={link.targetId} />
            ))}
          </div>
        </div>
      )}

      {/* Backlinks */}
      <BackLinks backlinks={backlinks} noteId={note.id} />
    </div>
  );
}

function OutgoingLink({ targetId }: { targetId: string }) {
  const [title, setTitle] = useState('Loading...');

  // We fetch the title client-side for simplicity
  import('@/app/actions').then(({ getNote }) => {
    getNote(targetId).then((note) => {
      if (note) setTitle(note.title);
      else setTitle('Deleted note');
    });
  });

  return (
    <Link
      href={`/notes/${targetId}`}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors"
    >
      <span className="text-emerald-400">🔗</span>
      <span className="text-sm text-slate-300 hover:text-emerald-400 transition-colors truncate">
        {title}
      </span>
    </Link>
  );
}
