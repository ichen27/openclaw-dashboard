import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get("date") ?? today();

  const goals = await prisma.dailyGoal.findMany({
    where: { date },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(goals);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, date } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const targetDate = date ?? today();
    const count = await prisma.dailyGoal.count({ where: { date: targetDate } });

    const goal = await prisma.dailyGoal.create({
      data: {
        text: text.trim(),
        date: targetDate,
        order: count,
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (err) {
    console.error("POST /api/goals error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  // Bulk update: [{ id, done?, text? }]
  try {
    const updates = await request.json() as { id: string; done?: boolean; text?: string }[];
    const results = await Promise.all(
      updates.map(({ id, done, text }) =>
        prisma.dailyGoal.update({
          where: { id },
          data: {
            ...(done !== undefined ? { done } : {}),
            ...(text !== undefined ? { text: text.trim() } : {}),
          },
        })
      )
    );
    return NextResponse.json(results);
  } catch (err) {
    console.error("PATCH /api/goals error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.dailyGoal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
