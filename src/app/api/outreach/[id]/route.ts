import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const STATUSES = ["pending", "replied", "call_scheduled", "referred", "no_response", "declined"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { company, contactName, contactRole, linkedinUrl, status, notes, sentAt, repliedAt } = body;

    const data: Record<string, unknown> = {};
    if (company !== undefined) data.company = company.trim();
    if (contactName !== undefined) data.contactName = contactName.trim();
    if (contactRole !== undefined) data.contactRole = contactRole;
    if (linkedinUrl !== undefined) data.linkedinUrl = linkedinUrl;
    if (status !== undefined && STATUSES.includes(status)) data.status = status;
    if (notes !== undefined) data.notes = notes;
    if (sentAt !== undefined) data.sentAt = sentAt ? new Date(sentAt) : new Date();
    if (repliedAt !== undefined) data.repliedAt = repliedAt ? new Date(repliedAt) : null;

    const updated = await prisma.outreach.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/outreach/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.outreach.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
