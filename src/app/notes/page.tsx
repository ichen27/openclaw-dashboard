'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StickyNote, Plus, X, Pin, PinOff, Trash2,
  Search, Loader2, RefreshCw, Tag
} from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string; // JSON string
  pinned: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

const COLOR_CONFIG: Record<string, { bg: string; border: string; header: string }> = {
  default: { bg: 'bg-card',            border: 'border-border/50',      header: 'bg-card' },
  blue:    { bg: 'bg-blue-500/5',      border: 'border-blue-500/30',    header: 'bg-blue-500/10' },
  green:   { bg: 'bg-emerald-500/5',   border: 'border-emerald-500/30', header: 'bg-emerald-500/10' },
  amber:   { bg: 'bg-amber-500/5',     border: 'border-amber-500/30',   header: 'bg-amber-500/10' },
  red:     { bg: 'bg-red-500/5',       border: 'border-red-500/30',     header: 'bg-red-500/10' },
  violet:  { bg: 'bg-violet-500/5',    border: 'border-violet-500/30',  header: 'bg-violet-500/10' },
};

const COLORS = Object.keys(COLOR_CONFIG);

const COLOR_DOT: Record<string, string> = {
  default: 'bg-muted-foreground',
  blue:    'bg-blue-500',
  green:   'bg-emerald-500',
  amber:   'bg-amber-500',
  red:     'bg-red-500',
  violet:  'bg-violet-500',
};

function parseTags(raw: string): string[] {
  try { return JSON.parse(raw) ?? []; } catch { return []; }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface NoteUpdate {
  title?: string;
  content?: string;
  tags?: string[];
  pinned?: boolean;
  color?: string;
}

function NoteCard({
  note,
  onUpdate,
  onDelete,
  onTogglePin,
}: {
  note: Note;
  onUpdate: (id: string, data: NoteUpdate) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tagInput, setTagInput] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const tags = parseTags(note.tags);
  const cfg = COLOR_CONFIG[note.color] ?? COLOR_CONFIG.default;

  const save = useCallback(() => {
    onUpdate(note.id, { title, content });
    setEditing(false);
  }, [note.id, title, content, onUpdate]);

  const addTag = useCallback(() => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      onUpdate(note.id, { tags: [...tags, t] });
    }
    setTagInput('');
  }, [tagInput, tags, note.id, onUpdate]);

  const removeTag = useCallback((tag: string) => {
    onUpdate(note.id, { tags: tags.filter(t => t !== tag) });
  }, [tags, note.id, onUpdate]);

  useEffect(() => {
    if (editing) titleRef.current?.focus();
  }, [editing]);

  return (
    <div className={`rounded-xl border ${cfg.bg} ${cfg.border} overflow-hidden group flex flex-col`}>
      {/* Header */}
      <div className={`flex items-start gap-2 px-3 pt-3 pb-2 ${cfg.header}`}>
        {editing ? (
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setTitle(note.title); setEditing(false); } }}
            className="flex-1 bg-transparent text-sm font-semibold outline-none"
            placeholder="Title..."
          />
        ) : (
          <p
            className="flex-1 text-sm font-semibold cursor-text leading-tight"
            onClick={() => setEditing(true)}
          >
            {note.title || 'Untitled'}
          </p>
        )}

        {/* Actions - visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {/* Color picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(p => !p)}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Change color"
            >
              <div className={`h-2.5 w-2.5 rounded-full ${COLOR_DOT[note.color] ?? 'bg-muted-foreground'}`} />
            </button>
            {showColorPicker && (
              <div className="absolute right-0 top-full mt-1 z-10 bg-card border border-border/50 rounded-lg p-2 shadow-lg flex gap-1.5">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => { onUpdate(note.id, { color: c }); setShowColorPicker(false); }}
                    className={`h-4 w-4 rounded-full border-2 transition-transform hover:scale-110 ${COLOR_DOT[c]} ${note.color === c ? 'border-foreground' : 'border-transparent'}`}
                    title={c}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onTogglePin(note.id, !note.pinned)}
            className={`p-1 rounded transition-colors ${note.pinned ? 'text-amber-500 hover:text-amber-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            title={note.pinned ? 'Unpin' : 'Pin'}
          >
            {note.pinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
          </button>

          <button
            onClick={() => { if (confirm(`Delete "${note.title}"?`)) onDelete(note.id); }}
            className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-3 flex-1 flex flex-col gap-2">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
              className="w-full bg-transparent text-xs text-muted-foreground outline-none resize-none leading-relaxed"
              placeholder="Write anything..."
            />
            <div className="flex items-center gap-2">
              <button
                onClick={save}
                className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => { setTitle(note.title); setContent(note.content); setEditing(false); }}
                className="text-xs px-3 py-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap cursor-text min-h-[40px]"
            onClick={() => setEditing(true)}
          >
            {note.content || <span className="italic opacity-50">Click to add content...</span>}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1 mt-auto pt-1">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-muted/70 text-muted-foreground rounded-full group/tag"
            >
              #{tag}
              <button
                onClick={() => removeTag(tag)}
                className="opacity-0 group-hover/tag:opacity-100 ml-0.5 text-muted-foreground hover:text-red-500 transition-all"
              >
                <X className="h-2 w-2" />
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
            placeholder={tags.length === 0 ? '#tag' : ''}
            className="text-[10px] bg-transparent outline-none w-14 text-muted-foreground placeholder:text-muted-foreground/40"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-border/20">
          {note.pinned && <Pin className="h-2.5 w-2.5 text-amber-500" />}
          <span className="text-[10px] text-muted-foreground/40 ml-auto">{timeAgo(note.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotes = useCallback(async (q?: string, tag?: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (tag) params.set('tag', tag);
    const res = await fetch(`/api/notes?${params}`);
    const data = await res.json();
    setNotes(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchNotes(query || undefined, tagFilter || undefined);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, tagFilter, fetchNotes]);

  const createNote = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Note', content: '', tags: [], pinned: false, color: 'default' }),
      });
      const note = await res.json();
      setNotes(prev => [note, ...prev]);
    } finally {
      setCreating(false);
    }
  }, []);

  const updateNote = useCallback(async (id: string, data: NoteUpdate) => {
    // Optimistic update
    setNotes(prev => prev.map(n => {
      if (n.id !== id) return n;
      const updated: Note = { ...n, updatedAt: new Date().toISOString() };
      if (data.title !== undefined) updated.title = data.title;
      if (data.content !== undefined) updated.content = data.content;
      if (data.tags !== undefined) updated.tags = JSON.stringify(data.tags);
      if (data.pinned !== undefined) updated.pinned = data.pinned;
      if (data.color !== undefined) updated.color = data.color;
      return updated;
    }));

    await fetch(`/api/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
  }, []);

  const togglePin = useCallback((id: string, pinned: boolean) => {
    updateNote(id, { pinned });
  }, [updateNote]);

  // Collect all unique tags
  const allTags = Array.from(new Set(notes.flatMap(n => parseTags(n.tags)))).slice(0, 20);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <StickyNote className="h-6 w-6 text-amber-400" />
            Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {notes.length} note{notes.length !== 1 ? 's' : ''} · Scratchpad &amp; research
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchNotes(query || undefined, tagFilter || undefined)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={createNote}
            disabled={creating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New Note
          </button>
        </div>
      </div>

      {/* Search + tag filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-8 pr-3 py-1.5 bg-muted/50 border border-border/50 rounded-md text-sm outline-none focus:border-primary/50"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Tag chips */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag className="h-3 w-3 text-muted-foreground" />
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  tagFilter === tag
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border/50 hover:border-border'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-20">
          <StickyNote className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No notes yet</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Create your first note to get started</p>
          <button
            onClick={createNote}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors mx-auto"
          >
            <Plus className="h-4 w-4" />
            Create Note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {notes.map(note => (
            <div key={note.id}>
              <NoteCard
                note={note}
                onUpdate={updateNote}
                onDelete={deleteNote}
                onTogglePin={togglePin}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Note: Quick Capture dispatches 'quickcapture:task-created' event — notes page ignores it
