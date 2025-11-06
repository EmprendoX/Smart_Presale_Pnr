import { NextResponse } from "next/server";
import { db } from "@/lib/config";

export async function POST(req: Request) {
  const body = await req.json();
  const { reservationId } = body || {};

  const r = await db.getReservationById(reservationId);
  if (!r) return NextResponse.json({ ok: false, error: "Reserva no encontrada" }, { status: 404 });

  // Simular cobro
  const newStatus = r.status === "waitlisted" ? "waitlisted" : "confirmed";
  await db.updateReservation(reservationId, { status: newStatus });

  const txId = `tx_${Math.random().toString(36).slice(2, 10)}`;
  const round = await db.getRoundById(r.roundId);
  const project = round ? await db.getProjectById(round.projectId) : null;

  await db.createTransaction({
    id: txId,
    reservationId: r.id,
    provider: "simulated",
    amount: r.amount,
    currency: project?.currency || "USD",
    status: newStatus === "confirmed" ? "succeeded" : "pending"
  });

  return NextResponse.json({ ok: true, data: { txId } });
}

