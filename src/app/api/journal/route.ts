import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const date = searchParams.get("date");
    const daysParam = searchParams.get("days");

    if (date) {
      const entry = await prisma.journalEntry.findUnique({
        where: { date },
      });
      if (!entry) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 });
      }
      return NextResponse.json(entry);
    }

    const days = daysParam ? parseInt(daysParam, 10) : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const entries = await prisma.journalEntry.findMany({
      where: { date: { gte: cutoffStr } },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: "Failed to fetch journal entries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, goals, tasks, notes, mood, pnl } = body;

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const entry = await prisma.journalEntry.upsert({
      where: { date },
      update: {
        ...(goals !== undefined && { goals: JSON.stringify(goals) }),
        ...(tasks !== undefined && { tasks: JSON.stringify(tasks) }),
        ...(notes !== undefined && { notes }),
        ...(mood !== undefined && { mood }),
        ...(pnl !== undefined && { pnl }),
      },
      create: {
        date,
        goals: goals ? JSON.stringify(goals) : "[]",
        tasks: tasks ? JSON.stringify(tasks) : "[]",
        notes: notes || "",
        mood: mood || "neutral",
        pnl: pnl ?? null,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, goals, tasks, notes, mood, pnl } = body;

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const existing = await prisma.journalEntry.findUnique({ where: { date } });
    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (goals !== undefined) data.goals = JSON.stringify(goals);
    if (tasks !== undefined) data.tasks = JSON.stringify(tasks);
    if (notes !== undefined) data.notes = notes;
    if (mood !== undefined) data.mood = mood;
    if (pnl !== undefined) data.pnl = pnl;

    const entry = await prisma.journalEntry.update({
      where: { date },
      data,
    });

    return NextResponse.json(entry);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const existing = await prisma.journalEntry.findUnique({ where: { date } });
    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    await prisma.journalEntry.delete({ where: { date } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}
