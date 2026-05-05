'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import type { TagWithCount } from '@/app/actions';

interface LayoutProps {
  children: React.ReactNode;
  tags: TagWithCount[];
}

export default function Layout({ children, tags }: LayoutProps) {
  const router = useRouter();

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd+K → focus search on notes page
      if (isMod && e.key === 'k') {
        e.preventDefault();
        router.push('/notes');
        // Focus the search input after navigation
        setTimeout(() => {
          const input = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
          input?.focus();
        }, 100);
      }

      // Cmd+N → new note
      if (isMod && e.key === 'n') {
        e.preventDefault();
        router.push('/notes/new');
      }

      // Cmd+G → graph
      if (isMod && e.key === 'g') {
        e.preventDefault();
        router.push('/graph');
      }

      // Escape → clear search / go home
      if (e.key === 'Escape') {
        const input = document.activeElement as HTMLInputElement;
        if (input?.matches('input[placeholder*="Search"]')) {
          input.value = '';
          input.blur();
          router.push('/notes');
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return (
    <Suspense>
      <div className="flex h-screen bg-slate-950">
        <Sidebar tags={tags} />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top header */}
          <header className="flex items-center justify-between h-14 px-4 lg:px-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
            <div className="flex-1 lg:hidden" />
            <h1 className="hidden lg:block text-sm font-medium text-slate-400">
              Bruno&apos;s Second Brain
            </h1>
            <div className="flex items-center gap-3">
              {/* Keyboard shortcut hints */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-500">⌘K</kbd>
                <span>Search</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-500">⌘N</kbd>
                <span>New</span>
              </div>
              <a
                href="/notes/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Note
              </a>
            </div>
          </header>
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </Suspense>
  );
}
