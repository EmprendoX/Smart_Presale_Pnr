"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

const STORAGE_KEY = "sps_lead_contact";

interface LeadAccessGateProps {
  children: ReactNode;
}

type LeadForm = {
  name: string;
  email: string;
  phone: string;
};

export default function LeadAccessGate({ children }: LeadAccessGateProps) {
  const [ready, setReady] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [form, setForm] = useState<LeadForm>({ name: "", email: "", phone: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LeadForm;
        if (parsed?.name && parsed?.email && parsed?.phone) {
          setHasAccess(true);
        }
      }
    } catch (err) {
      console.warn("[LeadAccessGate] Error leyendo lead local:", err);
    } finally {
      setReady(true);
    }
  }, []);

  const summaryText = useMemo(() => {
    if (!form.name || !form.email || !form.phone) return "";
    return `${form.name} • ${form.email} • ${form.phone}`;
  }, [form]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Por favor llena nombre, correo y teléfono para continuar.");
      return;
    }

    const isEmailValid = /\S+@\S+\.\S+/.test(form.email);
    if (!isEmailValid) {
      setError("Ingresa un correo válido.");
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      setHasAccess(true);
    } catch (err) {
      console.warn("[LeadAccessGate] No se pudo guardar el lead:", err);
      setError("No pudimos guardar tus datos localmente. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="relative">
      <div className={hasAccess ? "" : "blur-sm select-none pointer-events-none"}>
        {children}
      </div>

      {ready && !hasAccess && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/85 backdrop-blur-sm p-4">
          <Card className="w-full max-w-xl shadow-lg border-[color:var(--line)]">
            <CardHeader>
              <h3 className="text-xl font-semibold text-[color:var(--text-strong)]">
                Acceso rápido a las propiedades
              </h3>
              <p className="text-sm text-[color:var(--text-muted)] mt-1">
                Solo necesitamos tu nombre, correo y teléfono. No creamos cuenta ni pedimos contraseña.
              </p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                  label="Nombre completo"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <Input
                  label="Correo electrónico"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
                <Input
                  label="Teléfono"
                  value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--text-muted)]">
                  <span>Los datos se guardan solo en tu navegador.</span>
                  {summaryText && <span className="text-[color:var(--text-strong)]">{summaryText}</span>}
                </div>

                <Button type="submit" variant="primary" className="w-full">
                  Ver propiedades ahora
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
