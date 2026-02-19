"use client";

import { useMemo, useRef, useState, useEffect, useCallback, type DragEvent } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from "@/components/kanban-board";
import { NewTaskDialog } from "@/components/new-task-dialog";
import { NewCategoryDialog } from "@/components/new-category-dialog";
import { CategoryActions } from "@/components/category-actions";
import { CategoryIcon } from "@/components/icons";
import { TaskFilterBar, useTaskFilters, type TaskWithCategory } from "@/components/task-filters";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { LayoutGrid, Wand2, Download, Archive, RotateCcw } from "lucide-react";
import { DecomposeDialog } from "@/components/decompose-dialog";
import { unarchiveTask } from "@/lib/actions";

type SerializedCategory = {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  order: number;
  createdAt: string;
  tasks: SerializedTask[];
};

type SerializedTask = {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  requirements: string;
  status: string;
  priority: string;
  assignedAgent: string | null;
  dueDate: string | null;
  order: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  category: { name: string; color: string };
};

function deserializeTasks(tasks: SerializedTask[]): TaskWithCategory[] {
  return tasks.map((t) => ({
    ...t,
    createdAt: new Date(t.createdAt),
    updatedAt: new Date(t.updatedAt),
    dueDate: t.dueDate ? new Date(t.dueDate) : null,
  }));
}

type ArchivedTask = TaskWithCategory & { archived: boolean };

function ArchivedTasksView() {
  const [tasks, setTasks] = useState<ArchivedTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArchived = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tasks?archived=true&limit=100");
    const data = await res.json();
    setTasks(
      data.map((t: SerializedTask) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { fetchArchived(); }, [fetchArchived]);

  const handleUnarchive = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await unarchiveTask(id);
  };

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading archived tasks…</div>;
  if (tasks.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <Archive className="h-12 w-12 mb-3 opacity-30" />
      <p className="text-sm">No archived tasks</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center justify-between px-4 py-3 rounded-lg border border-border/40 bg-muted/20 opacity-70 hover:opacity-90 transition-opacity"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium line-through text-muted-foreground truncate">{task.title}</span>
              <span className="text-xs text-muted-foreground border border-border/40 rounded px-1.5 py-0.5 shrink-0">{task.status}</span>
              <span className="text-xs text-muted-foreground border border-border/40 rounded px-1.5 py-0.5 shrink-0">{task.category.name}</span>
            </div>
            {task.description && (
              <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{task.description}</p>
            )}
          </div>
          <button
            onClick={() => handleUnarchive(task.id)}
            className="ml-3 flex items-center gap-1.5 text-xs px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors shrink-0"
            title="Unarchive task"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore
          </button>
        </div>
      ))}
    </div>
  );
}

export function DashboardClient({
  categories,
}: {
  categories: SerializedCategory[];
}) {
  const [orderedCategories, setOrderedCategories] = useState(categories);
  const allTasks = useMemo(
    () => deserializeTasks(orderedCategories.flatMap((c) => c.tasks)),
    [orderedCategories]
  );

  // Sync if server data changes (e.g. after revalidation)
  useEffect(() => {
    setOrderedCategories(categories);
  }, [categories]);

  const { filters, setFilters, filtered, assignees, hasActiveFilters, clearFilters } =
    useTaskFilters(allTasks);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [newTaskCategoryId, setNewTaskCategoryId] = useState<string | null>(null);
  const [showDecompose, setShowDecompose] = useState(false);

  // Drag-and-drop state for category tabs
  const [draggedCatId, setDraggedCatId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropSide, setDropSide] = useState<"left" | "right" | null>(null);

  const handleDragStart = useCallback((e: DragEvent<HTMLElement>, catId: string) => {
    setDraggedCatId(catId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", catId);
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLElement>, catId: string) => {
      e.preventDefault();
      if (!draggedCatId || draggedCatId === catId) {
        setDropTargetId(null);
        setDropSide(null);
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      setDropTargetId(catId);
      setDropSide(e.clientX < midX ? "left" : "right");
    },
    [draggedCatId]
  );

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null);
    setDropSide(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLElement>, targetCatId: string) => {
      e.preventDefault();
      if (!draggedCatId || draggedCatId === targetCatId) {
        setDraggedCatId(null);
        setDropTargetId(null);
        setDropSide(null);
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const side = e.clientX < midX ? "left" : "right";

      setOrderedCategories((prev) => {
        const next = prev.filter((c) => c.id !== draggedCatId);
        const dragged = prev.find((c) => c.id === draggedCatId)!;
        const targetIndex = next.findIndex((c) => c.id === targetCatId);
        const insertAt = side === "left" ? targetIndex : targetIndex + 1;
        next.splice(insertAt, 0, dragged);
        // Persist to server
        fetch("/api/categories/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: next.map((c) => c.id) }),
        });
        return next;
      });

      setDraggedCatId(null);
      setDropTargetId(null);
      setDropSide(null);
    },
    [draggedCatId]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedCatId(null);
    setDropTargetId(null);
    setDropSide(null);
  }, []);

  // For keyboard shortcut "n" - open new task dialog for first category
  const firstCategoryId = orderedCategories[0]?.id ?? null;

  return (
    <>
      <KeyboardShortcuts
        searchInputRef={searchInputRef}
        onNewTask={() => {
          if (firstCategoryId) setNewTaskCategoryId(firstCategoryId);
        }}
      />
      <Tabs defaultValue="all" className="w-full">
        <div className="border-b border-border/50 bg-card/20 px-6 pt-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <TabsList className="h-9 bg-transparent p-0 gap-0">
              <TabsTrigger
                value="all"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 gap-1.5"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                All Tasks
                <span className="text-xs text-muted-foreground ml-1">
                  {allTasks.length}
                </span>
              </TabsTrigger>

              {orderedCategories.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.slug}
                  draggable
                  onDragStart={(e) => handleDragStart(e, cat.id)}
                  onDragOver={(e) => handleDragOver(e, cat.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, cat.id)}
                  onDragEnd={handleDragEnd}
                  className={`rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 gap-1.5 cursor-grab active:cursor-grabbing transition-all ${
                    draggedCatId === cat.id ? "opacity-50" : ""
                  } ${
                    dropTargetId === cat.id && dropSide === "left"
                      ? "border-l-2 !border-l-primary"
                      : ""
                  } ${
                    dropTargetId === cat.id && dropSide === "right"
                      ? "border-r-2 !border-r-primary"
                      : ""
                  }`}
                >
                  <CategoryIcon
                    icon={cat.icon}
                    className="h-3.5 w-3.5"
                    style={{ color: cat.color }}
                  />
                  {cat.name}
                  <span className="text-xs text-muted-foreground ml-1">
                    {cat.tasks.length}
                  </span>
                </TabsTrigger>
              ))}
              <TabsTrigger
                value="archived"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 gap-1.5"
              >
                <Archive className="h-3.5 w-3.5" />
                Archived
              </TabsTrigger>
            </TabsList>
            <NewCategoryDialog />
          </div>
        </div>

        <TabsContent value="all" className="mt-0 p-6">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <h2 className="text-lg font-semibold">All Tasks</h2>
              <button
                onClick={() => setShowDecompose(true)}
                className="flex items-center gap-1.5 text-xs bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 px-2.5 py-1 rounded-md transition-colors"
                title="Decompose a task into subtasks"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Decompose
              </button>
              <a
                href="/api/tasks/export?format=csv"
                download
                className="flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-md transition-colors"
                title="Export all tasks as CSV"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </a>
            </div>
            <TaskFilterBar
              filters={filters}
              setFilters={setFilters}
              totalCount={allTasks.length}
              filteredCount={filtered.length}
              assignees={assignees}
              hasActiveFilters={hasActiveFilters}
              clearFilters={clearFilters}
              searchInputRef={searchInputRef}
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState filtered={hasActiveFilters} />
          ) : (
            <KanbanBoard tasks={filtered} />
          )}
        </TabsContent>

        {orderedCategories.map((cat) => {
          const catTasks = deserializeTasks(cat.tasks);
          return (
            <TabsContent key={cat.id} value={cat.slug} className="mt-0 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <h2 className="text-lg font-semibold">{cat.name}</h2>
                  <CategoryActions
                    categoryId={cat.id}
                    categoryName={cat.name}
                  />
                </div>
                <NewTaskDialog categoryId={cat.id} />
              </div>
              {catTasks.length === 0 ? (
                <EmptyState />
              ) : (
                <KanbanBoard tasks={catTasks} />
              )}
            </TabsContent>
          );
        })}

        <TabsContent value="archived" className="mt-0 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Archive className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Archived Tasks</h2>
          </div>
          <ArchivedTasksView />
        </TabsContent>
      </Tabs>

      {/* Hidden dialog triggered by keyboard shortcut */}
      {newTaskCategoryId && (
        <NewTaskDialog
          categoryId={newTaskCategoryId}
          defaultOpen
          onClose={() => setNewTaskCategoryId(null)}
        />
      )}

      {/* Decompose dialog */}
      {showDecompose && (
        <DecomposeDialog
          categories={orderedCategories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            color: c.color,
          }))}
          onClose={() => setShowDecompose(false)}
          onCreated={() => window.location.reload()}
        />
      )}
    </>
  );
}

function EmptyState({
  categoryName,
  filtered,
}: {
  categoryName?: string;
  filtered?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <LayoutGrid className="h-12 w-12 mb-3 opacity-30" />
      <p className="text-sm">
        {filtered
          ? "No tasks match your filters"
          : categoryName
            ? `No tasks in ${categoryName} yet`
            : "No tasks yet. Create a category to get started."}
      </p>
    </div>
  );
}
