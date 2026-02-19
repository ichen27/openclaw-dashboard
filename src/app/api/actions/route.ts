import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const doneParam = searchParams.get("done");

  const where: Record<string, unknown> = {};
  if (doneParam !== null) {
    where.done = doneParam === "true";
  }

  const items = await prisma.actionItem.findMany({ where });

  // Auto-include tasks with status='review' as virtual action items
  const reviewTasks = await prisma.task.findMany({
    where: { status: "review", archived: false },
  });

  const virtualItems = reviewTasks.map((task) => ({
    id: `virtual-${task.id}`,
    text: task.title,
    done: false,
    source: "agent-review",
    sourceRef: task.id,
    priority: task.priority || "medium",
    order: task.order,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }));

  // If filtering done=true, skip virtual items (they're always not done)
  const combined =
    doneParam === "true" ? items : [...items, ...virtualItems];

  // Sort: done=false first, then by priority (high>medium>low), then by order
  combined.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const pa = PRIORITY_ORDER[a.priority] ?? 1;
    const pb = PRIORITY_ORDER[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return a.order - b.order;
  });

  return NextResponse.json(combined);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, priority, source } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    if (priority && !["low", "medium", "high"].includes(priority)) {
      return NextResponse.json(
        { error: "priority must be low, medium, or high" },
        { status: 400 }
      );
    }

    const item = await prisma.actionItem.create({
      data: {
        text,
        ...(priority ? { priority } : {}),
        ...(source ? { source } : {}),
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Body must be an array of updates" },
        { status: 400 }
      );
    }

    const updates = await prisma.$transaction(
      body.map((item: { id: string; done?: boolean; text?: string; priority?: string; order?: number }) => {
        const data: Record<string, unknown> = {};
        if (item.done !== undefined) data.done = item.done;
        if (item.text !== undefined) data.text = item.text;
        if (item.priority !== undefined) data.priority = item.priority;
        if (item.order !== undefined) data.order = item.order;

        return prisma.actionItem.update({
          where: { id: item.id },
          data,
        });
      })
    );

    return NextResponse.json(updates);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.actionItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Action item not found" }, { status: 404 });
  }
}
