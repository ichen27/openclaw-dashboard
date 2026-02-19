import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/tasks/[id]/dependencies
// Returns: { blockedBy: Task[], blocking: Task[] }
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      blockedBy: {
        include: {
          blockedBy: { include: { category: true } },
        },
      },
      blocking: {
        include: {
          task: { include: { category: true } },
        },
      },
    },
  });

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  return NextResponse.json({
    blockedBy: task.blockedBy.map(dep => dep.blockedBy),
    blocking: task.blocking.map(dep => dep.task),
  });
}

// POST /api/tasks/[id]/dependencies
// Body: { blockedById: string }  — adds a "blocked by" dependency
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;

  try {
    const { blockedById } = await request.json();

    if (!blockedById) {
      return NextResponse.json({ error: "blockedById is required" }, { status: 400 });
    }

    if (taskId === blockedById) {
      return NextResponse.json({ error: "A task cannot block itself" }, { status: 400 });
    }

    // Check both tasks exist
    const [task, blocker] = await Promise.all([
      prisma.task.findUnique({ where: { id: taskId }, include: { category: true } }),
      prisma.task.findUnique({ where: { id: blockedById }, include: { category: true } }),
    ]);

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (!blocker) return NextResponse.json({ error: "Blocking task not found" }, { status: 404 });

    // Detect simple circular dependency
    const wouldCycle = await prisma.taskDependency.findFirst({
      where: { taskId: blockedById, blockedById: taskId },
    });
    if (wouldCycle) {
      return NextResponse.json({ error: "Circular dependency detected" }, { status: 409 });
    }

    const dep = await prisma.taskDependency.upsert({
      where: { taskId_blockedById: { taskId, blockedById } },
      create: { taskId, blockedById },
      update: {},
    });

    return NextResponse.json({ success: true, dependency: dep, blocker }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

// DELETE /api/tasks/[id]/dependencies?blockedById=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params;
  const { searchParams } = request.nextUrl;
  const blockedById = searchParams.get("blockedById");

  if (!blockedById) {
    return NextResponse.json({ error: "blockedById query param is required" }, { status: 400 });
  }

  const dep = await prisma.taskDependency.findUnique({
    where: { taskId_blockedById: { taskId, blockedById } },
  });

  if (!dep) return NextResponse.json({ error: "Dependency not found" }, { status: 404 });

  await prisma.taskDependency.delete({
    where: { taskId_blockedById: { taskId, blockedById } },
  });

  return NextResponse.json({ success: true });
}
