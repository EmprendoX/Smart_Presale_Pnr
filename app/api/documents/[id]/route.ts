import { NextResponse } from "next/server";
import { db } from "@/lib/config";
import { ProjectDocument } from "@/lib/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title } = body || {};

    const updates: Partial<ProjectDocument> = {};
    if (title !== undefined) updates.title = title.trim();

    const updated = await db.updateDocument(id, updates);
    
    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Documento no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH /api/documents/[id]] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al actualizar el documento" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deleted = await db.deleteDocument(id);

    if (!deleted) {
      return NextResponse.json(
        { ok: false, error: "Documento no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, message: "Documento eliminado" });
  } catch (error: any) {
    console.error("[DELETE /api/documents/[id]] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al eliminar el documento" },
      { status: 500 }
    );
  }
}

