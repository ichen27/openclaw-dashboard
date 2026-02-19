import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const DIFFICULTIES = ["easy", "medium", "hard"];
const STATUSES = ["solved", "attempted", "review"];
const CATEGORIES = [
  "arrays", "two_pointers", "sliding_window", "binary_search",
  "linked_list", "trees", "graphs", "dp", "stack", "heap",
  "intervals", "greedy", "math", "probability", "other",
];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty");
  const status = searchParams.get("status");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (difficulty) where.difficulty = difficulty;
  if (status) where.status = status;

  const [problems, stats] = await Promise.all([
    prisma.lCProblem.findMany({
      where,
      orderBy: { solvedAt: "desc" },
      ...(limit ? { take: limit } : {}),
    }),
    prisma.lCProblem.groupBy({
      by: ["difficulty", "category", "status"],
      _count: { id: true },
    }),
  ]);

  // Aggregate stats
  const totalSolved = await prisma.lCProblem.count({ where: { status: "solved" } });
  const thisWeek = await prisma.lCProblem.count({
    where: {
      status: "solved",
      solvedAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
    },
  });
  const today = await prisma.lCProblem.count({
    where: {
      status: "solved",
      solvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    },
  });

  const byCat: Record<string, number> = {};
  const byDiff: Record<string, number> = {};
  for (const g of stats) {
    if (g.status === "solved") {
      byCat[g.category] = (byCat[g.category] ?? 0) + g._count.id;
      byDiff[g.difficulty] = (byDiff[g.difficulty] ?? 0) + g._count.id;
    }
  }

  return NextResponse.json({
    problems,
    stats: { totalSolved, thisWeek, today, byCat, byDiff },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { number, title, url, difficulty, category, status, notes, timeMin, solvedAt } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const problem = await prisma.lCProblem.create({
      data: {
        number: number ? parseInt(number) : null,
        title: title.trim(),
        url: url || "",
        difficulty: DIFFICULTIES.includes(difficulty) ? difficulty : "medium",
        category: CATEGORIES.includes(category) ? category : "other",
        status: STATUSES.includes(status) ? status : "solved",
        notes: notes || "",
        timeMin: timeMin ? parseInt(timeMin) : null,
        solvedAt: solvedAt ? new Date(solvedAt) : new Date(),
      },
    });

    return NextResponse.json(problem, { status: 201 });
  } catch (err) {
    console.error("POST /api/lc error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
