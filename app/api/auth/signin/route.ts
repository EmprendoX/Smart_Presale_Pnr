import { NextRequest, NextResponse } from "next/server";
import { getAuthClient } from "@/lib/auth/index";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Usar cliente unificado que maneja tanto mock como Supabase
    const authClient = getAuthClient();
    
    // Buscar usuario demo por email o usar investor por defecto
    const userId = email?.includes("admin") ? "u_admin_1" : "u_investor_1";
    
    await authClient.auth.signIn(userId);

    return NextResponse.json({
      success: true,
      message: "Sesión iniciada exitosamente (modo demo)"
    });
  } catch (error: any) {
    console.error("[API /auth/signin] Error:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}



