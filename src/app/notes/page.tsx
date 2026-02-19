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

/* ─── Square Tile (preview) ─── */
function NoteTile({
  note,
  onClick,
}: {
  note: Note;
  onClick: () => void;
}) {
  const cfg = COLOR_CONFIG[note.color] ?? COLOR_CONFIG.default;
  const tags = parseTags(note.tags);

  return (
    <button
      onClick={onClick}
      className={`relative w-full aspect-square rounded-xl border ${cfg.bg} ${cfg.border} p-3 flex flex-col text-left overflow-hidden transition-all duration-200 hover:scale-[1.03] hover:shadow-lg hover:shadow-black/5 focus:outline-none focus:ring-2 focus:ring-primary/40`}
    >
      {/* Pin icon */}
      {note.pinned && (
        <Pin className="absolute top-2 right-2 h-3 w-3 text-amber-500 shrink-0" />
      )}

      {/* Title */}
      <p className="text-sm font-semibold leading-tight line-clamp-2 pr-4">
        {note.title || <span className="italic text-muted-foreground/50">Untitled</span>}
      </p>

      {/* Content preview */}
      <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed line-clamp-3 flex-1">
        {note.content || <span className="italic opacity-40">No content</span>}
      </p>

      {/* Tags + timestamp at bottom */}
      <div className="mt-auto pt-1.5 flex items-end justify-between gap-1">
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1 overflow-hidden max-h-[18px]">
            {tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-[9px] px-1.5 py-0.5 bg-muted/70 text-muted-foreground rounded-full leading-none"
              >
                #{tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[9px] text-muted-foreground/50">+{tags.length - 3}</span>
            )}
          </div>
        ) : (
          <span />
        )}
        <span className="text-[9px] text-muted-foreground/40 shrink-0">{timeAgo(note.updatedAt)}</span>
      </div>

      {/* Color accent bar at top */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${COLOR_DOT[note.color] ?? 'bg-transparent'} opacity-60`} />
    </button>
  );
}

/* ─── Expanded Modal ─── */
function NoteModal({
  note,
  onClose,
  onUpdate,
  onDelete,
  onTogglePin,
}: {
  note: Note;
  onClose: () => void;
  onUpdate: (id: string, data: NoteUpdate) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingContent, setEditingContent] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tagInput, setTagInput] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const tags = parseTags(note.tags);
  const cfg = COLOR_CONFIG[note.color] ?? COLOR_CONFIG.default;

  // Sync when note prop changes (optimistic updates)
  useEffect(() => { setTitle(note.title); }, [note.title]);
  useEffect(() => { setContent(note.content); }, [note.content]);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (editingContent) contentRef.current?.focus();
  }, [editingContent]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const saveTitle = useCallback(() => {
    onUpdate(note.id, { title });
    setEditingTitle(false);
  }, [note.id, title, onUpdate]);

  const saveContent = useCallback(() => {
    onUpdate(note.id, { content });
    setEditingContent(false);
  }, [note.id, content, onUpdate]);

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

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className={`relative w-full max-w-lg max-h-[80vh] rounded-2xl border ${cfg.bg} ${cfg.border} shadow-2xl flex flex-col overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        {/* Color accent */}
        <div className={`h-1 ${COLOR_DOT[note.color] ?? 'bg-transparent'} opacity-60`} />

        {/* Header bar */}
        <div className={`flex items-center justify-between px-5 pt-4 pb-2 ${cfg.header}`}>
          <div className="flex items-center gap-2">
            {/* Color picker */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(p => !p)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Change color"
              >
                <div className={`h-3 w-3 rounded-full ${COLOR_DOT[note.color] ?? 'bg-muted-foreground'}`} />
              </button>
              {showColorPicker && (
                <div className="absolute left-0 top-full mt-1 z-10 bg-card border border-border/50 rounded-lg p-2 shadow-lg flex gap-1.5">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => { onUpdate(note.id, { color: c }); setShowColorPicker(false); }}
                      className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${COLOR_DOT[c]} ${note.color === c ? 'border-foreground' : 'border-transparent'}`}
                      title={c}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Pin */}
            <button
              onClick={() => onTogglePin(note.id, !note.pinned)}
              className={`p-1.5 rounded-md transition-colors ${note.pinned ? 'text-amber-500 hover:text-amber-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
              title={note.pinned ? 'Unpin' : 'Pin'}
            >
              {note.pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
            </button>

            {/* Delete */}
            <button
              onClick={() => { if (confirm(`Delete "${note.title}"?`)) { onDelete(note.id); onClose(); } }}
              className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
          {/* Title */}
          {editingTitle ? (
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitle(note.title); setEditingTitle(false); } }}
              className="w-full bg-transparent text-lg font-semibold outline-none"
              placeholder="Title..."
            />
          ) : (
            <p
              className="text-lg font-semibold cursor-text"
              onClick={() => setEditingTitle(true)}
            >
              {note.title || <span className="italic text-muted-foreground/50">Untitled</span>}
            </p>
          )}

          {/* Content */}
          {editingContent ? (
            <div className="space-y-2">
              <textarea
                ref={contentRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={10}
                className="w-full bg-transparent text-sm text-muted-foreground outline-none resize-none leading-relaxed"
                placeholder="Write anything..."
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={saveContent}
                  className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => { setContent(note.content); setEditingContent(false); }}
                  className="text-xs px-3 py-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p
              className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap cursor-text min-h-[80px]"
              onClick={() => setEditingContent(true)}
            >
              {note.content || <span className="italic opacity-50">Click to add content...</span>}
            </p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/20">
            <Tag className="h-3 w-3 text-muted-foreground/50" />
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-muted/70 text-muted-foreground rounded-full group/tag"
              >
                #{tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="opacity-0 group-hover/tag:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
              placeholder="Add tag..."
              className="text-[11px] bg-transparent outline-none w-20 text-muted-foreground placeholder:text-muted-foreground/40"
            />
          </div>

          {/* Footer meta */}
          <div className="text-[10px] text-muted-foreground/40 pt-1">
            Updated {timeAgo(note.updatedAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
      setExpandedId(note.id);
    } finally {
      setCreating(false);
    }
  }, []);

  const updateNote = useCallback(async (id: string, data: NoteUpdate) => {
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

  const allTags = Array.from(new Set(notes.flatMap(n => parseTags(n.tags)))).slice(0, 20);

  const expandedNote = expandedId ? notes.find(n => n.id === expandedId) : null;

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

      {/* Notes grid — uniform square tiles */}
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
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(172px, 1fr))' }}>
          {notes.map(note => (
            <NoteTile
              key={note.id}
              note={note}
              onClick={() => setExpandedId(note.id)}
            />
          ))}
        </div>
      )}

      {/* Expanded modal */}
      {expandedNote && (
        <NoteModal
          note={expandedNote}
          onClose={() => setExpandedId(null)}
          onUpdate={updateNote}
          onDelete={deleteNote}
          onTogglePin={togglePin}
        />
      )}
    </div>
  );
}

// Note: Quick Capture dispatches 'quickcapture:task-created' event — notes page ignores it
