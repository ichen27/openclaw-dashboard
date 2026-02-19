'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, Loader2, CheckCircle2, StickyNote, ListTodo } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

type CaptureMode = 'task' | 'note';

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CaptureMode>('task');
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Task fields
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategoryId, setTaskCategoryId] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');

  // Note fields
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Keyboard shortcut: Ctrl+Shift+N
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Load categories once
  useEffect(() => {
    if (open && categories.length === 0) {
      // Extract unique categories from tasks API
      fetch('/api/tasks?limit=5')
        .then(r => r.json())
        .then((tasks: { category: Category }[]) => {
          const seen = new Set<string>();
          const cats: Category[] = [];
          for (const t of tasks) {
            if (!seen.has(t.category.id)) {
              seen.add(t.category.id);
              cats.push(t.category);
            }
          }
          // Fetch all to get more categories
          fetch('/api/tasks?limit=100')
            .then(r => r.json())
            .then((all: { category: Category }[]) => {
              const seenAll = new Set<string>();
              const allCats: Category[] = [];
              for (const t of all) {
                if (!seenAll.has(t.category.id)) {
                  seenAll.add(t.category.id);
                  allCats.push(t.category);
                }
              }
              setCategories(allCats);
              if (allCats.length > 0 && !taskCategoryId) {
                setTaskCategoryId(allCats[0].id);
              }
            });
        });
    }
  }, [open, categories.length, taskCategoryId]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        (inputRef.current as HTMLInputElement | null)?.focus();
      }, 50);
    }
  }, [open, mode]);

  const reset = useCallback(() => {
    setTaskTitle('');
    setTaskPriority('medium');
    setNoteTitle('');
    setNoteContent('');
    setSaved(false);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  const handleSaveTask = useCallback(async () => {
    if (!taskTitle.trim() || !taskCategoryId) return;
    setSaving(true);
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle.trim(),
          categoryId: taskCategoryId,
          priority: taskPriority,
          status: 'backlog',
        }),
      });
      setSaved(true);
      setTimeout(() => {
        reset();
        setSaved(false);
        // Dispatch event so kanban can refresh
        window.dispatchEvent(new CustomEvent('quickcapture:task-created'));
      }, 800);
    } finally {
      setSaving(false);
    }
  }, [taskTitle, taskCategoryId, taskPriority, reset]);

  const handleSaveNote = useCallback(async () => {
    if (!noteTitle.trim() && !noteContent.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteTitle.trim() || 'Quick note',
          content: noteContent.trim(),
          tags: ['quick'],
          pinned: false,
          color: 'default',
        }),
      });
      setSaved(true);
      setTimeout(() => {
        reset();
        setSaved(false);
      }, 800);
    } finally {
      setSaving(false);
    }
  }, [noteTitle, noteContent, reset]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      if (mode === 'task') handleSaveTask();
      else handleSaveNote();
    }
  }, [handleClose, mode, handleSaveTask, handleSaveNote]);

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all ${
          open
            ? 'bg-muted text-foreground'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105'
        }`}
        title="Quick capture (⌘⇧N)"
      >
        {open ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        <span className="text-sm font-medium hidden sm:block">
          {open ? 'Close' : 'Quick Add'}
        </span>
      </button>

      {/* Panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={handleClose}
          />

          {/* Card */}
          <div
            className="fixed bottom-20 right-6 z-40 w-80 bg-card border border-border/50 rounded-xl shadow-2xl overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            {/* Mode tabs */}
            <div className="flex border-b border-border/50">
              {(['task', 'note'] as CaptureMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setMode(m); reset(); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                    mode === m
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m === 'task'
                    ? <><ListTodo className="h-3.5 w-3.5" /> Task</>
                    : <><StickyNote className="h-3.5 w-3.5" /> Note</>
                  }
                </button>
              ))}
            </div>

            <div className="p-4 space-y-3">
              {mode === 'task' ? (
                <>
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    placeholder="Task title..."
                    className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={taskCategoryId}
                      onChange={e => setTaskCategoryId(e.target.value)}
                      className="bg-muted/50 border border-border/50 rounded-md px-2 py-1.5 text-xs outline-none focus:border-primary/50"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <select
                      value={taskPriority}
                      onChange={e => setTaskPriority(e.target.value)}
                      className="bg-muted/50 border border-border/50 rounded-md px-2 py-1.5 text-xs outline-none focus:border-primary/50"
                    >
                      <option value="high">🔴 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    value={noteTitle}
                    onChange={e => setNoteTitle(e.target.value)}
                    placeholder="Note title (optional)..."
                    className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50"
                  />
                  <textarea
                    value={noteContent}
                    onChange={e => setNoteContent(e.target.value)}
                    placeholder="Write anything..."
                    rows={4}
                    className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-2 text-sm outline-none focus:border-primary/50 resize-none"
                  />
                </>
              )}

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground/50">⌘↵ to save</p>
                <button
                  onClick={mode === 'task' ? handleSaveTask : handleSaveNote}
                  disabled={saving || saved || (mode === 'task' ? !taskTitle.trim() : !noteTitle.trim() && !noteContent.trim())}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : saved ? (
                    <><CheckCircle2 className="h-3 w-3 text-emerald-400" /> Saved!</>
                  ) : (
                    <><Plus className="h-3 w-3" /> Add {mode === 'task' ? 'Task' : 'Note'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
