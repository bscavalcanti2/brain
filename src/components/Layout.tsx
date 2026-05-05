'use client';

import { Suspense } from 'react';
import Sidebar from './Sidebar';
import type { TagWithCount } from '@/app/actions';

interface LayoutProps {
  children: React.ReactNode;
  tags: TagWithCount[];
}

export default function Layout({ children, tags }: LayoutProps) {
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
