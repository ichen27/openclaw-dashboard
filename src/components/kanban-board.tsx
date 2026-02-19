"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Archive } from "lucide-react";
import { TaskCard } from "@/components/task-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  type Status,
} from "@/lib/constants";
import { updateTaskStatus, reorderTask, archiveDoneTasks, archiveTask } from "@/lib/actions";

type TaskWithCategory = {
  id: string;
  title: string;
  description: string;
  requirements: string;
  status: string;
  priority: string;
  assignedAgent: string | null;
  dueDate: Date | null;
  order: number;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: { name: string; color: string };
};

function SortableTaskCard({
  task,
  isSelected,
  onSelect,
}: {
  task: TaskWithCategory;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`touch-manipulation ${isSelected ? "ring-2 ring-primary rounded-lg" : ""}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button, [role='dialog']")) return;
        onSelect();
      }}
    >
      <TaskCard task={task} isSelected={isSelected} />
    </div>
  );
}

function DroppableColumn({
  status,
  tasks,
  selectedTaskId,
  onSelectTask,
  isOver,
  onArchiveDone,
}: {
  status: Status;
  tasks: TaskWithCategory[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  isOver: boolean;
  onArchiveDone?: () => void;
}) {
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-64 sm:w-72 rounded-xl border border-border/50 bg-card/30 transition-colors ${
        isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""
      }`}
    >
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
          >
            {STATUS_LABELS[status]}
          </span>
          <div className="flex items-center gap-1.5">
            {status === "done" && onArchiveDone && (
              <button
                onClick={onArchiveDone}
                title="Archive all done tasks"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 px-1.5 py-0.5 rounded transition-colors"
              >
                <Archive className="h-3 w-3" />
                <span className="hidden sm:inline">Archive</span>
              </button>
            )}
            <span className="text-xs text-muted-foreground font-mono">
              {tasks.length}
            </span>
          </div>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="p-2 space-y-2">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No tasks
              </div>
            ) : (
              tasks.map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  isSelected={selectedTaskId === task.id}
                  onSelect={() => onSelectTask(task.id)}
                />
              ))
            )}
          </SortableContext>
        </div>
      </ScrollArea>
    </div>
  );
}

function ArchiveDropZone({ isDragging }: { isDragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "archive" });

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all duration-200 ${
        isDragging
          ? isOver
            ? "h-14 opacity-100 border-red-400 bg-red-500/10 text-red-400"
            : "h-14 opacity-100 border-muted-foreground/30 bg-muted/20 text-muted-foreground"
          : "h-0 opacity-0 border-transparent overflow-hidden"
      }`}
    >
      <Archive className={`h-4 w-4 transition-transform ${isOver ? "scale-110" : ""}`} />
      <span className="text-sm font-medium">
        {isOver ? "Release to archive" : "Drop here to archive"}
      </span>
    </div>
  );
}

export function KanbanBoard({ tasks: initialTasks }: { tasks: TaskWithCategory[] }) {
  const [tasks, setTasks] = useState<TaskWithCategory[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Keep local tasks in sync when prop changes
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const grouped = useMemo(() => {
    return STATUSES.reduce(
      (acc, status) => {
        acc[status] = tasks
          .filter((t) => t.status === status)
          .sort((a, b) => a.order - b.order || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return acc;
      },
      {} as Record<Status, TaskWithCategory[]>
    );
  }, [tasks]);

  // Flat list of task IDs for keyboard nav
  const flatTaskIds = useMemo(() => {
    return STATUSES.flatMap((s) => grouped[s].map((t) => t.id));
  }, [grouped]);

  // Keyboard navigation
  const navigateTask = useCallback(
    (direction: "next" | "prev") => {
      if (flatTaskIds.length === 0) return;
      if (!selectedTaskId) {
        setSelectedTaskId(flatTaskIds[0]);
        return;
      }
      const idx = flatTaskIds.indexOf(selectedTaskId);
      if (idx === -1) {
        setSelectedTaskId(flatTaskIds[0]);
        return;
      }
      const newIdx =
        direction === "next"
          ? Math.min(idx + 1, flatTaskIds.length - 1)
          : Math.max(idx - 1, 0);
      setSelectedTaskId(flatTaskIds[newIdx]);
    },
    [flatTaskIds, selectedTaskId]
  );

  useEffect(() => {
    const onNext = () => navigateTask("next");
    const onPrev = () => navigateTask("prev");
    const onDeselect = () => setSelectedTaskId(null);
    const onEdit = () => {
      if (selectedTaskId) {
        window.dispatchEvent(
          new CustomEvent("keyboard:editTask", { detail: selectedTaskId })
        );
      }
    };

    window.addEventListener("keyboard:next", onNext);
    window.addEventListener("keyboard:prev", onPrev);
    window.addEventListener("keyboard:deselect", onDeselect);
    window.addEventListener("keyboard:edit", onEdit);
    return () => {
      window.removeEventListener("keyboard:next", onNext);
      window.removeEventListener("keyboard:prev", onPrev);
      window.removeEventListener("keyboard:deselect", onDeselect);
      window.removeEventListener("keyboard:edit", onEdit);
    };
  }, [navigateTask, selectedTaskId]);

  // Scroll selected task into view
  useEffect(() => {
    if (selectedTaskId) {
      const el = document.querySelector(`[data-task-id="${selectedTaskId}"]`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedTaskId]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverColumn(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Archive drop
    if (over.id === "archive") {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      await archiveTask(taskId);
      return;
    }

    // Determine target status
    let targetStatus: string | null = null;
    if (STATUSES.includes(over.id as Status)) {
      targetStatus = over.id as string;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) targetStatus = overTask.status;
    }

    if (!targetStatus) return;

    if (targetStatus !== task.status) {
      // Cross-column move: update status
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus! } : t))
      );
      await updateTaskStatus(taskId, targetStatus as Status);
    } else {
      // Same-column reorder
      const columnTasks = grouped[targetStatus as Status];
      const oldIndex = columnTasks.findIndex((t) => t.id === active.id);
      const newIndex = columnTasks.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        // Optimistic update
        setTasks((prev) => {
          const otherTasks = prev.filter((t) => t.status !== targetStatus);
          const updatedTasks = reordered.map((t, i) => ({ ...t, order: i }));
          return [...otherTasks, ...updatedTasks];
        });
        // Persist each task's new order
        await Promise.all(
          reordered.map((t, i) => reorderTask(t.id, i, targetStatus!))
        );
      }
    }
  }

  function handleDragOver(event: { over: { id: string | number } | null }) {
    if (!event.over) {
      setOverColumn(null);
      return;
    }
    const overId = event.over.id as string;
    if (overId === "archive") {
      setOverColumn("archive");
    } else if (STATUSES.includes(overId as Status)) {
      setOverColumn(overId);
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      setOverColumn(overTask?.status ?? null);
    }
  }

  const handleArchiveDone = async () => {
    if (!confirm("Archive all Done tasks? They can be viewed later.")) return;
    setTasks((prev) => prev.filter((t) => t.status !== "done"));
    await archiveDoneTasks();
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 px-1 min-h-0">
        {STATUSES.map((status) => (
          <DroppableColumn
            key={status}
            status={status}
            tasks={grouped[status]}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
            isOver={overColumn === status && activeId !== null}
            onArchiveDone={status === "done" ? handleArchiveDone : undefined}
          />
        ))}
      </div>
      <ArchiveDropZone isDragging={activeId !== null} />
      <DragOverlay>
        {activeTask ? (
          <div className="w-72 opacity-90 rotate-2">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
