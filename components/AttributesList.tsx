"use client";

import { useState } from "react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

interface AttributesListProps {
  attributes: string[];
  onChange: (attributes: string[]) => void;
}

export function AttributesList({ attributes, onChange }: AttributesListProps) {
  const [newAttribute, setNewAttribute] = useState("");

  const addAttribute = () => {
    if (newAttribute.trim() && !attributes.includes(newAttribute.trim())) {
      onChange([...attributes, newAttribute.trim()]);
      setNewAttribute("");
    }
  };

  const removeAttribute = (index: number) => {
    onChange(attributes.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Amenidades (opcional)</label>
      
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Ej: Alberca, Gimnasio, Seguridad 24/7..."
          value={newAttribute}
          onChange={(e) => setNewAttribute(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAttribute())}
        />
        <Button type="button" onClick={addAttribute} variant="secondary">
          Agregar
        </Button>
      </div>

      {attributes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attributes.map((attr, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-md border bg-neutral-50 px-3 py-1.5 text-sm"
            >
              <span>{attr}</span>
              <button
                type="button"
                onClick={() => removeAttribute(index)}
                className="text-red-600 hover:text-red-800 font-bold"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-500">
        Agrega las amenidades del proyecto. Presiona Enter o haz clic en &quot;Agregar&quot; para añadir cada una.
      </p>
    </div>
  );
}

