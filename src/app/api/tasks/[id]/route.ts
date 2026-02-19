import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { STATUSES, PRIORITIES } from "@/lib/constants";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { title, description, requirements, status, priority, assignedAgent, dueDate } = body;

    if (status && !STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    if (priority && !PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${PRIORITIES.join(", ")}` },
        { status: 400 }
      );
    }

    const data: Record<string, string | Date | null> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (requirements !== undefined) data.requirements = requirements;
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (assignedAgent !== undefined) data.assignedAgent = assignedAgent;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

    // Log status change as event
    const statusChanged = status !== undefined && status !== existing.status;

    const [task] = await prisma.$transaction([
      prisma.task.update({
        where: { id },
        data,
        include: { category: true },
      }),
      ...(statusChanged
        ? [
            prisma.taskEvent.create({
              data: {
                taskId: id,
                fromStatus: existing.status,
                toStatus: status,
                agent: assignedAgent ?? existing.assignedAgent ?? undefined,
              },
            }),
          ]
        : []),
    ]);

    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
