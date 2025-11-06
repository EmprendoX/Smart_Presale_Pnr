"use client";

import { useState } from "react";

type Tab = {
  key: string;
  label: string;
  content: React.ReactNode;
};

export function Tabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);

  return (
    <div>
      <div className="flex gap-2 border-b mb-3 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-2 text-sm whitespace-nowrap ${
              active === t.key 
                ? "border-b-2 border-brand text-brand font-medium" 
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{tabs.find(t => t.key === active)?.content}</div>
    </div>
  );
}

