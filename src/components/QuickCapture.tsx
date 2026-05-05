'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createNote } from '@/app/actions';

export default function QuickCapture() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      await createNote({
        title: title.trim(),
        content: content.trim() || undefined,
        source: 'manual',
      });
      setTitle('');
      setContent('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
    }
    setIsSubmitting(false);
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-sm font-semibold text-slate-300 mb-3">⚡ Quick Capture</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          disabled={isSubmitting}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Content (optional, markdown)..."
          rows={3}
          className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
          disabled={isSubmitting}
        />
        <div className="flex items-center justify-between">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex-1" />
          <button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium transition-colors"
          >
            {isSubmitting ? 'Saving...' : '💾 Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
