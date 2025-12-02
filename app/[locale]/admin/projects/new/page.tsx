"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useToast } from "@/components/ui/Toast";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { api } from "@/lib/api";
import { Project } from "@/lib/types";

export default function NewProjectPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin");
  const { show } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [developers, setDevelopers] = useState<Array<{ id: string; company: string }>>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const meta = await api.getAdminMetadata();
      if (!meta.ok || !meta.data) throw new Error("No se pudo cargar catálogos");

      setDevelopers(meta.data.developers.map(d => ({ id: d.id, company: d.company || d.name || d.id })));
      setAgents(meta.data.agents.map(a => ({ id: a.id, name: a.name || a.id })));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Partial<Project>) => {
    setIsSubmitting(true);
    try {
      const result = await api.createProject(data);
      
      if (result.ok && result.data) {
        show("Proyecto creado exitosamente", "Éxito");
        router.push("/admin", { locale });
      } else {
        throw new Error(result.error || "Error al crear el proyecto");
      }
    } catch (error: any) {
      show(error.message || "Error al crear el proyecto", "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin", { locale });
  };

  if (loading) {
    return (
      <div className="container py-12">
        <div className="text-center text-[color:var(--text-muted)]">
          {t("loading") || "Cargando..."}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[color:var(--text-strong)]">
          {t("newProject")}
        </h1>
        <p className="text-sm text-[color:var(--text-muted)] mt-2">
          Completa la información del proyecto
        </p>
      </div>

      <ProjectForm
        developers={developers}
        agents={agents}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

