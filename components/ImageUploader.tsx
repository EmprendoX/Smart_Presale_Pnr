"use client";

import { useState, useRef } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { useToast } from "./ui/Toast";

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { show } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      show("Por favor selecciona un archivo de imagen válido", "Error");
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      show("El archivo es demasiado grande. Máximo 5MB", "Error");
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Subir archivo
    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Error al subir la imagen");
      }

      // Agregar la URL retornada a la lista
      if (data.url && !images.includes(data.url)) {
        onChange([...images, data.url]);
        show("Imagen subida exitosamente", "Éxito");
      }

      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      show(error.message || "Error al subir la imagen", "Error");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const addImage = () => {
    if (newImageUrl.trim() && !images.includes(newImageUrl.trim())) {
      onChange([...images, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Imágenes del proyecto</label>
      
      {/* Botón para subir archivo */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          onClick={openFileSelector}
          variant="primary"
          disabled={uploading}
        >
          {uploading ? "Subiendo..." : "📷 Subir imagen"}
        </Button>
        <span className="text-sm text-neutral-500 self-center">o</span>
      </div>

      {/* Preview antes de subir */}
      {preview && (
        <div className="relative">
          <div className="aspect-video rounded-md bg-neutral-100 overflow-hidden border-2 border-brand">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
              <div className="text-white text-sm">Subiendo...</div>
            </div>
          )}
        </div>
      )}

      {/* Input para agregar URL */}
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="https://images.unsplash.com/photo-..."
          value={newImageUrl}
          onChange={(e) => setNewImageUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImage())}
        />
        <Button type="button" onClick={addImage} variant="secondary" disabled={!newImageUrl.trim()}>
          Agregar URL
        </Button>
      </div>

      {/* Preview de imágenes */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <div className="aspect-video rounded-md bg-neutral-100 overflow-hidden">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23e5e5e5' width='400' height='300'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImagen no disponible%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white hover:bg-red-600"
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-500">
        Sube imágenes desde tu computadora o agrega URLs de imágenes (ej: Unsplash, Pexels). La primera imagen será la principal.
      </p>
    </div>
  );
}


