import { NextResponse } from "next/server";
import { db } from "@/lib/config";
import { byRoundReservations } from "@/lib/mockdb";
import { computeProgress, nextRoundStatus } from "@/lib/rules";

export async function POST(req: Request) {
  const body = await req.json();
  const { roundId } = body || {};

  const round = await db.getRoundById(String(roundId));
  if (!round) return NextResponse.json({ ok: false, error: "Ronda no encontrada" }, { status: 404 });

  const reservations = await byRoundReservations(round.id);
  const summary = computeProgress(round, reservations);
  const newStatus = nextRoundStatus(round, summary.percent);
  await db.updateRound(roundId, { status: newStatus });

  if (newStatus === "not_met") {
    // Reembolsos automáticos
    const confirmedReservations = reservations.filter(r => r.status === "confirmed");
    for (const reservation of confirmedReservations) {
      await db.updateReservation(reservation.id, { status: "refunded" });
      const tx = await db.getTransactionByReservationId(reservation.id);
      if (tx) await db.updateTransaction(tx.id, { status: "refunded" });
    }
  }

  // Si fulfilled/closed -> opción de mover a "promesa/enganche" (no implementado en MVP)
  return NextResponse.json({ ok: true, data: { status: newStatus } });
}

