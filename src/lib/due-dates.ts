export function getDaysUntilDue(dueDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDueDateColor(dueDate: Date): string {
  const days = getDaysUntilDue(dueDate);
  if (days < 0) return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30";
  if (days <= 3) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30";
  return "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30";
}

export function formatDueDate(dueDate: Date): string {
  const days = getDaysUntilDue(dueDate);
  const date = new Date(dueDate);

  if (days < 0) return `Overdue (${date.toLocaleDateString()})`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `Due in ${days}d`;
  return date.toLocaleDateString();
}
