import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const CATEGORIES = ["algorithm", "probability", "system_design", "behavioral", "other"];
const DIFFICULTIES = ["easy", "medium", "hard"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty");
  const mode = searchParams.get("mode"); // "study" = random order, weight by incorrect

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (difficulty) where.difficulty = difficulty;

  const cards = await prisma.flashcard.findMany({
    where,
    orderBy: mode === "study"
      ? { lastSeen: "asc" }  // oldest seen first
      : { createdAt: "desc" },
  });

  const stats = {
    total: await prisma.flashcard.count(),
    byCategory: {} as Record<string, number>,
    accuracy: 0,
  };

  const all = await prisma.flashcard.findMany({ select: { category: true, reviewed: true, correct: true } });
  for (const c of all) {
    stats.byCategory[c.category] = (stats.byCategory[c.category] ?? 0) + 1;
  }
  const totalReviewed = all.reduce((s, c) => s + c.reviewed, 0);
  const totalCorrect = all.reduce((s, c) => s + c.correct, 0);
  stats.accuracy = totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0;

  return NextResponse.json({ cards, stats });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, answer, category, difficulty, tags } = body;

    if (!question?.trim() || !answer?.trim()) {
      return NextResponse.json({ error: "question and answer are required" }, { status: 400 });
    }

    const card = await prisma.flashcard.create({
      data: {
        question: question.trim(),
        answer: answer.trim(),
        category: CATEGORIES.includes(category) ? category : "algorithm",
        difficulty: DIFFICULTIES.includes(difficulty) ? difficulty : "medium",
        tags: Array.isArray(tags) ? JSON.stringify(tags) : "[]",
      },
    });

    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    console.error("POST /api/flashcards error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
