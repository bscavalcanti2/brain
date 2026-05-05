'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { searchNotes, addLink, removeLink } from '@/app/actions';

interface LinkedNote {
  id: string;
  title: string;
}

interface LinkNoteSearchProps {
  noteId: string;
  initialLinks: LinkedNote[];
  onLinksChange?: (links: LinkedNote[]) => void;
}

export default function LinkNoteSearch({ noteId, initialLinks, onLinksChange }: LinkNoteSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; title: string }>>([]);
  const [links, setLinks] = useState<LinkedNote[]>(initialLinks);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    try {
      const data = await searchNotes(q.trim(), 5);
      const filtered = data.results
        .filter((r) => r.id !== noteId && !links.some((l) => l.id === r.id))
        .map((r) => ({ id: r.id, title: r.title }));
      setResults(filtered);
      setShowDropdown(filtered.length > 0);
    } catch {
      setResults([]);
    }
  }, [noteId, links]);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  async function handleAddLink(targetId: string, targetTitle: string) {
    setIsAdding(true);
    try {
      await addLink(noteId, targetId);
      const newLinks = [...links, { id: targetId, title: targetTitle }];
      setLinks(newLinks);
      onLinksChange?.(newLinks);
      setQuery('');
      setShowDropdown(false);
      setResults([]);
    } catch (err) {
      console.error('Failed to add link:', err);
    }
    setIsAdding(false);
  }

  async function handleRemoveLink(targetId: string) {
    setIsRemoving(targetId);
    try {
      await removeLink(noteId, targetId);
      const newLinks = links.filter((l) => l.id !== targetId);
      setLinks(newLinks);
      onLinksChange?.(newLinks);
    } catch (err) {
      console.error('Failed to remove link:', err);
    }
    setIsRemoving(null);
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-slate-300">🔗 Linked Notes</h4>

      {/* Current links */}
      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700"
            >
              <a
                href={`/notes/${link.id}`}
                className="text-sm text-slate-300 hover:text-emerald-400 transition-colors truncate flex-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.title}
              </a>
              <button
                onClick={() => handleRemoveLink(link.id)}
                disabled={isRemoving === link.id}
                className="p-1 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                title="Remove link"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div ref={wrapperRef} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes to link..."
          disabled={isAdding}
          className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
        />

        {/* Dropdown */}
        {showDropdown && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleAddLink(result.id, result.title)}
                disabled={isAdding}
                className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                {result.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
