export const STATUSES = ["backlog", "queued", "in-progress", "review", "done", "failed"] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  backlog: "Backlog",
  queued: "Queued",
  "in-progress": "In Progress",
  review: "Review",
  done: "Done",
  failed: "Failed",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30",
  medium: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
  high: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30",
  urgent: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
};

export const STATUS_COLORS: Record<Status, string> = {
  backlog: "bg-gray-500/20 text-gray-700 dark:text-gray-300",
  queued: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  "in-progress": "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  review: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  done: "bg-green-500/20 text-green-700 dark:text-green-300",
  failed: "bg-red-500/20 text-red-700 dark:text-red-300",
};

export const CATEGORY_ICONS = [
  "folder",
  "code",
  "server",
  "terminal",
  "bug",
  "zap",
  "shield",
  "database",
  "globe",
  "settings",
  "box",
  "cpu",
] as const;

export const CATEGORY_COLORS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
] as const;
