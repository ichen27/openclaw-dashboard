"use client";

import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import {
  STATUSES,
  PRIORITIES,
  STATUS_LABELS,
  type Status,
  type Priority,
} from "@/lib/constants";

export type TaskWithCategory = {
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

type FilterState = {
  search: string;
  status: string;
  priority: string;
  assignee: string;
};

export function useTaskFilters(tasks: TaskWithCategory[]) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "all",
    priority: "all",
    assignee: "all",
  });

  const assignees = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.assignedAgent) set.add(t.assignedAgent);
    });
    return Array.from(set).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }
      if (filters.status !== "all" && task.status !== filters.status) return false;
      if (filters.priority !== "all" && task.priority !== filters.priority) return false;
      if (filters.assignee !== "all") {
        if (filters.assignee === "unassigned" && task.assignedAgent !== null) return false;
        if (filters.assignee !== "unassigned" && task.assignedAgent !== filters.assignee) return false;
      }
      return true;
    });
  }, [tasks, filters]);

  const hasActiveFilters = !!(filters.search || filters.status !== "all" || filters.priority !== "all" || filters.assignee !== "all");

  const clearFilters = useCallback(() => {
    setFilters({ search: "", status: "all", priority: "all", assignee: "all" });
  }, []);

  return { filters, setFilters, filtered, assignees, hasActiveFilters, clearFilters };
}

export function TaskFilterBar({
  filters,
  setFilters,
  totalCount,
  filteredCount,
  assignees,
  hasActiveFilters,
  clearFilters,
  searchInputRef,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  totalCount: number;
  filteredCount: number;
  assignees: string[];
  hasActiveFilters: boolean;
  clearFilters: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="pl-8 h-8 text-sm"
        />
      </div>

      <Select
        value={filters.status}
        onValueChange={(val) => setFilters((f) => ({ ...f, status: val }))}
      >
        <SelectTrigger className="w-[130px] h-8 text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s as Status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority}
        onValueChange={(val) => setFilters((f) => ({ ...f, priority: val }))}
      >
        <SelectTrigger className="w-[130px] h-8 text-sm">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {(p as string).charAt(0).toUpperCase() + (p as string).slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.assignee}
        onValueChange={(val) => setFilters((f) => ({ ...f, assignee: val }))}
      >
        <SelectTrigger className="w-[140px] h-8 text-sm">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {assignees.map((a) => (
            <SelectItem key={a} value={a}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={clearFilters}>
            <X className="h-3 w-3" />
            Clear
          </Button>
          <Badge variant="secondary" className="text-xs">
            {filteredCount} of {totalCount}
          </Badge>
        </>
      )}
    </div>
  );
}
