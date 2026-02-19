"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Status, Priority } from "@/lib/constants";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Category Actions ────────────────────────────────────────────

export async function createCategory(formData: FormData) {
  const name = formData.get("name") as string;
  const color = (formData.get("color") as string) || "#6366f1";
  const icon = (formData.get("icon") as string) || "folder";

  if (!name?.trim()) throw new Error("Category name is required");

  const slug = slugify(name);

  await prisma.category.create({
    data: { name: name.trim(), slug, color, icon },
  });

  revalidatePath("/");
}

export async function deleteCategory(id: string) {
  await prisma.category.delete({ where: { id } });
  revalidatePath("/");
}

export async function renameCategory(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  if (!name?.trim()) throw new Error("Category name is required");

  const slug = slugify(name);
  await prisma.category.update({
    where: { id },
    data: { name: name.trim(), slug },
  });

  revalidatePath("/");
}

// ─── Task Actions ────────────────────────────────────────────────

export async function createTask(formData: FormData) {
  const categoryId = formData.get("categoryId") as string;
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const requirements = (formData.get("requirements") as string) || "";
  const priority = (formData.get("priority") as string as Priority) || "medium";
  const status = (formData.get("status") as string as Status) || "backlog";
  const dueDateStr = formData.get("dueDate") as string | null;

  if (!title?.trim()) throw new Error("Task title is required");
  if (!categoryId) throw new Error("Category is required");

  const dueDate = dueDateStr ? new Date(dueDateStr) : null;

  await prisma.task.create({
    data: {
      categoryId,
      title: title.trim(),
      description,
      requirements,
      priority,
      status,
      dueDate,
    },
  });

  revalidatePath("/");
}

export async function updateTaskStatus(id: string, status: Status) {
  await prisma.task.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/");
}

export async function updateTask(id: string, formData: FormData) {
  const title = formData.get("title") as string | null;
  const description = formData.get("description") as string | null;
  const requirements = formData.get("requirements") as string | null;
  const priority = formData.get("priority") as string | null;
  const status = formData.get("status") as string | null;
  const assignedAgent = formData.get("assignedAgent") as string | null;
  const dueDateStr = formData.get("dueDate") as string | null;

  const data: Record<string, string | Date | null> = {};
  if (title !== null) data.title = title;
  if (description !== null) data.description = description;
  if (requirements !== null) data.requirements = requirements;
  if (priority !== null) data.priority = priority;
  if (status !== null) data.status = status;
  if (assignedAgent !== null) {
    data.assignedAgent = assignedAgent === "unassigned" ? null : assignedAgent;
  }
  if (dueDateStr !== null) {
    data.dueDate = dueDateStr ? new Date(dueDateStr) : null;
  }

  await prisma.task.update({ where: { id }, data });
  revalidatePath("/");
}

export async function deleteTask(id: string) {
  await prisma.task.delete({ where: { id } });
  revalidatePath("/");
}

export async function updateTaskPriority(id: string, priority: string) {
  await prisma.task.update({ where: { id }, data: { priority } });
  revalidatePath("/");
}

export async function updateTaskAgent(id: string, agent: string | null) {
  await prisma.task.update({
    where: { id },
    data: { assignedAgent: agent },
  });
  revalidatePath("/");
}

export async function claimTask(id: string, agentName: string) {
  await prisma.task.update({
    where: { id },
    data: {
      assignedAgent: agentName,
      status: "queued",
    },
  });
  revalidatePath("/");
}

// ─── Task Reorder Actions ────────────────────────────────────────

export async function reorderTask(taskId: string, newOrder: number, status: string) {
  await prisma.task.update({
    where: { id: taskId },
    data: { order: newOrder },
  });
  // Re-index all tasks in the same status column to avoid gaps
  const tasks = await prisma.task.findMany({
    where: { status, archived: false },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: { id: true },
  });
  for (let i = 0; i < tasks.length; i++) {
    await prisma.task.update({ where: { id: tasks[i].id }, data: { order: i } });
  }
  revalidatePath("/");
}

// ─── Task Archive Actions ────────────────────────────────────────

export async function archiveTask(id: string) {
  await prisma.task.update({ where: { id }, data: { archived: true } });
  revalidatePath("/");
}

export async function unarchiveTask(id: string) {
  await prisma.task.update({ where: { id }, data: { archived: false } });
  revalidatePath("/");
}

export async function archiveDoneTasks() {
  await prisma.task.updateMany({
    where: { status: "done", archived: false },
    data: { archived: true },
  });
  revalidatePath("/");
}
