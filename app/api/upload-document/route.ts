import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB para PDFs
const ALLOWED_TYPES = ["application/pdf"];

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Tipo de archivo no permitido. Solo se aceptan archivos PDF" },
        { status: 400 }
      );
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: `El archivo es demasiado grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generar nombre único
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_"); // Sanitizar nombre
    const extension = "pdf";
    const fileName = `${timestamp}-${randomStr}-${originalName}`;

    // Asegurar que el directorio existe
    const documentsDir = join(process.cwd(), "public", "documents");
    if (!existsSync(documentsDir)) {
      await mkdir(documentsDir, { recursive: true });
    }

    // Convertir File a Buffer y guardar
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(documentsDir, fileName);

    await writeFile(filePath, buffer);

    // Retornar URL pública y nombre original
    const publicUrl = `/documents/${fileName}`;

    return NextResponse.json({ 
      ok: true, 
      url: publicUrl,
      fileName: originalName,
      size: file.size
    });
  } catch (error: any) {
    console.error("[POST /api/upload-document] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al subir el documento" },
      { status: 500 }
    );
  }
}

