"use client";

import { useTranslations, useLocale } from "next-intl";
import { ResearchItem } from "@/lib/types";
import { shortDate } from "@/lib/format";

export default function StudyList({ items }: { items: ResearchItem[] }) {
  const t = useTranslations("project.research");
  const locale = useLocale();
  return (
    <div className="space-y-3">
      {items.map(i => (
        <a 
          key={i.id} 
          href={i.url || "#"} 
          target="_blank" 
          rel="noreferrer"
          className="block rounded-lg border p-3 hover:bg-neutral-50 transition-colors"
        >
          <div className="text-xs text-neutral-500">
            {i.type.toUpperCase()} • {i.source || "—"} • {i.publishedAt ? shortDate(i.publishedAt, locale) : ""}
          </div>
          <div className="font-medium mt-1">{i.title}</div>
        </a>
      ))}
      {items.length === 0 && <div className="text-sm text-neutral-600">{t("noItems")}</div>}
    </div>
  );
}

