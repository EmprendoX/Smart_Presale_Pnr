"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

type Props = {
  projectSlug: string;
  projectName: string;
};

type StoredRequest = {
  fullName: string;
  phone: string;
  email: string;
  projectSlug: string;
  projectName: string;
  submittedAt: string;
};

const STORAGE_KEY = "spx-reservation-requests";

export function ProjectReservationForm({ projectSlug, projectName }: Props) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed: StoredRequest[] = JSON.parse(stored);
      const lastRequest = parsed.find(req => req.projectSlug === projectSlug);
      if (lastRequest) {
        setFullName(lastRequest.fullName);
        setPhone(lastRequest.phone);
        setEmail(lastRequest.email);
        setSubmitted(true);
      }
    } catch (e) {
      console.error("Failed to parse reservation requests", e);
    }
  }, [projectSlug]);

  const isValid = useMemo(() => {
    return Boolean(fullName.trim() && phone.trim() && email.trim());
  }, [email, fullName, phone]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isValid) {
      setError("Por favor completa todos los campos para reservar.");
      return;
    }

    const newRequest: StoredRequest = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      projectSlug,
      projectName,
      submittedAt: new Date().toISOString()
    };

    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        const requests: StoredRequest[] = stored ? JSON.parse(stored) : [];
        const filtered = requests.filter(req => req.projectSlug !== projectSlug);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...filtered, newRequest]));
      } catch (e) {
        console.warn("No se pudo guardar la reserva en el navegador", e);
      }
    }

    setSubmitted(true);
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Nombre completo"
          value={fullName}
          onChange={event => setFullName(event.target.value)}
          placeholder="Ana Gómez"
          autoComplete="name"
          required
        />
        <Input
          label="Teléfono"
          value={phone}
          onChange={event => setPhone(event.target.value)}
          placeholder="+52 55 1234 5678"
          autoComplete="tel"
          required
        />
        <Input
          label="Correo electrónico"
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="ana@example.com"
          type="email"
          autoComplete="email"
          className="sm:col-span-2"
          required
        />
        <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-neutral-700">Comparte tus datos y el equipo comercial te contactará para continuar el proceso.</p>
          <Button type="submit" disabled={!isValid || submitted}>
            {submitted ? "Reserva enviada" : "Reservar"}
          </Button>
        </div>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {submitted && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ¡Listo! Guardamos tu interés por {projectName}. Un asesor te contactará pronto.
        </div>
      )}
    </div>
  );
}

