import Link from 'next/link';
import NoteCard from './NoteCard';
import type { Tag } from '@/types';

interface BacklinkNote {
  id: string;
  title: string;
  source: string;
  createdAt: string;
  tags: Tag[];
}

interface BackLinksProps {
  backlinks: BacklinkNote[];
  noteId: string;
}

export default function BackLinks({ backlinks, noteId }: BackLinksProps) {
  if (backlinks.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-slate-800">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
        🔗 Backlinks ({backlinks.length})
      </h3>
      <div className="space-y-2">
        {backlinks.map((note) => (
          <NoteCard
            key={note.id}
            id={note.id}
            title={note.title}
            source={note.source}
            createdAt={note.createdAt}
            tags={note.tags}
            compact
          />
        ))}
      </div>
    </div>
  );
}
