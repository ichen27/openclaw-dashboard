import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const COLORS = ["default", "blue", "green", "amber", "red", "violet"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q");
  const tag = searchParams.get("tag");

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { content: { contains: q } },
    ];
  }
  if (tag) {
    where.tags = { contains: tag };
  }

  const notes = await prisma.note.findMany({
    where,
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json(notes);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, tags, pinned, color } = body;

    const note = await prisma.note.create({
      data: {
        title: title?.trim() || "Untitled",
        content: content || "",
        tags: Array.isArray(tags) ? JSON.stringify(tags) : "[]",
        pinned: pinned ?? false,
        color: COLORS.includes(color) ? color : "default",
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error("POST /api/notes error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
