import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const STAGES = [
  "not_applied",
  "applied",
  "phone_screen",
  "technical",
  "final_round",
  "offer",
  "rejected",
  "withdrawn",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(app);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { company, role, url, stage, priority, notes, taskId, nextAction, appliedAt, interviewDate, offerDeadline } = body;

    const data: Record<string, unknown> = {};
    if (company !== undefined) data.company = company.trim();
    if (role !== undefined) data.role = role.trim();
    if (url !== undefined) data.url = url;
    if (stage !== undefined && STAGES.includes(stage)) data.stage = stage;
    if (priority !== undefined) data.priority = priority;
    if (notes !== undefined) data.notes = notes;
    if (taskId !== undefined) data.taskId = taskId || null;
    if (nextAction !== undefined) data.nextAction = nextAction;
    if (appliedAt !== undefined) data.appliedAt = appliedAt ? new Date(appliedAt) : null;
    if (interviewDate !== undefined) data.interviewDate = interviewDate ? new Date(interviewDate) : null;
    if (offerDeadline !== undefined) data.offerDeadline = offerDeadline ? new Date(offerDeadline) : null;

    const updated = await prisma.application.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/applications/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.application.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
