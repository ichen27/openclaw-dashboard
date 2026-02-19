import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { STATUSES, PRIORITIES } from "@/lib/constants";

/**
 * PATCH /api/tasks/bulk
 * Bulk update status (and optionally assignedAgent) for a list of task IDs.
 * Body: { ids: string[], status?: string, assignedAgent?: string | null, priority?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, status, assignedAgent, priority } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    if (ids.length > 100) {
      return NextResponse.json({ error: "Cannot update more than 100 tasks at once" }, { status: 400 });
    }

    if (status && !STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
    }

    if (priority && !PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: `Invalid priority: ${priority}` }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (assignedAgent !== undefined) data.assignedAgent = assignedAgent;
    if (priority !== undefined) data.priority = priority;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "At least one field to update is required" }, { status: 400 });
    }

    // Get existing tasks for event logging
    const existing = await prisma.task.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, assignedAgent: true },
    });

    const existingMap = Object.fromEntries(existing.map(t => [t.id, t]));

    // Run update + event logging in transaction
    const updateResult = await prisma.$transaction([
      prisma.task.updateMany({ where: { id: { in: ids } }, data }),
      ...(status
        ? existing
            .filter(t => t.status !== status)
            .map(t =>
              prisma.taskEvent.create({
                data: {
                  taskId: t.id,
                  fromStatus: existingMap[t.id]?.status ?? null,
                  toStatus: status,
                  agent: (assignedAgent !== undefined ? assignedAgent : existingMap[t.id]?.assignedAgent) ?? null,
                },
              })
            )
        : []),
    ]);

    return NextResponse.json({
      updated: updateResult[0].count,
      total: ids.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

interface BatchTaskInput {
  categoryId?: string;
  categorySlug?: string;
  title: string;
  description?: string;
  requirements?: string;
  priority?: string;
  status?: string;
  assignedAgent?: string | null;
  dueDate?: string | null;
}

/**
 * POST /api/tasks/batch
 * 
 * Batch create multiple tasks atomically.
 * All tasks are validated before any are created.
 * If any task fails validation, the entire batch is rejected.
 * 
 * Request body:
 * {
 *   "tasks": [
 *     { "title": "Task 1", "categoryId": "...", ... },
 *     { "title": "Task 2", "categorySlug": "coding-tasks", ... }
 *   ],
 *   "defaultCategoryId": "..." (optional, fallback if task doesn't specify)
 * }
 * 
 * Response:
 * {
 *   "created": [{ id, title, ... }, ...],
 *   "count": 5
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tasks, defaultCategoryId } = body;

    // Validate request structure
    if (!Array.isArray(tasks)) {
      return NextResponse.json(
        { error: "Request body must include a 'tasks' array" },
        { status: 400 }
      );
    }

    if (tasks.length === 0) {
      return NextResponse.json(
        { error: "Tasks array cannot be empty" },
        { status: 400 }
      );
    }

    if (tasks.length > 100) {
      return NextResponse.json(
        { error: "Cannot create more than 100 tasks at once" },
        { status: 400 }
      );
    }

    // Validate and prepare all tasks before creating any
    const validatedTasks: Array<{
      categoryId: string;
      title: string;
      description: string;
      requirements: string;
      priority: string;
      status: string;
      assignedAgent: string | null;
      dueDate: Date | null;
    }> = [];

    for (let i = 0; i < tasks.length; i++) {
      const task: BatchTaskInput = tasks[i];

      // Validate title
      if (!task.title?.trim()) {
        return NextResponse.json(
          { error: `Task ${i + 1}: Title is required`, taskIndex: i },
          { status: 400 }
        );
      }

      // Resolve category
      let categoryId = task.categoryId || defaultCategoryId;

      if (!categoryId && task.categorySlug) {
        const cat = await prisma.category.findUnique({
          where: { slug: task.categorySlug },
        });
        if (!cat) {
          return NextResponse.json(
            { error: `Task ${i + 1}: Category '${task.categorySlug}' not found`, taskIndex: i },
            { status: 404 }
          );
        }
        categoryId = cat.id;
      }

      if (!categoryId) {
        return NextResponse.json(
          { error: `Task ${i + 1}: categoryId, categorySlug, or defaultCategoryId is required`, taskIndex: i },
          { status: 400 }
        );
      }

      // Validate status
      const status = task.status || "backlog";
      if (!STATUSES.includes(status as any)) {
        return NextResponse.json(
          { error: `Task ${i + 1}: Invalid status '${status}'. Must be one of: ${STATUSES.join(", ")}`, taskIndex: i },
          { status: 400 }
        );
      }

      // Validate priority
      const priority = task.priority || "medium";
      if (!PRIORITIES.includes(priority as any)) {
        return NextResponse.json(
          { error: `Task ${i + 1}: Invalid priority '${priority}'. Must be one of: ${PRIORITIES.join(", ")}`, taskIndex: i },
          { status: 400 }
        );
      }

      validatedTasks.push({
        categoryId,
        title: task.title.trim(),
        description: task.description || "",
        requirements: task.requirements || "",
        priority,
        status,
        assignedAgent: task.assignedAgent || null,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
      });
    }

    // Create all tasks in a transaction (all or nothing)
    const createdTasks = await prisma.$transaction(
      validatedTasks.map((taskData) =>
        prisma.task.create({
          data: taskData,
          include: { category: true },
        })
      )
    );

    return NextResponse.json(
      {
        created: createdTasks,
        count: createdTasks.length,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Batch task creation error:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Failed to create tasks", details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Invalid request body or server error" },
      { status: 400 }
    );
  }
}
