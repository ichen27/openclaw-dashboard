"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PRIORITY_COLORS,
  PRIORITIES,
  STATUS_LABELS,
  STATUSES,
  type Status,
  type Priority,
} from "@/lib/constants";
import { updateTaskStatus, updateTaskPriority, updateTaskAgent, deleteTask } from "@/lib/actions";
import {
  ChevronRight,
  MoreVertical,
  Trash2,
  User,
  Clock,
  CheckCircle2,
  Edit,
  Calendar,
  GitBranch,
  MessageSquare,
} from "lucide-react";
import { EditTaskDialog } from "@/components/edit-task-dialog";
import { getDueDateColor, formatDueDate } from "@/lib/due-dates";

type TaskWithCategory = {
  id: string;
  title: string;
  description: string;
  requirements: string;
  status: string;
  priority: string;
  assignedAgent: string | null;
  dueDate: Date | null;
  order?: number;
  archived?: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: { name: string; color: string };
  _count?: { comments?: number; blockedBy?: number };
};

export function TaskCard({
  task,
  isSelected,
}: {
  task: TaskWithCategory;
  isSelected?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const priority = task.priority as Priority;
  const status = task.status as Status;

  const requirementLines = task.requirements
    .split("\n")
    .filter((line) => line.trim());

  // Listen for keyboard edit event
  useEffect(() => {
    function onEditTask(e: Event) {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail === task.id) {
        setEditing(true);
      }
    }
    window.addEventListener("keyboard:editTask", onEditTask);
    return () => window.removeEventListener("keyboard:editTask", onEditTask);
  }, [task.id]);

  const dueDateColor = task.dueDate ? getDueDateColor(task.dueDate) : null;

  return (
    <>
      <Card
        data-task-id={task.id}
        className="p-3 cursor-pointer hover:bg-accent/50 transition-colors border-border/50 group overflow-hidden"
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-medium leading-tight line-clamp-2 break-words">
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words">
                {task.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 shrink-0 relative z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={() => {
                  setExpanded(false);
                  setEditing(true);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteTask(task.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button onClick={(e) => e.stopPropagation()} className="focus:outline-none">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80 ${PRIORITY_COLORS[priority]}`}
                >
                  {priority}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-50 min-w-24" onClick={(e) => e.stopPropagation()}>
              {PRIORITIES.map((p) => (
                <DropdownMenuItem
                  key={p}
                  onClick={() => updateTaskPriority(task.id, p)}
                  className={p === priority ? 'font-bold' : ''}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    p === 'urgent' ? 'bg-red-500' : p === 'high' ? 'bg-orange-500' : p === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                  }`} />
                  {p}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {task.dueDate && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 gap-1 ${dueDateColor}`}
            >
              <Calendar className="h-2.5 w-2.5" />
              {formatDueDate(task.dueDate)}
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button onClick={(e) => e.stopPropagation()} className="focus:outline-none">
                <Badge
                  variant={task.assignedAgent ? "secondary" : "outline"}
                  className="text-[10px] px-1.5 py-0 gap-1 cursor-pointer hover:opacity-80"
                >
                  <User className="h-2.5 w-2.5" />
                  {task.assignedAgent || "assign"}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-50 min-w-28" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => updateTaskAgent(task.id, null)}>
                <span className="text-muted-foreground">Unassigned</span>
              </DropdownMenuItem>
              {['main', 'agent-4', 'research-agent', 'qwen-worker', 'llama-8b'].map((a) => (
                <DropdownMenuItem
                  key={a}
                  onClick={() => updateTaskAgent(task.id, a)}
                  className={a === task.assignedAgent ? 'font-bold' : ''}
                >
                  {a}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {(task._count?.blockedBy ?? 0) > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 gap-1 border-yellow-500/40 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10"
            >
              <GitBranch className="h-2.5 w-2.5" />
              blocked
            </Badge>
          )}
          {(task._count?.comments ?? 0) > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <MessageSquare className="h-2.5 w-2.5" />
              {task._count?.comments}
            </span>
          )}
          <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Card>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={`${PRIORITY_COLORS[priority]}`}
              >
                {priority}
              </Badge>
              <Badge variant="secondary" style={{ backgroundColor: task.category.color + "30", color: task.category.color }}>
                {task.category.name}
              </Badge>
              {task.dueDate && (
                <Badge variant="outline" className={`gap-1 ${dueDateColor}`}>
                  <Calendar className="h-3 w-3" />
                  {formatDueDate(task.dueDate)}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto gap-1.5"
                onClick={() => {
                  setExpanded(false);
                  setEditing(true);
                }}
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
            </div>
            <DialogTitle className="text-xl mt-1">{task.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Created {new Date(task.createdAt).toLocaleDateString()}
              </div>
              {task.assignedAgent && (
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {task.assignedAgent}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Status:</span>
                <Select
                  value={status}
                  onValueChange={(val) =>
                    updateTaskStatus(task.id, val as Status)
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Assigned:</span>
                <Badge variant={task.assignedAgent ? "default" : "outline"}>
                  {task.assignedAgent || "Unassigned"}
                </Badge>
              </div>
            </div>

            {task.description && (
              <div>
                <h4 className="text-sm font-medium mb-2">Description</h4>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                  {task.description}
                </div>
              </div>
            )}

            {requirementLines.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Requirements</h4>
                <div className="space-y-1.5">
                  {requirementLines.map((req, i) => {
                    const text = req.replace(/^[-*]\s*/, "").replace(/^\[[ x]\]\s*/, "");
                    const isDone = req.includes("[x]");
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-2 text-sm p-2 rounded-md ${
                          isDone
                            ? "bg-green-500/10 text-green-700 dark:text-green-300"
                            : "bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <CheckCircle2
                          className={`h-4 w-4 mt-0.5 shrink-0 ${
                            isDone ? "text-green-600 dark:text-green-400" : "text-muted-foreground/40"
                          }`}
                        />
                        <span>{text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <EditTaskDialog
        task={task}
        open={editing}
        onOpenChange={setEditing}
      />
    </>
  );
}
