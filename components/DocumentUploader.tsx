"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { useToast } from "./ui/Toast";

interface DocumentUploaderProps {
  projectId: string;
  uploadedBy: string;
  onDocumentAdded?: () => void;
}

export function DocumentUploader({ projectId, uploadedBy, onDocumentAdded }: DocumentUploaderProps) {
  const t = useTranslations("documents");
  const tMessages = useTranslations("messages");
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { show } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      show(t("noFile"), tMessages("error"));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      show(t("fileTooLarge"), tMessages("error"));
      return;
    }

    setSelectedFile(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.pdf$/i, ""));
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile || !title.trim()) {
      show(t("completeFields"), tMessages("error"));
      return;
    }

    setUploading(true);
    try {
      // Subir archivo
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadRes = await fetch("/api/upload-document", {
        method: "POST",
        body: formData
      });

      const uploadData = await uploadRes.json();

      if (!uploadData.ok) {
        throw new Error(uploadData.error || t("uploadError"));
      }

      // Crear documento en la base de datos
      const docRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          url: uploadData.url,
          fileName: uploadData.fileName,
          uploadedBy
        })
      });

      const docData = await docRes.json();

      if (!docData.ok) {
        throw new Error(docData.error || t("uploadError"));
      }

      show(tMessages("saveSuccess"), tMessages("success"));
      setTitle("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onDocumentAdded?.();
    } catch (error: any) {
      show(error.message || t("uploadError"), tMessages("error"));
    } finally {
      setUploading(false);
    }
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="font-medium text-lg">{t("upload")}</h3>
      
      <div>
        <label className="text-sm font-medium">{t("title")}</label>
        <Input
          type="text"
          placeholder={t("titlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex gap-2 items-center">
          <Button
            type="button"
            onClick={openFileSelector}
            variant="secondary"
            disabled={uploading}
          >
            📄 {t("selectFile")}
          </Button>
          {selectedFile && (
            <span className="text-sm text-neutral-600">
              {t("fileSelected")}: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={uploadDocument}
          disabled={!selectedFile || !title.trim() || uploading}
        >
          {uploading ? t("uploading") : t("uploadButton")}
        </Button>
      </div>
    </div>
  );
}

