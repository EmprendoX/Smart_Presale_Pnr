import { NextResponse } from "next/server";
import { db } from "@/lib/config";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await db.getReservationById(id);
  if (!r) return NextResponse.json({ ok: false, error: "Reserva no encontrada" }, { status: 404 });

  if (r.status !== "confirmed" && r.status !== "assigned") {
    return NextResponse.json({ ok: false, error: "Solo reservas confirmadas o asignadas" }, { status: 400 });
  }

  await db.updateReservation(id, { status: "refunded" });
  const tx = await db.getTransactionByReservationId(id);
  if (tx) await db.updateTransaction(tx.id, { status: "refunded" });

  const updated = await db.getReservationById(id);
  return NextResponse.json({ ok: true, data: updated });
}

