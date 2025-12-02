"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useToast } from "@/components/ui/Toast";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { api } from "@/lib/api";
import { Project } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/Card";

type Params = { locale: string; slug: string };

export default function EditProjectPage({ params }: { params: Params }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin");
  const { show } = useToast();
  const { slug } = params;
  
  const [project, setProject] = useState<Project | null>(null);
  const [developers, setDevelopers] = useState<Array<{ id: string; company: string }>>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [slug]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const projectResult = await api.getProjectById(slug);
      if (!projectResult.ok || !projectResult.data) {
        setError("Proyecto no encontrado");
        setLoading(false);
        return;
      }

      setProject(projectResult.data);

      const meta = await api.getAdminMetadata();
      if (!meta.ok || !meta.data) throw new Error("No se pudo cargar catálogos");

      setDevelopers(meta.data.developers.map(d => ({ id: d.id, company: d.company || d.name || d.id })));
      setAgents(meta.data.agents.map(a => ({ id: a.id, name: a.name || a.id })));
    } catch (err: any) {
      setError(err.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Partial<Project>) => {
    setIsSubmitting(true);
    try {
      if (!project) {
        throw new Error("Proyecto no encontrado");
      }
      const result = await api.updateProject(project.id, data);
      
      if (result.ok && result.data) {
        show("Proyecto actualizado exitosamente", "Éxito");
        router.push("/admin", { locale });
      } else {
        throw new Error(result.error || "Error al actualizar el proyecto");
      }
    } catch (error: any) {
      show(error.message || "Error al actualizar el proyecto", "Error");
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
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-[color:var(--text-muted)]">{t("loading") || "Cargando..."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-red-600">{error || "Proyecto no encontrado"}</p>
            <button
              onClick={() => router.push("/admin", { locale })}
              className="mt-4 text-sm text-[color:var(--brand-primary)] hover:underline"
            >
              Volver al admin
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[color:var(--text-strong)]">
          {t("editProject") || "Editar Proyecto"}
        </h1>
        <p className="text-sm text-[color:var(--text-muted)] mt-2">
          {project.name}
        </p>
      </div>

      <ProjectForm
        project={project}
        developers={developers}
        agents={agents}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

