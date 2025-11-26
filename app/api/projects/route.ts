import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/config";
import { Project } from "@/lib/types";
import { randomUUID } from "crypto";

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "tenant_default";

export async function GET(request: NextRequest) {
  try {
    const projects = await db.getProjects();
    return NextResponse.json({
      ok: true,
      data: projects
    });
  } catch (error: any) {
    console.error("[API /projects GET] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al obtener proyectos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validaciones básicas
    if (!body.name || !body.city || !body.country) {
      return NextResponse.json(
        { ok: false, error: "Nombre, ciudad y país son requeridos" },
        { status: 400 }
      );
    }

    // Generar slug único
    const baseSlug = body.slug || body.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let slug = baseSlug;
    let counter = 1;
    const existingProjects = await db.getProjects();
    while (existingProjects.some(p => p.slug === slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const now = new Date().toISOString();
    
    const projectData: Project = {
      id: randomUUID(),
      slug,
      name: body.name.trim(),
      city: body.city.trim(),
      country: body.country.trim(),
      currency: body.currency || "USD",
      // Publicar por defecto para que los listados sean visibles sin pasos extra
      status: body.status || "published",
      tenantId: body.tenantId || DEFAULT_TENANT_ID,
      images: Array.isArray(body.images) ? body.images.filter(Boolean) : [],
      videoUrl: body.videoUrl?.trim() || undefined,
      description: body.description?.trim() || "",
      developerId: body.developerId?.trim() || "",
      createdAt: now,
      listingType: "presale",
      stage: body.stage?.trim() || undefined,
      availabilityStatus: body.availabilityStatus || undefined,
      ticker: body.ticker?.trim() || undefined,
      totalUnits: body.totalUnits ? Number(body.totalUnits) : undefined,
      attributes: Array.isArray(body.attributes) ? body.attributes.filter(Boolean) : undefined,
      specs: body.specs && typeof body.specs === "object" ? body.specs : undefined,
      zone: body.zone && typeof body.zone === "object" ? body.zone : undefined,
      propertyType: body.propertyType?.trim() || undefined,
      propertyPrice: body.propertyPrice ? Number(body.propertyPrice) : undefined,
      developmentStage: body.developmentStage?.trim() || undefined,
      askingPrice: body.askingPrice ? Number(body.askingPrice) : undefined,
      propertyDetails: body.propertyDetails && typeof body.propertyDetails === "object" ? body.propertyDetails : undefined,
      seo: body.seo && typeof body.seo === "object" ? body.seo : undefined,
      tags: Array.isArray(body.tags) ? body.tags.filter(Boolean) : undefined,
      featured: Boolean(body.featured),
      automationReady: Boolean(body.automationReady),
      agentIds: Array.isArray(body.agentIds) ? body.agentIds.filter(Boolean) : undefined,
    };

    // Si no se proporcionan imágenes, usar un placeholder para que la UI siempre muestre una portada
    if (!projectData.images || projectData.images.length === 0) {
      projectData.images = ["/images/project-placeholder.svg"];
    }

    const created = await db.createProject(projectData);

    return NextResponse.json({
      ok: true,
      data: created
    });
  } catch (error: any) {
    console.error("[API /projects POST] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al crear proyecto" },
      { status: 500 }
    );
  }
}



