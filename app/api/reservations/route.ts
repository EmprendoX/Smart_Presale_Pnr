import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/config";
import { randomUUID } from "crypto";

const DEFAULT_USER_ID = "u_investor_1"; // Usuario mock por defecto

export async function POST(request: NextRequest) {
  try {
    // Usar usuario mock por defecto (sin autenticación)
    const userId = DEFAULT_USER_ID;

    const body = await request.json();
    const { roundId, slots, kyc } = body;

    if (!roundId || !slots || slots < 1) {
      return NextResponse.json(
        { ok: false, error: "roundId y slots son requeridos" },
        { status: 400 }
      );
    }

    // Obtener ronda
    const round = await db.getRoundById(roundId);
    if (!round) {
      return NextResponse.json(
        { ok: false, error: "Ronda no encontrada" },
        { status: 404 }
      );
    }

    // Validar slots disponibles
    if (slots > (round.slotsPerPerson || 10)) {
      return NextResponse.json(
        { ok: false, error: `Máximo ${round.slotsPerPerson || 10} slots por persona` },
        { status: 400 }
      );
    }

    // Calcular monto
    const amount = slots * round.depositAmount;

    // Crear reserva
    const reservation = {
      id: randomUUID(),
      roundId,
      userId,
      slots,
      amount,
      status: "pending" as const,
      createdAt: new Date().toISOString()
    };

    const created = await db.createReservation(reservation);

    return NextResponse.json({
      ok: true,
      data: created
    });
  } catch (error: any) {
    console.error("[API /reservations] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al crear la reserva" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    
    // Usar userId del query o usuario mock por defecto
    const userId = userIdParam || DEFAULT_USER_ID;

    const reservations = await db.getReservationsByUserId(userId);

    return NextResponse.json({
      ok: true,
      data: reservations
    });
  } catch (error: any) {
    console.error("[API /reservations GET] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al obtener reservas" },
      { status: 500 }
    );
  }
}



