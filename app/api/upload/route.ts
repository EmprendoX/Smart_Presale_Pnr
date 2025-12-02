import { NextRequest, NextResponse } from "next/server";

// MVP: Upload simple que retorna una URL mock
// TODO: Implementar upload real a Supabase Storage cuando esté configurado

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    const bucket = formData.get("bucket") as string | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Solo se permiten archivos de imagen" },
        { status: 400 }
      );
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "El archivo es demasiado grande. Máximo 5MB" },
        { status: 400 }
      );
    }

    // Convertir el archivo a data URL para guardarlo en el mock DB
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    // TODO: Cuando Supabase Storage esté configurado:
    // const supabase = createRouteHandlerClient({ cookies });
    // const { data, error } = await supabase.storage
    //   .from(bucket || 'project-media-public')
    //   .upload(`${projectId || 'temp'}/${fileName}`, file, {
    //     contentType: file.type,
    //     upsert: false
    //   });
    // if (error) throw error;
    // const { data: publicUrlData } = supabase.storage.from(bucket || 'project-media-public').getPublicUrl(data.path);

    return NextResponse.json({
      ok: true,
      url: dataUrl,
      path: `${projectId || 'temp'}/${Date.now()}-${Math.random().toString(36).substring(7)}`,
      message: "Archivo procesado (MVP: data URL en memoria)"
    });
  } catch (error: any) {
    console.error("[API /upload] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Error al subir el archivo" },
      { status: 500 }
    );
  }
}



