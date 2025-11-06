import { NextResponse } from "next/server";
import { db } from "@/lib/config";
import { Trade, PricePoint } from "@/lib/types";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json();
  const buyerUserId = body?.buyerUserId;
  const { id } = await params;

  const listing = await db.getListingById(id);
  if (!listing) {
    return NextResponse.json({ ok: false, error: "Listado no encontrado" }, { status: 404 });
  }

  if (listing.status !== "active") {
    return NextResponse.json({ ok: false, error: "Listado no activo" }, { status: 400 });
  }

  const filledAt = new Date().toISOString();
  await db.updateListing(id, { status: "sold", filledAt });

  const trade: Trade = {
    id: crypto.randomUUID(),
    listingId: listing.id,
    buyerUserId,
    price: listing.ask,
    slots: listing.slots,
    createdAt: filledAt
  };

  await db.createTrade(trade);

  // Actualizar curva de precio con último trade
  const pricePerSlot = listing.ask / listing.slots;
  const pricePoint: PricePoint = {
    ts: filledAt,
    price: pricePerSlot,
    volume: listing.slots
  };

  await db.addPricePoint(listing.projectId, pricePoint);

  return NextResponse.json({ ok: true, data: trade });
}

