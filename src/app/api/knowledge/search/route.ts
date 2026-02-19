import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MEMORY_PATHS = [
  "/Users/chenagent/.openclaw-agent-2/workspace/MEMORY.md",
  "/Users/chenagent/.openclaw/workspace/MEMORY.md",
  "/Users/chenagent/.openclaw-agent-2/workspace/memory",
  "/Users/chenagent/.openclaw/workspace/memory",
];

interface SearchResult {
  type: "task" | "memory" | "category";
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
  score: number;
  meta?: Record<string, string | null>;
}

function highlight(text: string, query: string, maxLen = 160): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, maxLen);
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + query.length + 80);
  let excerpt = text.slice(start, end);
  if (start > 0) excerpt = "…" + excerpt;
  if (end < text.length) excerpt = excerpt + "…";
  return excerpt;
}

function scoreText(text: string, query: string): number {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  let score = 0;
  for (const word of words) {
    const count = (lower.match(new RegExp(word, "g")) ?? []).length;
    score += count;
    // Bonus for exact phrase
    if (lower.includes(q)) score += 5;
    // Bonus for title/header match
    const lines = lower.split("\n").slice(0, 3).join(" ");
    if (lines.includes(word)) score += 2;
  }
  return score;
}

function readMemoryFiles(): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];

  for (const mp of MEMORY_PATHS) {
    try {
      const stat = fs.statSync(mp);
      if (stat.isDirectory()) {
        const entries = fs.readdirSync(mp).filter(f => f.endsWith(".md") || f.endsWith(".json"));
        for (const entry of entries.slice(-14)) { // last 14 files
          try {
            const content = fs.readFileSync(path.join(mp, entry), "utf-8");
            files.push({ path: path.join(mp, entry), content });
          } catch { /* skip */ }
        }
      } else {
        const content = fs.readFileSync(mp, "utf-8");
        files.push({ path: mp, content });
      }
    } catch { /* skip */ }
  }

  return files;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q")?.trim() ?? "";
  const types = (searchParams.get("types") ?? "tasks,memory,categories").split(",");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], total: 0, query });
  }

  const results: SearchResult[] = [];

  // --- Search tasks ---
  if (types.includes("tasks")) {
    const tasks = await prisma.task.findMany({
      include: { category: true, events: { orderBy: { createdAt: "desc" }, take: 3 } },
      orderBy: { updatedAt: "desc" },
    });

    for (const task of tasks) {
      const searchable = `${task.title} ${task.description} ${task.requirements} ${task.category.name}`;
      const score = scoreText(searchable, query);
      if (score === 0) continue;

      const agents = [...new Set(task.events.map(e => e.agent).filter(Boolean))];

      results.push({
        type: "task",
        id: task.id,
        title: task.title,
        excerpt: highlight(task.description || task.title, query),
        tags: [task.status, task.priority, task.category.name, ...agents as string[]].filter(Boolean),
        score: score * (task.priority === "high" ? 1.5 : task.priority === "medium" ? 1.2 : 1),
        meta: {
          status: task.status,
          priority: task.priority,
          category: task.category.name,
          categoryColor: task.category.color,
          assignedAgent: task.assignedAgent,
          updatedAt: task.updatedAt.toISOString(),
        },
      });
    }
  }

  // --- Search categories ---
  if (types.includes("categories")) {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { tasks: true } } },
    });

    for (const cat of categories) {
      const score = scoreText(cat.name + " " + cat.slug, query);
      if (score === 0) continue;

      results.push({
        type: "category",
        id: cat.id,
        title: cat.name,
        excerpt: `${cat._count.tasks} tasks`,
        tags: [cat.slug],
        score,
        meta: { color: cat.color, taskCount: String(cat._count.tasks) },
      });
    }
  }

  // --- Search memory files ---
  if (types.includes("memory")) {
    const memFiles = readMemoryFiles();

    for (const { path: filePath, content } of memFiles) {
      const score = scoreText(content, query);
      if (score === 0) continue;

      const filename = path.basename(filePath);
      // Find best matching section
      const sections = content.split(/^##\s+/m);
      let bestSection = "";
      let bestScore = 0;

      for (const section of sections) {
        const s = scoreText(section, query);
        if (s > bestScore) {
          bestScore = s;
          bestSection = section;
        }
      }

      const excerpt = highlight(bestSection || content, query, 200);
      const agentDir = filePath.includes("openclaw-agent-2") ? "agent-2" : "agent-1";

      results.push({
        type: "memory",
        id: filePath,
        title: filename.replace(".md", "").replace(".json", ""),
        excerpt,
        tags: [agentDir, filename.includes("-") ? "daily" : "long-term"],
        score,
        meta: { path: filePath, agent: agentDir },
      });
    }
  }

  // Sort by score desc, then limit
  results.sort((a, b) => b.score - a.score);
  const topResults = results.slice(0, limit);

  return NextResponse.json({
    results: topResults,
    total: results.length,
    query,
  });
}
