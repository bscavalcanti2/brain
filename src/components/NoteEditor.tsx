'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import TagBadge from './TagBadge';
import LinkNoteSearch from './LinkNoteSearch';
import { getAllTags, createNote, updateNote, getNote } from '@/app/actions';
import { markdownToHtml } from '@/lib/markdown';

const SOURCES = [
  { value: 'manual', label: '✋ Manual' },
  { value: 'auto_claw', label: '🦞 AutoClaw' },
  { value: 'claude_code', label: '🤖 Claude Code' },
  { value: 'codex', label: '🧑‍💻 Codex' },
];

interface LinkedNote {
  id: string;
  title: string;
}

interface NoteEditorProps {
  mode: 'create' | 'edit';
  noteId?: string;
}

export default function NoteEditor({ mode, noteId }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('manual');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [linkedNotes, setLinkedNotes] = useState<LinkedNote[]>([]);
  const [loaded, setLoaded] = useState(mode === 'create');
  const tagInputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load existing note for edit mode
  useEffect(() => {
    if (mode === 'edit' && noteId) {
      getNote(noteId).then((note) => {
        if (note) {
          setTitle(note.title);
          setContent(note.content);
          setSource(note.source);
          setTags(note.tags.map((t) => t.name));
          setLinkedNotes(
            note.linksFrom.map((l) => ({ id: l.targetId, title: '' }))
          );
          // Fetch titles for linked notes
          Promise.all(
            note.linksFrom.map((l) =>
              getNote(l.targetId).then((n) =>
                n ? { id: n.id, title: n.title } : null
              )
            )
          ).then((results) => {
            setLinkedNotes(results.filter((r): r is LinkedNote => r !== null));
          });
        }
        setLoaded(true);
      });
    }
  }, [mode, noteId]);

  // Load all tags for autocomplete
  useEffect(() => {
    getAllTags().then((t) => setAllTags(t.map((tag) => tag.name))).catch(() => {});
  }, []);

  // Close tag suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowTagSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredTagSuggestions = allTags.filter(
    (t) =>
      t.toLowerCase().includes(tagInput.toLowerCase()) &&
      !tags.includes(t)
  );

  function addTag(name: string) {
    const trimmed = name.trim().toLowerCase();
    if (trimmed && tags.length < 10 && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
      setShowTagSuggestions(false);
    }
  }

  function removeTag(name: string) {
    setTags(tags.filter((t) => t !== name));
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) addTag(tagInput);
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (mode === 'create') {
        const note = await createNote({
          title: title.trim(),
          content: content.trim() || undefined,
          source,
          tags: tags.length > 0 ? tags : undefined,
          linksTo: linkedNotes.length > 0 ? linkedNotes.map((l) => l.id) : undefined,
        });
        window.location.href = `/notes/${note.id}`;
      } else if (noteId) {
        const note = await updateNote({
          id: noteId,
          title: title.trim(),
          content: content.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
        });
        window.location.href = `/notes/${note.id}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    }
    setIsSubmitting(false);
  }

  const previewHtml = showPreview ? markdownToHtml(content) : '';

  if (!loaded) {
    return (
      <div className="max-w-3xl mx-auto py-16">
        <div className="text-slate-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/notes" className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">
          ← Back to notes
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-white mb-6">
        {mode === 'create' ? 'New Note' : 'Edit Note'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1.5">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="w-full px-3 py-2.5 text-base bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
            autoFocus
          />
        </div>

        {/* Source */}
        <div>
          <label htmlFor="source" className="block text-sm font-medium text-slate-300 mb-1.5">
            Source
          </label>
          <select
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:border-emerald-500 transition-colors"
          >
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div ref={wrapperRef}>
          <label htmlFor="tags" className="block text-sm font-medium text-slate-300 mb-1.5">
            Tags <span className="text-slate-500">(press Enter to add, max 10)</span>
          </label>
          <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-800 border border-slate-700 rounded-lg focus-within:border-emerald-500 transition-colors">
            {tags.map((tag) => (
              <TagBadge
                key={tag}
                name={tag}
                onClick={() => removeTag(tag)}
                size="md"
              />
            ))}
            {tags.length < 10 && (
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setShowTagSuggestions(true);
                }}
                onKeyDown={handleTagKeyDown}
                onFocus={() => setShowTagSuggestions(true)}
                placeholder={tags.length === 0 ? 'Add tags...' : ''}
                className="flex-1 min-w-[100px] bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none py-1"
              />
            )}
          </div>
          {/* Tag suggestions */}
          {showTagSuggestions && filteredTagSuggestions.length > 0 && (
            <div className="mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-40 overflow-y-auto">
              {filteredTagSuggestions.slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="content" className="text-sm font-medium text-slate-300">
              Content <span className="text-slate-500">(markdown)</span>
            </label>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
            >
              {showPreview ? '📝 Edit' : '👁️ Preview'}
            </button>
          </div>
          {showPreview ? (
            <div className="prose min-h-[200px] p-4 bg-slate-800 border border-slate-700 rounded-lg">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          ) : (
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note in markdown..."
              rows={12}
              className="w-full px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-y font-mono"
            />
          )}
        </div>

        {/* Linked Notes */}
        {mode === 'edit' && noteId && (
          <LinkNoteSearch
            noteId={noteId}
            initialLinks={linkedNotes}
            onLinksChange={setLinkedNotes}
          />
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium transition-colors"
          >
            {isSubmitting ? 'Saving...' : '💾 Save Note'}
          </button>
          <Link
            href="/notes"
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
