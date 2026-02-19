'use client';

import { useState, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wand2,
  ChevronDown,
} from 'lucide-react';

interface SubTask {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface DecomposeDialogProps {
  categories: Category[];
  onClose: () => void;
  onCreated: () => void;
}

const PRIORITIES = ['low', 'medium', 'high'] as const;
const STATUSES = ['backlog', 'queued', 'in-progress'] as const;

let counter = 0;
function newId() {
  return `sub-${++counter}-${Date.now()}`;
}

function newSubTask(): SubTask {
  return { id: newId(), title: '', description: '', priority: 'medium', status: 'backlog' };
}

export function DecomposeDialog({ categories, onClose, onCreated }: DecomposeDialogProps) {
  const [parentTitle, setParentTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [subtasks, setSubtasks] = useState<SubTask[]>([newSubTask(), newSubTask(), newSubTask()]);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [error, setError] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);

  const addSubtask = () => {
    setSubtasks((prev) => [...prev, newSubTask()]);
  };

  const removeSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSubtask = (id: string, field: keyof SubTask, value: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const parseBulkText = useCallback(() => {
    if (!bulkText.trim()) return;
    const lines = bulkText
      .split('\n')
      .map((l) => l.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter(Boolean);

    const newTasks: SubTask[] = lines.map((line) => ({
      id: newId(),
      title: line,
      description: '',
      priority: 'medium' as const,
      status: 'backlog',
    }));

    setSubtasks((prev) => [...prev.filter((s) => s.title.trim()), ...newTasks]);
    setBulkText('');
    setShowBulkInput(false);
  }, [bulkText]);

  const handleCreate = async () => {
    const validTasks = subtasks.filter((s) => s.title.trim());
    if (!validTasks.length) {
      setError('Add at least one subtask with a title');
      return;
    }
    if (!categoryId) {
      setError('Select a category');
      return;
    }

    setCreating(true);
    setError('');
    setResult(null);

    try {
      // Use bulk endpoint
      const tasks = validTasks.map((s, i) => ({
        categoryId,
        title: parentTitle.trim()
          ? `${parentTitle.trim()}: ${s.title.trim()}`
          : s.title.trim(),
        description: s.description,
        priority: s.priority,
        status: s.status,
      }));

      const res = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult({ success: data.created || tasks.length, failed: 0 });
        setTimeout(() => {
          onCreated();
          onClose();
        }, 1500);
      } else {
        // Fallback: individual creation
        let success = 0;
        let failed = 0;
        for (const task of tasks) {
          try {
            const r = await fetch('/api/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(task),
            });
            if (r.ok) success++;
            else failed++;
          } catch {
            failed++;
          }
        }
        setResult({ success, failed });
        if (success > 0) {
          setTimeout(() => {
            onCreated();
            onClose();
          }, 1500);
        }
      }
    } catch (e) {
      setError('Failed to create tasks');
    } finally {
      setCreating(false);
    }
  };

  const validCount = subtasks.filter((s) => s.title.trim()).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-violet-400" />
            <h2 className="text-lg font-semibold">Decompose Task</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Parent task name + category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Parent Task (optional prefix)
              </label>
              <input
                type="text"
                value={parentTitle}
                onChange={(e) => setParentTitle(e.target.value)}
                placeholder="e.g. Auth System"
                className="w-full text-sm bg-background border border-border rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-sm bg-background border border-border rounded-md px-3 py-2"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk paste toggle */}
          <div>
            <button
              onClick={() => setShowBulkInput(!showBulkInput)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showBulkInput ? 'rotate-180' : ''}`}
              />
              Paste bulk list
            </button>
            {showBulkInput && (
              <div className="mt-2 space-y-2">
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Paste a list of subtasks (one per line):\n- Design login page\n- Implement JWT auth\n- Write tests"
                  className="w-full text-sm bg-background border border-border rounded-md px-3 py-2 h-24 resize-none font-mono"
                />
                <button
                  onClick={parseBulkText}
                  className="text-xs bg-violet-500 text-white px-3 py-1 rounded-md hover:bg-violet-600"
                >
                  Parse & Add
                </button>
              </div>
            )}
          </div>

          {/* Subtask list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">
                Subtasks ({validCount} valid)
              </label>
            </div>

            {subtasks.map((task, i) => (
              <div
                key={task.id}
                className="group border border-border/50 rounded-lg p-3 bg-background/50 hover:border-border transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground mt-2.5 w-5 text-right shrink-0">
                    {i + 1}.
                  </span>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => updateSubtask(task.id, 'title', e.target.value)}
                      placeholder="Subtask title..."
                      className="w-full text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={task.description}
                        onChange={(e) => updateSubtask(task.id, 'description', e.target.value)}
                        placeholder="Description (optional)"
                        className="flex-1 text-xs bg-transparent border-none outline-none text-muted-foreground placeholder:text-muted-foreground/30"
                      />
                      <select
                        value={task.priority}
                        onChange={(e) => updateSubtask(task.id, 'priority', e.target.value)}
                        className="text-xs bg-transparent border border-border/50 rounded px-1.5 py-0.5"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <select
                        value={task.status}
                        onChange={(e) => updateSubtask(task.id, 'status', e.target.value)}
                        className="text-xs bg-transparent border border-border/50 rounded px-1.5 py-0.5"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => removeSubtask(task.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={addSubtask}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/50 hover:border-border rounded-lg py-2 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add subtask
            </button>
          </div>

          {/* Result/Error messages */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {result && (
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 px-3 py-2 rounded-md">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Created {result.success} tasks{result.failed > 0 ? ` (${result.failed} failed)` : ''}!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {validCount} subtask{validCount !== 1 ? 's' : ''} will be created
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-sm px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || validCount === 0}
              className="text-sm bg-violet-500 text-white px-4 py-1.5 rounded-md hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating...
                </>
              ) : (
                <>Create {validCount} Tasks</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
