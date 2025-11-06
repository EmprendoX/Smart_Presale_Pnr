import { NextResponse } from "next/server";
import { db } from "@/lib/config";
import { SecondaryListing } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "projectId requerido" }, { status: 400 });
  }

  const listings = await db.getListingsByProjectId(projectId);
  return NextResponse.json({ ok: true, data: listings });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { projectId, roundId, sellerUserId, slots, ask, currency } = body || {};

  if (!projectId || !roundId || !sellerUserId || !slots || !ask) {
    return NextResponse.json({ ok: false, error: "Datos incompletos" }, { status: 400 });
  }

  const listing: SecondaryListing = {
    id: crypto.randomUUID(),
    projectId,
    roundId,
    sellerUserId,
    slots,
    ask,
    currency,
    status: "active",
    createdAt: new Date().toISOString()
  };

  await db.createListing(listing);
  return NextResponse.json({ ok: true, data: listing });
}

