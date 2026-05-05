'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { TagWithCount } from '@/app/actions';

interface SidebarProps {
  tags: TagWithCount[];
}

export default function Sidebar({ tags }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/notes', label: 'Notes', icon: '📝' },
    { href: '/graph', label: 'Graph', icon: '🔗' },
  ];

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
        aria-label="Toggle menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {mobileOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 bg-slate-950 border-r border-slate-800
          transition-all duration-300 ease-in-out flex flex-col
          ${collapsed ? 'w-16' : 'w-60'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:relative
        `}
      >
        {/* Logo */}
        <div className={`flex items-center h-14 px-4 border-b border-slate-800 ${collapsed ? 'justify-center' : 'gap-2'}`}>
          <span className="text-xl">🧠</span>
          {!collapsed && <span className="font-bold text-white text-lg">Brain</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                  ${collapsed ? 'justify-center' : ''}
                  ${isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                `}
                title={collapsed ? item.label : undefined}
              >
                <span>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Tags cloud */}
        {!collapsed && tags.length > 0 && (
          <div className="px-3 py-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tags</h4>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {tags.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/notes?tag=${tag.slug}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-colors"
                >
                  {tag.name}
                  <span className="text-slate-600">{tag.count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Collapse toggle (desktop) */}
        <div className="hidden lg:flex items-center justify-center h-12 border-t border-slate-800">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}
            >
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
