import Link from 'next/link';

interface TagBadgeProps {
  name: string;
  slug?: string;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export default function TagBadge({ name, slug, onClick, size = 'sm' }: TagBadgeProps) {
  const baseClasses =
    'inline-flex items-center rounded-full font-medium transition-colors';
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-3 py-1 text-sm';

  const content = (
    <span
      className={`${baseClasses} ${sizeClasses} bg-slate-800 text-emerald-400 hover:bg-slate-700 cursor-pointer`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {name}
    </span>
  );

  if (slug && !onClick) {
    return (
      <Link href={`/notes?tag=${slug}`} className="no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
