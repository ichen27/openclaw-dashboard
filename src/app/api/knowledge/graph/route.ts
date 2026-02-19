import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export interface KnowledgeNode {
  id: string;
  label: string;
  type: "task" | "category" | "agent";
  color: string;
  size: number;
  meta?: Record<string, string | number | null>;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  weight: number;
  label?: string;
}

const STATUS_COLOR: Record<string, string> = {
  done: "#10b981",
  "in-progress": "#3b82f6",
  review: "#f59e0b",
  backlog: "#6b7280",
  failed: "#ef4444",
};

const AGENT_COLOR = "#8b5cf6";

export async function GET() {
  const [tasks, categories] = await Promise.all([
    prisma.task.findMany({
      include: { events: { orderBy: { createdAt: "desc" }, take: 5 } },
    }),
    prisma.category.findMany({
      include: { _count: { select: { tasks: true } } },
    }),
  ]);

  const nodes: KnowledgeNode[] = [];
  const edges: KnowledgeEdge[] = [];
  const agentsSeen = new Set<string>();

  // Category nodes
  for (const cat of categories) {
    nodes.push({
      id: `cat:${cat.id}`,
      label: cat.name,
      type: "category",
      color: cat.color,
      size: Math.max(18, Math.min(40, cat._count.tasks * 4 + 14)),
      meta: { taskCount: cat._count.tasks, slug: cat.slug },
    });
  }

  // Task nodes + edges
  for (const task of tasks) {
    const nodeSize = task.priority === "high" ? 14 : task.priority === "medium" ? 11 : 8;
    nodes.push({
      id: `task:${task.id}`,
      label: task.title.length > 30 ? task.title.slice(0, 27) + "…" : task.title,
      type: "task",
      color: STATUS_COLOR[task.status] ?? "#6b7280",
      size: nodeSize,
      meta: {
        status: task.status,
        priority: task.priority,
        assignedAgent: task.assignedAgent,
        fullTitle: task.title,
      },
    });

    // Task → Category edge
    edges.push({
      source: `task:${task.id}`,
      target: `cat:${task.categoryId}`,
      weight: 2,
    });

    // Task → Agent edges
    const taskAgents = new Set<string>();
    if (task.assignedAgent) taskAgents.add(task.assignedAgent);
    for (const ev of task.events) {
      if (ev.agent) taskAgents.add(ev.agent);
    }

    for (const agent of taskAgents) {
      const agentId = `agent:${agent}`;
      if (!agentsSeen.has(agent)) {
        agentsSeen.add(agent);
        nodes.push({
          id: agentId,
          label: agent,
          type: "agent",
          color: AGENT_COLOR,
          size: 16,
        });
      }
      edges.push({
        source: `task:${task.id}`,
        target: agentId,
        weight: 1,
        label: "worked by",
      });
    }
  }

  // Summary stats
  const stats = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    taskCount: tasks.length,
    categoryCount: categories.length,
    agentCount: agentsSeen.size,
    statusBreakdown: Object.fromEntries(
      ["done", "in-progress", "review", "backlog", "failed"].map(s => [
        s,
        tasks.filter(t => t.status === s).length,
      ])
    ),
  };

  return NextResponse.json({ nodes, edges, stats });
}
