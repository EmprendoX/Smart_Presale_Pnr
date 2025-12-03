import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/roles";

export async function GET(request: NextRequest) {
  try {
    // Crear NextResponse para pasarlo a getAuthenticatedUser
    const response = NextResponse.json({ ok: true });
    const user = await getAuthenticatedUser(request, response);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      user
    });
  } catch (error: any) {
    console.error("[API /auth/me] Error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}

