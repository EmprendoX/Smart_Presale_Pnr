"use client";

import { useTranslations } from "next-intl";

export default function FeatureGrid({ attributes, specs }: { attributes?: string[]; specs?: Record<string, string> }) {
  const t = useTranslations("features");
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="rounded-lg border p-4">
        <div className="font-medium">{t("amenities")}</div>
        <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700 space-y-1">
          {(attributes ?? []).map(a => <li key={a}>{a}</li>)}
        </ul>
      </div>
      <div className="rounded-lg border p-4 md:col-span-2">
        <div className="font-medium">{t("specifications")}</div>
        <div className="mt-2 grid sm:grid-cols-2 gap-3 text-sm">
          {specs && Object.entries(specs).map(([k, v]) => (
            <div key={k} className="rounded-md border p-2">
              <div className="text-xs text-neutral-500">{k}</div>
              <div className="font-medium">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

