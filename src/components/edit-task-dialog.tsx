"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateTask } from "@/lib/actions";
import { PRIORITIES, type Priority } from "@/lib/constants";
import { CommentsPanel } from "@/components/comments-panel";
import { DependenciesPanel } from "@/components/dependencies-panel";

type TaskData = {
  id: string;
  title: string;
  description: string;
  requirements: string;
  priority: string;
  assignedAgent: string | null;
  dueDate: Date | null;
};

const INSTANCES = [
  { id: "agent-1", name: "Agent 1", workspace: ".openclaw" },
  { id: "agent-2", name: "Agent 2", workspace: ".openclaw-agent-2" },
  { id: "agent-3", name: "Agent 3", workspace: ".openclaw-agent-3" },
];

function formatDateForInput(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

export function EditTaskDialog({
  task,
  open,
  onOpenChange,
}: {
  task: TaskData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState("details");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6" title={task.title}>
            {task.title.length > 48 ? task.title.slice(0, 46) + "…" : task.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-1">
          <TabsList className="grid w-full grid-cols-3 h-8 mb-3">
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="comments" className="text-xs">Comments</TabsTrigger>
            <TabsTrigger value="dependencies" className="text-xs">Dependencies</TabsTrigger>
          </TabsList>

          {/* ── Details tab ── */}
          <TabsContent value="details" className="mt-0">
            <form
              action={async (formData) => {
                await updateTask(task.id, formData);
                onOpenChange(false);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="edit-task-title">Title</Label>
                <Input
                  id="edit-task-title"
                  name="title"
                  defaultValue={task.title}
                  placeholder="Task title"
                  required
                  autoFocus={activeTab === "details"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-task-desc">Description</Label>
                <Textarea
                  id="edit-task-desc"
                  name="description"
                  defaultValue={task.description}
                  placeholder="Describe the task..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-task-req">Requirements</Label>
                <Textarea
                  id="edit-task-req"
                  name="requirements"
                  defaultValue={task.requirements}
                  placeholder="- Requirement 1&#10;- Requirement 2&#10;- Requirement 3"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select name="priority" defaultValue={task.priority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-task-due">Due Date</Label>
                  <Input
                    id="edit-task-due"
                    name="dueDate"
                    type="date"
                    defaultValue={formatDateForInput(task.dueDate)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assigned Instance</Label>
                <Select name="assignedAgent" defaultValue={task.assignedAgent || "unassigned"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {INSTANCES.map((instance) => (
                      <SelectItem key={instance.id} value={instance.id}>
                        {instance.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Assign to a specific OpenClaw instance
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </TabsContent>

          {/* ── Comments tab ── */}
          <TabsContent value="comments" className="mt-0">
            <CommentsPanel taskId={task.id} />
          </TabsContent>

          {/* ── Dependencies tab ── */}
          <TabsContent value="dependencies" className="mt-0">
            <DependenciesPanel taskId={task.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
