import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const COLORS = ["default", "blue", "green", "amber", "red", "violet"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { title, content, tags, pinned, color } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim() || "Untitled";
    if (content !== undefined) data.content = content;
    if (tags !== undefined) data.tags = Array.isArray(tags) ? JSON.stringify(tags) : "[]";
    if (pinned !== undefined) data.pinned = pinned;
    if (color !== undefined && COLORS.includes(color)) data.color = color;

    const note = await prisma.note.update({ where: { id }, data });
    return NextResponse.json(note);
  } catch (err) {
    console.error("PATCH /api/notes/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
