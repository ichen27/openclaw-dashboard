import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { STATUSES, PRIORITIES } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const assignedAgent = searchParams.get("assignedAgent");
  const q = searchParams.get("q");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  const archivedParam = searchParams.get("archived");
  const where: Record<string, unknown> = {
    archived: archivedParam === "true" ? true : false,
  };

  if (category) {
    const cat = await prisma.category.findUnique({ where: { slug: category } });
    if (!cat) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    where.categoryId = cat.id;
  }
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignedAgent) where.assignedAgent = assignedAgent;

  // Full-text search across title + description
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      category: true,
      _count: {
        select: {
          comments: true,
          blockedBy: true,
        },
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    ...(limit ? { take: limit } : {}),
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryId, categorySlug, title, description, requirements, priority, status, dueDate } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let resolvedCategoryId = categoryId;
    if (!resolvedCategoryId && categorySlug) {
      const cat = await prisma.category.findUnique({ where: { slug: categorySlug } });
      if (!cat) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      }
      resolvedCategoryId = cat.id;
    }

    if (!resolvedCategoryId) {
      return NextResponse.json({ error: "categoryId or categorySlug is required" }, { status: 400 });
    }

    if (status && !STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${STATUSES.join(", ")}` }, { status: 400 });
    }

    if (priority && !PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: `Invalid priority. Must be one of: ${PRIORITIES.join(", ")}` }, { status: 400 });
    }

    const finalStatus = status || "backlog";
    const task = await prisma.task.create({
      data: {
        categoryId: resolvedCategoryId,
        title: title.trim(),
        description: description || "",
        requirements: requirements || "",
        priority: priority || "medium",
        status: finalStatus,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: { category: true },
    });

    // Log creation event
    await prisma.taskEvent.create({
      data: {
        taskId: task.id,
        fromStatus: null,
        toStatus: finalStatus,
        agent: body.assignedAgent ?? null,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
