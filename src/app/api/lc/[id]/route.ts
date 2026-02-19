import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { number, title, url, difficulty, category, status, notes, timeMin, solvedAt } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (url !== undefined) data.url = url;
    if (number !== undefined) data.number = number ? parseInt(number) : null;
    if (difficulty !== undefined) data.difficulty = difficulty;
    if (category !== undefined) data.category = category;
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;
    if (timeMin !== undefined) data.timeMin = timeMin ? parseInt(timeMin) : null;
    if (solvedAt !== undefined) data.solvedAt = solvedAt ? new Date(solvedAt) : new Date();

    const updated = await prisma.lCProblem.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/lc/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.lCProblem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
