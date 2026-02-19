import { prisma } from "@/lib/prisma";
import { getAllAgents } from "@/lib/agents";
import { NextRequest, NextResponse } from "next/server";

// Priority → numeric weight
const PRIORITY_WEIGHT: Record<string, number> = {
  high: 10,
  medium: 5,
  low: 2,
};

// Category slug/name keyword → agent id affinity scores
// Actual agent IDs: "main" (primary), "research-agent", "qwen-worker", "llama-8b", "agent-4"
const CATEGORY_AGENT_AFFINITY: Record<string, Record<string, number>> = {
  "internal-dashboard": { "main": 8, "agent-4": 6 },
  "portfolio-website":  { "main": 9, "agent-4": 5 },
  "kalshi-vol-arb":     { "main": 7, "research-agent": 8 },
};

// Keyword affinity overrides based on task title/desc
const KEYWORD_AFFINITY: Array<{ pattern: RegExp; scores: Record<string, number> }> = [
  { pattern: /dashboard|ui|component|analytics/i,     scores: { "main": 8, "agent-4": 5 } },
  { pattern: /portfolio|github|readme|deploy/i,        scores: { "main": 9 } },
  { pattern: /trading|kalshi|strategy|market.making/i, scores: { "research-agent": 9, "main": 5 } },
  { pattern: /internship|job|apply|search/i,           scores: { "main": 10 } },
  { pattern: /research|knowledge|data|graph/i,         scores: { "research-agent": 9, "main": 5 } },
  { pattern: /agent|task|orchestrat|auction/i,         scores: { "main": 9 } },
  { pattern: /summary|digest|analysis/i,               scores: { "research-agent": 8, "main": 5 } },
];

interface AuctionTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  assignedAgent: string | null;
  createdAt: string;
  score: number;
  agentBids: AgentBid[];
  suggestedAgent: string | null;
}

interface AgentBid {
  agentId: string;
  agentName: string;
  score: number;
  reasons: string[];
  available: boolean;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get("limit") ?? "20");

  // Get backlog tasks (unassigned first, then assigned)
  const tasks = await prisma.task.findMany({
    where: { status: "backlog" },
    include: { category: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  // Get all agents, deduplicate by id (keep first seen = most active workspace)
  const allAgents = getAllAgents();
  const seenIds = new Set<string>();
  const agents = allAgents.filter(a => {
    if (seenIds.has(a.id)) return false;
    seenIds.add(a.id);
    return true;
  });
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  // Score each task
  const auctionTasks: AuctionTask[] = tasks.map(task => {
    const priorityScore = PRIORITY_WEIGHT[task.priority] ?? 3;
    // Age bonus: older tasks score higher (up to +3 after 7 days)
    const ageDays = (now - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const ageBonus = Math.min(ageDays / 7, 1) * 3;
    const taskScore = priorityScore + ageBonus;

    // Score each agent
    const agentBids: AgentBid[] = agents.map(agent => {
      let score = 0;
      const reasons: string[] = [];

      // Category affinity
      const catAffinity = CATEGORY_AGENT_AFFINITY[task.category.slug];
      if (catAffinity?.[agent.id]) {
        score += catAffinity[agent.id];
        reasons.push(`category match (${task.category.name})`);
      }

      // Keyword affinity
      const searchText = `${task.title} ${task.description}`;
      for (const kw of KEYWORD_AFFINITY) {
        if (kw.pattern.test(searchText) && kw.scores[agent.id]) {
          score += kw.scores[agent.id];
          reasons.push(`keyword match`);
        }
      }

      // Availability bonus: idle agents preferred over active
      const isIdle = agent.status === 'idle' || agent.status === 'never';
      const recentlyActive = agent.lastActive && (now - agent.lastActive) < ONE_HOUR;
      if (isIdle && !recentlyActive) {
        score += 5;
        reasons.push('agent idle/available');
      } else if (agent.status === 'active') {
        score -= 2;
        reasons.push('agent active (busy)');
      }

      // Penalize if agent already has in-progress task
      const available = agent.activeSessions < 3;

      if (score === 0) {
        score = 1; // base score for any agent
      }

      return {
        agentId: agent.id,
        agentName: agent.name,
        score,
        reasons: [...new Set(reasons)],
        available,
      };
    });

    // Sort bids descending
    agentBids.sort((a, b) => b.score - a.score);

    const suggestedAgent = agentBids.find(b => b.available)?.agentId ?? null;

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      categoryId: task.categoryId,
      categoryName: task.category.name,
      categorySlug: task.category.slug,
      assignedAgent: task.assignedAgent,
      createdAt: task.createdAt.toISOString(),
      score: taskScore,
      agentBids,
      suggestedAgent,
    };
  });

  // Sort by task score descending
  auctionTasks.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    tasks: auctionTasks,
    agents: agents.map(a => ({
      id: a.id,
      name: a.name,
      status: a.status,
      activeSessions: a.activeSessions,
    })),
    generatedAt: new Date().toISOString(),
  });
}

// POST: Assign agent to task (claim/bid)
export async function POST(request: NextRequest) {
  try {
    const { taskId, agentId } = await request.json();

    if (!taskId || !agentId) {
      return NextResponse.json({ error: "taskId and agentId are required" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { category: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        assignedAgent: agentId,
        status: "in-progress",
      },
      include: { category: true },
    });

    // Log the status change event
    await prisma.taskEvent.create({
      data: {
        taskId,
        fromStatus: task.status,
        toStatus: "in-progress",
        agent: agentId,
      },
    });

    return NextResponse.json({ success: true, task: updated });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
