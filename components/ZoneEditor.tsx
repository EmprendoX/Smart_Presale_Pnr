"use client";

import { useState } from "react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

interface ZoneEditorProps {
  zone: {
    summary?: string;
    golf?: string[];
    schools?: string[];
    transport?: string[];
    retail?: string[];
  };
  onChange: (zone: {
    summary?: string;
    golf?: string[];
    schools?: string[];
    transport?: string[];
    retail?: string[];
  }) => void;
}

export function ZoneEditor({ zone, onChange }: ZoneEditorProps) {
  const [newItems, setNewItems] = useState<Record<string, string>>({
    golf: "",
    schools: "",
    transport: "",
    retail: ""
  });

  const addItem = (type: "golf" | "schools" | "transport" | "retail") => {
    const value = newItems[type]?.trim();
    if (value) {
      const currentList = zone[type] || [];
      if (!currentList.includes(value)) {
        onChange({
          ...zone,
          [type]: [...currentList, value]
        });
        setNewItems({ ...newItems, [type]: "" });
      }
    }
  };

  const removeItem = (type: "golf" | "schools" | "transport" | "retail", index: number) => {
    const currentList = zone[type] || [];
    onChange({
      ...zone,
      [type]: currentList.filter((_, i) => i !== index)
    });
  };

  const updateSummary = (summary: string) => {
    onChange({ ...zone, summary });
  };

  const renderList = (type: "golf" | "schools" | "transport" | "retail", label: string) => {
    const items = zone[type] || [];
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-neutral-700">{label}</label>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={`Agregar ${label.toLowerCase()}...`}
            value={newItems[type] || ""}
            onChange={(e) => setNewItems({ ...newItems, [type]: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem(type))}
            className="text-sm"
          />
          <Button type="button" onClick={() => addItem(type)} variant="secondary" size="sm" disabled={!newItems[type]?.trim()}>
            +
          </Button>
        </div>
        {items.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-1 rounded-md border bg-neutral-50 px-2 py-1 text-xs"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => removeItem(type, index)}
                  className="text-red-600 hover:text-red-800 font-bold ml-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium">Zona y entorno (opcional)</label>
      
      <div>
        <label className="text-xs font-medium text-neutral-700 block mb-1">Resumen de la zona</label>
        <textarea
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm placeholder:text-neutral-400 focus:border-brand focus:ring-1 focus:ring-brand min-h-[80px]"
          value={zone.summary || ""}
          onChange={(e) => updateSummary(e.target.value)}
          placeholder="Describe la zona, ubicación estratégica, conectividad..."
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {renderList("golf", "Golf")}
        {renderList("schools", "Colegios")}
        {renderList("transport", "Transporte")}
        {renderList("retail", "Comercio")}
      </div>

      <p className="text-xs text-neutral-500">
        Agrega información sobre la zona: campos de golf cercanos, colegios, opciones de transporte y comercio.
      </p>
    </div>
  );
}

