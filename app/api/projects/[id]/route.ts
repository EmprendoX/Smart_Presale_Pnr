import { NextResponse } from "next/server";
import { db } from "@/lib/config";
import { findProjectById, findProjectBySlug } from "@/lib/mockdb";
import { ProjectStatus } from "@/lib/types";

// Validar transiciones de estado válidas
const isValidStatusTransition = (currentStatus: ProjectStatus, newStatus: ProjectStatus): boolean => {
  const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
    draft: ["draft", "review"],
    review: ["review", "published", "draft"],
    published: ["published", "review"]
  };
  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = (await findProjectById(id)) || (await findProjectBySlug(id));
  if (!p) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });

  const round = await db.getRoundByProjectId(p.id);
  return NextResponse.json({ ok: true, data: { project: p, round } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const { id } = await params;
    
    // Buscar el proyecto
    const p = await findProjectById(id);
    if (!p) {
      return NextResponse.json({ ok: false, error: "Proyecto no encontrado" }, { status: 404 });
    }

    // Validar transición de estado si se está actualizando el status
    if (body.status && body.status !== p.status) {
      if (!isValidStatusTransition(p.status, body.status)) {
        return NextResponse.json({ 
          ok: false, 
          error: `Transición de estado inválida: no se puede cambiar de "${p.status}" a "${body.status}"` 
        }, { status: 400 });
      }
    }

    // Actualizar el proyecto
    const updated = await db.updateProject(id, body);
    
    if (!updated) {
      return NextResponse.json({ 
        ok: false, 
        error: "No se pudo actualizar el proyecto. El proyecto puede no existir." 
      }, { status: 500 });
    }

    // Verificar que la actualización se guardó correctamente
    const verify = await db.getProjectById(id);
    if (!verify) {
      return NextResponse.json({ 
        ok: false, 
        error: "Error: la actualización no se guardó correctamente" 
      }, { status: 500 });
    }

    // Logging para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PATCH /api/projects/${id}] Proyecto actualizado:`, {
        id,
        oldStatus: p.status,
        newStatus: verify.status,
        updates: body
      });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    console.error('[PATCH /api/projects/[id]] Error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Error interno al actualizar el proyecto" 
    }, { status: 500 });
  }
}
