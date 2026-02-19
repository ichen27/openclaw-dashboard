'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Sun, ListTodo, Bot, BarChart3, Brain, Briefcase, Code2, StickyNote,
  CheckCircle2, Clock, FolderOpen, Loader2, ArrowRight,
  X
} from 'lucide-react';

interface TaskResult {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: { name: string; color: string };
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Today', href: '/today', icon: Sun, description: 'Daily focus & work queue' },
  { label: 'Tasks', href: '/', icon: ListTodo, description: 'Kanban board' },
  { label: 'Apply', href: '/apply', icon: Briefcase, description: 'Internship application pipeline' },
  { label: 'LC', href: '/lc', icon: Code2, description: 'LeetCode problem tracker' },
  { label: 'Notes', href: '/notes', icon: StickyNote, description: 'Scratchpad & research notes' },
  { label: 'Agents', href: '/agents', icon: Bot, description: 'Agent monitoring & task auction' },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, description: 'Velocity & activity charts' },
  { label: 'Knowledge', href: '/knowledge', icon: Brain, description: 'Search & connection map' },
];

const STATUS_DOT: Record<string, string> = {
  done: 'bg-emerald-500',
  'in-progress': 'bg-blue-500',
  review: 'bg-yellow-500',
  backlog: 'bg-gray-400',
  failed: 'bg-red-500',
};

const PRIORITY_COLOR: Record<string, string> = {
  high: 'text-red-500',
  medium: 'text-yellow-500',
  low: 'text-green-500',
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<TaskResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open on Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const fetchTasks = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setTasks([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?q=${encodeURIComponent(q)}&limit=8`);
      const results = await res.json() as TaskResult[];
      setTasks(results.slice(0, 8));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchTasks(query), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchTasks]);

  const filteredNav = query
    ? NAV_ITEMS.filter(n =>
        n.label.toLowerCase().includes(query.toLowerCase()) ||
        n.description.toLowerCase().includes(query.toLowerCase())
      )
    : NAV_ITEMS;

  const allItems = [
    ...filteredNav.map(n => ({ type: 'nav' as const, ...n })),
    ...tasks.map(t => ({ type: 'task' as const, ...t, href: '/' })),
  ];

  const navigate = useCallback((item: typeof allItems[0]) => {
    if (item.type === 'nav') {
      router.push(item.href);
    } else {
      // Navigate to tasks page — could deep-link in future
      router.push('/');
    }
    setOpen(false);
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) navigate(allItems[selectedIndex]);
    }
  };

  // Reset selection when results change
  useEffect(() => { setSelectedIndex(0); }, [query]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-24 -translate-x-1/2 z-50 w-full max-w-lg">
        <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tasks, navigate pages…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />}
            <button onClick={() => setOpen(false)} className="text-muted-foreground/50 hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-2">
            {allItems.length === 0 && query.length >= 2 && !loading && (
              <p className="text-xs text-muted-foreground text-center py-6">No results for &ldquo;{query}&rdquo;</p>
            )}

            {/* Nav section */}
            {filteredNav.length > 0 && (
              <div>
                {!query && (
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider px-4 py-1">
                    Navigation
                  </p>
                )}
                {filteredNav.map((item, i) => {
                  const Icon = item.icon;
                  const isSelected = i === selectedIndex;
                  return (
                    <button
                      key={item.href}
                      onClick={() => navigate({ type: 'nav', ...item })}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tasks section */}
            {tasks.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider px-4 py-1 mt-1">
                  Tasks
                </p>
                {tasks.map((task, i) => {
                  const idx = filteredNav.length + i;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={task.id}
                      onClick={() => navigate({ type: 'task', ...task, href: '/' })}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[task.status] ?? 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{task.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{task.category.name}</span>
                          <span className={`text-[10px] ${PRIORITY_COLOR[task.priority] ?? ''}`}>
                            {task.priority}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{task.status}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border/50 flex items-center gap-3 text-[10px] text-muted-foreground/60">
            <span><kbd className="font-mono bg-muted px-1 rounded">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono bg-muted px-1 rounded">↵</kbd> open</span>
            <span><kbd className="font-mono bg-muted px-1 rounded">Esc</kbd> close</span>
            <span className="ml-auto"><kbd className="font-mono bg-muted px-1 rounded">⌘K</kbd> toggle</span>
          </div>
        </div>
      </div>
    </>
  );
}
