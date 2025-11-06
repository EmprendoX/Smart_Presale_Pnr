"use client";

import { useTranslations, useLocale } from "next-intl";
import { ProjectDocument } from "@/lib/types";
import { shortDate } from "@/lib/format";
import { Button } from "./ui/Button";

interface DocumentListProps {
  documents: ProjectDocument[];
  onDelete?: (id: string) => void;
  showDelete?: boolean;
}

export function DocumentList({ documents, onDelete, showDelete = false }: DocumentListProps) {
  const t = useTranslations("documents");
  const locale = useLocale();
  if (documents.length === 0) {
    return (
      <div className="text-sm text-neutral-600 py-4 text-center">
        {t("noDocuments")}
      </div>
    );
  }

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
  };

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between rounded-md border p-3 hover:bg-neutral-50"
        >
          <div className="flex-1">
            <div className="font-medium text-sm">{doc.title}</div>
            <div className="text-xs text-neutral-500 mt-1">
              {shortDate(doc.uploadedAt, locale)}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleDownload(doc.url, doc.fileName)}
            >
              📥 {t("download")}
            </Button>
            {showDelete && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(doc.id)}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

