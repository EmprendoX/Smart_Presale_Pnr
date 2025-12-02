import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/config";
import { Project } from "@/lib/types";
import { getAuthenticatedUser } from "@/lib/auth/roles";

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "tenant_default";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ ok: false, error: "Autenticación requerida" }, { status: 401 });
    }

    const tenantId = (user?.metadata?.tenantId as string | undefined) || DEFAULT_TENANT_ID;
    const project = await db.getProjectBySlug(slug);

    if (!project || project.status !== "published" || (project.tenantId || DEFAULT_TENANT_ID) !== tenantId) {
      return NextResponse.json(
        { ok: false, error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    const round = project.listingType === "presale" 
      ? await db.getRoundByProjectId(project.id) 
      : null;

    return NextResponse.json({
      ok: true,
      data: { project, round }
    });
  } catch (error: any) {
    console.error("[API /projects/[slug] GET] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al obtener el proyecto" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const existingProject = await db.getProjectBySlug(slug);

    if (!existingProject) {
      return NextResponse.json(
        { ok: false, error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Partial<Project> = {};

    // Actualizar solo los campos proporcionados
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.city !== undefined) updates.city = body.city.trim();
    if (body.country !== undefined) updates.country = body.country.trim();
    if (body.currency !== undefined) updates.currency = body.currency;
    if (body.status !== undefined) updates.status = body.status;
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.listingType !== undefined) updates.listingType = body.listingType;
    if (body.stage !== undefined) updates.stage = body.stage?.trim() || undefined;
    if (body.availabilityStatus !== undefined) updates.availabilityStatus = body.availabilityStatus || undefined;
    if (body.ticker !== undefined) updates.ticker = body.ticker?.trim() || undefined;
    if (body.totalUnits !== undefined) updates.totalUnits = body.totalUnits ? Number(body.totalUnits) : undefined;
    if (body.developmentStage !== undefined) updates.developmentStage = body.developmentStage?.trim() || undefined;
    if (body.propertyType !== undefined) updates.propertyType = body.propertyType?.trim() || undefined;
    if (body.propertyPrice !== undefined) updates.propertyPrice = body.propertyPrice ? Number(body.propertyPrice) : undefined;
    if (body.askingPrice !== undefined) updates.askingPrice = body.askingPrice ? Number(body.askingPrice) : undefined;
    if (body.featured !== undefined) updates.featured = Boolean(body.featured);
    if (body.automationReady !== undefined) updates.automationReady = Boolean(body.automationReady);

    if (body.images !== undefined) {
      updates.images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
    }
    if (body.videoUrl !== undefined) {
      updates.videoUrl = body.videoUrl?.trim() || undefined;
    }
    if (body.attributes !== undefined) {
      updates.attributes = Array.isArray(body.attributes) && body.attributes.length > 0 
        ? body.attributes.filter(Boolean) 
        : undefined;
    }
    if (body.specs !== undefined) {
      updates.specs = body.specs && typeof body.specs === "object" && Object.keys(body.specs).length > 0
        ? body.specs
        : undefined;
    }
    if (body.zone !== undefined) {
      updates.zone = body.zone && typeof body.zone === "object" && Object.keys(body.zone).length > 0
        ? body.zone
        : undefined;
    }
    if (body.propertyDetails !== undefined) {
      updates.propertyDetails = body.propertyDetails && typeof body.propertyDetails === "object" && Object.keys(body.propertyDetails).length > 0
        ? body.propertyDetails
        : undefined;
    }
    if (body.seo !== undefined) {
      updates.seo = body.seo && typeof body.seo === "object" && Object.keys(body.seo).length > 0
        ? body.seo
        : undefined;
    }
    if (body.tags !== undefined) {
      updates.tags = Array.isArray(body.tags) && body.tags.length > 0
        ? body.tags.filter(Boolean)
        : undefined;
    }
    if (body.agentIds !== undefined) {
      updates.agentIds = Array.isArray(body.agentIds) && body.agentIds.length > 0
        ? body.agentIds.filter(Boolean)
        : undefined;
    }

    const updated = await db.updateProject(existingProject.id, updates);

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Error al actualizar proyecto" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: updated
    });
  } catch (error: any) {
    console.error("[API /projects/[slug] PATCH] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al actualizar proyecto" },
      { status: 500 }
    );
  }
}
