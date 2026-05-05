'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  compact?: boolean;
}

export default function SearchBar({ placeholder = 'Search notes...', defaultValue = '', compact = false }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setValue(q);
  }, [searchParams]);

  const debouncedSearch = useCallback(() => {
    const timer = setTimeout(() => {
      if (value.trim()) {
        router.push(`/notes?q=${encodeURIComponent(value.trim())}`);
      } else if (searchParams.has('q')) {
        router.push('/notes');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value, router, searchParams]);

  useEffect(() => {
    const cleanup = debouncedSearch();
    return cleanup;
  }, [debouncedSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      router.push(`/notes?q=${encodeURIComponent(value.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          width={compact ? 16 : 20}
          height={compact ? 16 : 20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors ${
            compact ? 'pl-9 pr-3 py-1.5 text-sm' : 'pl-10 pr-4 py-2.5'
          }`}
        />
      </div>
    </form>
  );
}
