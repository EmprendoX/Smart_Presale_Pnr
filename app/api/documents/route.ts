import { NextResponse } from "next/server";
import { db } from "@/lib/config";
import { ProjectDocument } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const developerId = searchParams.get("developerId");

    if (projectId) {
      const documents = await db.getDocumentsByProjectId(projectId);
      return NextResponse.json({ ok: true, data: documents });
    }

    if (developerId) {
      const documents = await db.getDocumentsByDeveloperId(developerId);
      return NextResponse.json({ ok: true, data: documents });
    }

    const documents = await db.getDocuments();
    return NextResponse.json({ ok: true, data: documents });
  } catch (error: any) {
    console.error("[GET /api/documents] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al obtener documentos" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      projectId,
      title,
      url,
      fileName,
      uploadedBy
    } = body || {};

    if (!projectId || !title || !url || !fileName || !uploadedBy) {
      return NextResponse.json(
        { ok: false, error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    const document: ProjectDocument = {
      id: crypto.randomUUID(),
      projectId,
      title: title.trim(),
      url,
      fileName,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
      access: "public" // Por defecto público para transparencia
    };

    const created = await db.createDocument(document);
    return NextResponse.json({ ok: true, data: created });
  } catch (error: any) {
    console.error("[POST /api/documents] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al crear el documento" },
      { status: 500 }
    );
  }
}

