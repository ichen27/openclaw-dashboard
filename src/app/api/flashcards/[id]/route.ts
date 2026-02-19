import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { correct } = body; // true = got it, false = missed

    const card = await prisma.flashcard.findUnique({ where: { id } });
    if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: Record<string, unknown> = {
      reviewed: card.reviewed + 1,
      lastSeen: new Date(),
    };
    if (correct === true) data.correct = card.correct + 1;
    if (correct === false) data.correct = Math.max(0, card.correct); // no change on miss

    // Also allow general field updates
    const { question, answer, category, difficulty } = body;
    if (question !== undefined) data.question = question.trim();
    if (answer !== undefined) data.answer = answer.trim();
    if (category !== undefined) data.category = category;
    if (difficulty !== undefined) data.difficulty = difficulty;

    const updated = await prisma.flashcard.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/flashcards/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.flashcard.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
