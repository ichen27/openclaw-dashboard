"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { createTask } from "@/lib/actions";
import { PRIORITIES } from "@/lib/constants";
import { TASK_TEMPLATES, type TaskTemplate } from "@/lib/templates";
import { Plus, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function NewTaskDialog({
  categoryId,
  defaultOpen,
  onClose,
}: {
  categoryId: string;
  defaultOpen?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // Form state for template pre-fill
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
      onClose?.();
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setRequirements("");
    setPriority("medium");
    setDueDate("");
    setSelectedTemplate(null);
    setShowTemplates(false);
  }

  function applyTemplate(template: TaskTemplate) {
    setTitle(template.title);
    setDescription(template.description);
    setRequirements(template.requirements);
    setPriority(template.priority);
    setSelectedTemplate(template);
    setShowTemplates(false);
  }

  const trigger = !defaultOpen ? (
    <DialogTrigger asChild>
      <Button size="sm" className="gap-1.5">
        <Plus className="h-4 w-4" />
        New Task
      </Button>
    </DialogTrigger>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger}
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>

        {/* Template selector */}
        {!showTemplates ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2 text-muted-foreground"
            onClick={() => setShowTemplates(true)}
          >
            <FileText className="h-3.5 w-3.5" />
            {selectedTemplate
              ? `Template: ${selectedTemplate.name}`
              : "Start from a template..."}
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {TASK_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => applyTemplate(tmpl)}
                className="flex flex-col items-start gap-1 p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{tmpl.icon}</span>
                  <span className="text-sm font-medium">{tmpl.name}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {tmpl.description.slice(0, 80)}...
                </p>
                <Badge variant="outline" className="text-[10px] mt-1">
                  {tmpl.priority}
                </Badge>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowTemplates(false)}
              className="flex items-center justify-center p-3 rounded-lg border border-dashed border-border/50 hover:bg-accent/50 transition-colors text-sm text-muted-foreground"
            >
              Blank task
            </button>
          </div>
        )}

        <form
          action={async (formData) => {
            formData.set("categoryId", categoryId);
            await createTask(formData);
            handleOpenChange(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              name="title"
              placeholder="Task title"
              required
              autoFocus={!showTemplates}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              name="description"
              placeholder="Describe the task..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-req">Requirements</Label>
            <Textarea
              id="task-req"
              name="requirements"
              placeholder="- Requirement 1&#10;- Requirement 2&#10;- Requirement 3"
              rows={4}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select name="priority" value={priority} onValueChange={setPriority}>
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
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                name="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
