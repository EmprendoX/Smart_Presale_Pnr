"use client";

import { useState } from "react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

interface SpecsEditorProps {
  specs: Record<string, string>;
  onChange: (specs: Record<string, string>) => void;
}

export function SpecsEditor({ specs, onChange }: SpecsEditorProps) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const addSpec = () => {
    if (newKey.trim() && newValue.trim() && !specs[newKey.trim()]) {
      onChange({ ...specs, [newKey.trim()]: newValue.trim() });
      setNewKey("");
      setNewValue("");
    }
  };

  const removeSpec = (key: string) => {
    const updated = { ...specs };
    delete updated[key];
    onChange(updated);
  };

  const updateSpec = (key: string, value: string) => {
    onChange({ ...specs, [key]: value });
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Especificaciones (opcional)</label>
      
      <div className="grid sm:grid-cols-2 gap-2">
        <Input
          type="text"
          placeholder="Ej: Entrega, Régimen, Superficie..."
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
        />
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Ej: Q2 2027, Condominal, 65-180 m²..."
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSpec())}
          />
          <Button type="button" onClick={addSpec} variant="secondary">
            Agregar
          </Button>
        </div>
      </div>

      {Object.keys(specs).length > 0 && (
        <div className="space-y-2">
          {Object.entries(specs).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 rounded-md border p-2">
              <div className="flex-1 grid sm:grid-cols-2 gap-2">
                <Input
                  type="text"
                  value={key}
                  onChange={(e) => {
                    const newSpecs = { ...specs };
                    delete newSpecs[key];
                    newSpecs[e.target.value] = value;
                    onChange(newSpecs);
                  }}
                  className="text-sm"
                />
                <Input
                  type="text"
                  value={value}
                  onChange={(e) => updateSpec(key, e.target.value)}
                  className="text-sm"
                />
              </div>
              <Button
                type="button"
                onClick={() => removeSpec(key)}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-800"
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-neutral-500">
        Agrega especificaciones clave-valor (ej: "Entrega": "Q2 2027", "Régimen": "Condominal").
      </p>
    </div>
  );
}

