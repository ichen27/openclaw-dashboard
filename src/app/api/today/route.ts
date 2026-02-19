import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const PRIORITY_WEIGHT: Record<string, number> = { high: 10, medium: 5, low: 2 };

export async function GET() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoDaysAhead = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const [allTasks, recentEvents] = await Promise.all([
    prisma.task.findMany({
      include: {
        category: true,
        _count: { select: { comments: true, blockedBy: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.taskEvent.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        task: { include: { category: true } },
      },
    }),
  ]);

  // === Work Queue: scored backlog tasks ===
  const backlogTasks = allTasks.filter(t => t.status === "backlog");
  const workQueue = backlogTasks
    .map(t => {
      const priorityScore = PRIORITY_WEIGHT[t.priority] ?? 3;
      const ageDays = (now.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const ageBonus = Math.min(ageDays / 7, 1) * 2;
      const dueSoon = t.dueDate && t.dueDate <= twoDaysAhead ? 5 : 0;
      const blocked = (t._count?.blockedBy ?? 0) > 0 ? -8 : 0;
      return {
        ...t,
        score: priorityScore + ageBonus + dueSoon + blocked,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        dueDate: t.dueDate?.toISOString() ?? null,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  // === In-progress tasks ===
  const inProgress = allTasks
    .filter(t => t.status === "in-progress")
    .map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      dueDate: t.dueDate?.toISOString() ?? null,
    }));

  // === Review tasks ===
  const inReview = allTasks
    .filter(t => t.status === "review")
    .map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      dueDate: t.dueDate?.toISOString() ?? null,
    }));

  // === Recently completed (last 7 days) ===
  const recentlyDone = allTasks
    .filter(t => t.status === "done" && t.updatedAt >= sevenDaysAgo)
    .slice(0, 10)
    .map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      dueDate: t.dueDate?.toISOString() ?? null,
    }));

  // === Velocity stats ===
  const doneToday = allTasks.filter(t => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return t.status === "done" && t.updatedAt >= today;
  }).length;

  const doneThisWeek = recentlyDone.length;

  const byCategory = Object.fromEntries(
    Object.entries(
      allTasks.reduce((acc, t) => {
        const cat = t.category.name;
        acc[cat] = acc[cat] ?? { total: 0, done: 0, color: t.category.color };
        acc[cat].total++;
        if (t.status === "done") acc[cat].done++;
        return acc;
      }, {} as Record<string, { total: number; done: number; color: string }>)
    ).sort((a, b) => b[1].total - a[1].total)
  );

  return NextResponse.json({
    workQueue,
    inProgress,
    inReview,
    recentlyDone,
    stats: {
      total: allTasks.length,
      done: allTasks.filter(t => t.status === "done").length,
      inProgress: inProgress.length,
      backlog: backlogTasks.length,
      doneToday,
      doneThisWeek,
      byCategory,
    },
    generatedAt: now.toISOString(),
  });
}
