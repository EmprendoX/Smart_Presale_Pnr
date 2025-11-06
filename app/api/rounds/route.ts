import { NextResponse } from "next/server";
import { db } from "@/lib/config";
import { Round } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json();
  const { projectId, goalType, goalValue, depositAmount, slotsPerPerson, deadlineAt, rule, partialThreshold, groupSlots } = body || {};

  if (!projectId || !goalType || !goalValue || !depositAmount || !slotsPerPerson || !deadlineAt || !rule)
    return NextResponse.json({ ok: false, error: "Faltan campos" }, { status: 400 });

  const r: Round = {
    id: crypto.randomUUID(),
    projectId, goalType, goalValue,
    depositAmount, slotsPerPerson, deadlineAt, rule,
    partialThreshold: partialThreshold ?? 0.7,
    status: "open",
    createdAt: new Date().toISOString(),
    groupSlots: groupSlots ? Number(groupSlots) : null
  };

  await db.createRound(r);
  return NextResponse.json({ ok: true, data: r });
}

