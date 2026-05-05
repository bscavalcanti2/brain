import Link from 'next/link';
import TagBadge from './TagBadge';
import { relativeTime } from '@/lib/relative-time';
import { truncate } from '@/lib/utils';
import type { Tag } from '@/types';

interface NoteCardProps {
  id: string;
  title: string;
  content?: string;
  source: string;
  createdAt: string;
  tags: Tag[];
  compact?: boolean;
}

function sourceIcon(source: string): string {
  switch (source) {
    case 'auto_claw':
      return '🦞';
    case 'claude_code':
      return '🤖';
    case 'codex':
      return '🧑‍💻';
    default:
      return '✋';
  }
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'auto_claw':
      return 'AutoClaw';
    case 'claude_code':
      return 'Claude Code';
    case 'codex':
      return 'Codex';
    default:
      return 'Manual';
  }
}

export default function NoteCard({ id, title, content, source, createdAt, tags, compact = false }: NoteCardProps) {
  return (
    <Link
      href={`/notes/${id}`}
      className="block group rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 hover:border-slate-700 transition-all duration-200"
    >
      <div className={compact ? 'p-3' : 'p-4'}>
        {/* Title */}
        <h3 className="font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors text-sm leading-snug">
          {compact ? truncate(title, 60) : title}
        </h3>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.slice(0, 3).map((tag) => (
              <TagBadge key={tag.id} name={tag.name} slug={tag.slug} />
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-slate-500 px-2 py-0.5">+{tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Content preview */}
        {content && !compact && (
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            {truncate(content.replace(/[#*`>\-\[\]]/g, ''), 150)}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
          <span title={sourceLabel(source)}>{sourceIcon(source)}</span>
          <span>{sourceLabel(source)}</span>
          <span>·</span>
          <span>{relativeTime(createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
