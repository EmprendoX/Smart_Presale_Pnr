import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/config";
import { getAuthenticatedUser, requireRole } from "@/lib/auth/roles";

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "tenant_default";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!requireRole(user, ["admin"])) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
    }

    const tenantId = (user?.metadata?.tenantId as string | undefined) || DEFAULT_TENANT_ID;

    const [developers, agents] = await Promise.all([db.getDevelopers(), db.getAgents()]);
    const filteredDevelopers = developers.filter(dev => (dev.tenantId || DEFAULT_TENANT_ID) === tenantId);

    return NextResponse.json({
      ok: true,
      data: {
        developers: filteredDevelopers,
        agents
      }
    });
  } catch (error) {
    console.error("[admin/meta] Failed to load metadata", error);
    return NextResponse.json({ ok: false, error: "Failed to load admin metadata" }, { status: 500 });
  }
}
