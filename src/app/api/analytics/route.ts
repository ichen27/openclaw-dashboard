import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const days = parseInt(searchParams.get("days") || "30", 10);
  const since = new Date(Date.now() - days * 86400000);

  // All events in range
  const events = await prisma.taskEvent.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    include: { task: { select: { title: true, categoryId: true, priority: true } } },
  });

  // Current task stats
  const tasks = await prisma.task.findMany({
    select: { id: true, status: true, priority: true, assignedAgent: true, categoryId: true, createdAt: true, updatedAt: true },
  });

  // --- Velocity: tasks completed per day ---
  const velocityMap: Record<string, number> = {};
  for (const e of events) {
    if (e.toStatus === "done") {
      const day = e.createdAt.toISOString().slice(0, 10);
      velocityMap[day] = (velocityMap[day] || 0) + 1;
    }
  }
  // Fill in zero days
  const velocity: { date: string; count: number }[] = [];
  for (let d = new Date(since); d <= new Date(); d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    velocity.push({ date: key, count: velocityMap[key] || 0 });
  }

  // --- Status distribution ---
  const statusCounts: Record<string, number> = {};
  for (const t of tasks) {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  }

  // --- Agent productivity ---
  const agentStats: Record<string, { created: number; completed: number; events: number }> = {};
  for (const e of events) {
    const agent = e.agent || "unassigned";
    if (!agentStats[agent]) agentStats[agent] = { created: 0, completed: 0, events: 0 };
    agentStats[agent].events++;
    if (!e.fromStatus) agentStats[agent].created++;
    if (e.toStatus === "done") agentStats[agent].completed++;
  }

  // --- Activity heatmap: hour-of-day × day-of-week ---
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const e of events) {
    const d = e.createdAt;
    heatmap[d.getUTCDay()][d.getUTCHours()]++;
  }

  // --- Status flow (transitions) ---
  const flowMap: Record<string, number> = {};
  for (const e of events) {
    if (e.fromStatus) {
      const key = `${e.fromStatus}→${e.toStatus}`;
      flowMap[key] = (flowMap[key] || 0) + 1;
    }
  }
  const statusFlow = Object.entries(flowMap).map(([key, count]) => {
    const [from, to] = key.split("→");
    return { from, to, count };
  }).sort((a, b) => b.count - a.count);

  // --- Priority distribution ---
  const priorityCounts: Record<string, number> = {};
  for (const t of tasks) {
    priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
  }

  // --- Throughput: created vs completed per day ---
  const throughputMap: Record<string, { created: number; completed: number }> = {};
  for (const e of events) {
    const day = e.createdAt.toISOString().slice(0, 10);
    if (!throughputMap[day]) throughputMap[day] = { created: 0, completed: 0 };
    if (!e.fromStatus) throughputMap[day].created++;
    if (e.toStatus === "done") throughputMap[day].completed++;
  }
  const throughput: { date: string; created: number; completed: number }[] = [];
  for (let d = new Date(since); d <= new Date(); d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    throughput.push({
      date: key,
      created: throughputMap[key]?.created || 0,
      completed: throughputMap[key]?.completed || 0,
    });
  }

  return NextResponse.json({
    period: { days, since: since.toISOString() },
    totalTasks: tasks.length,
    totalEvents: events.length,
    velocity,
    throughput,
    statusCounts,
    priorityCounts,
    agentStats,
    heatmap,
    statusFlow,
  });
}
