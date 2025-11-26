"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { ImageUploader } from "@/components/ImageUploader";
import { SpecsEditor } from "@/components/SpecsEditor";
import { ZoneEditor } from "@/components/ZoneEditor";
import { AttributesList } from "@/components/AttributesList";
import { Project, Currency, ListingType, ProjectStatus, AvailabilityStatus } from "@/lib/types";

interface ProjectFormProps {
  project?: Project | null;
  developers?: Array<{ id: string; company: string }>;
  agents?: Array<{ id: string; name: string }>;
  onSubmit: (data: Partial<Project>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const getInitialFormData = (project?: Project | null): Partial<Project> => ({
  name: project?.name || "",
  city: project?.city || "",
  country: project?.country || "",
  currency: project?.currency || "USD",
  // Publicado por defecto para que aparezca en los listados sin pasos extra
  status: project?.status || "published",
  listingType: "presale",
  description: project?.description || "",
  images: project?.images || [],
  videoUrl: project?.videoUrl || "",
  developerId: project?.developerId || "",
  stage: project?.stage || "",
  availabilityStatus: project?.availabilityStatus,
  ticker: project?.ticker || "",
  totalUnits: project?.totalUnits,
  attributes: project?.attributes || [],
  specs: project?.specs || {},
  zone: project?.zone || {},
  propertyType: project?.propertyType || "",
  propertyPrice: project?.propertyPrice,
  developmentStage: project?.developmentStage || "",
  askingPrice: project?.askingPrice,
  propertyDetails: project?.propertyDetails || {},
  tags: project?.tags || [],
  featured: project?.featured || false,
  automationReady: project?.automationReady || false,
  agentIds: project?.agentIds || [],
});

export function ProjectForm({
  project,
  developers = [],
  agents = [],
  onSubmit,
  onCancel,
  isSubmitting = false
}: ProjectFormProps) {
  const t = useTranslations("admin");
  const projectIdRef = useRef<string | undefined>(project?.id);
  
  const [formData, setFormData] = useState<Partial<Project>>(() => getInitialFormData(project));

  // Solo sincronizar cuando el proyecto inicial cambia (no en cada render)
  useEffect(() => {
    // Si es un nuevo proyecto (sin ID) y ya tenemos datos, no sobrescribir
    if (!project && projectIdRef.current === undefined) {
      return;
    }
    
    // Si el proyecto cambió (ID diferente), actualizar el estado
    if (project?.id !== projectIdRef.current) {
      projectIdRef.current = project?.id;
      setFormData(getInitialFormData(project));
    }
  }, [project?.id]); // Solo depender del ID del proyecto, no del objeto completo

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.name?.trim() || !formData.city?.trim() || !formData.country?.trim()) {
      const missingFields = [];
      if (!formData.name?.trim()) missingFields.push("Nombre");
      if (!formData.city?.trim()) missingFields.push("Ciudad");
      if (!formData.country?.trim()) missingFields.push("País");
      
      alert(`Por favor completa los siguientes campos requeridos: ${missingFields.join(", ")}`);
      return;
    }

    // Preparar datos para enviar, asegurando listingType siempre sea "presale"
    // Preservar arrays vacíos y objetos vacíos que son válidos (como images: [], specs: {}, etc.)
    const cleanedData: Partial<Project> = { 
      listingType: "presale",
      ...formData 
    };
    
    // Limpiar solo strings vacíos, pero preservar arrays y objetos que son parte del schema
    for (const key in cleanedData) {
      const value = cleanedData[key as keyof Project];
      if (key === 'listingType') continue;
      
      // Solo eliminar strings completamente vacíos
      if (typeof value === 'string' && value.trim() === '') {
        cleanedData[key as keyof Project] = undefined;
      }
      // Preservar arrays (incluso vacíos) y objetos que son parte del schema
      // No eliminar arrays vacíos ni objetos vacíos ya que son válidos en el schema
    }

    try {
      await onSubmit(cleanedData);
    } catch (error: any) {
      console.error("Error submitting form:", error);
      alert(error.message || "Error al guardar el proyecto");
    }
  };

  const tabBasic = (
    <div className="space-y-4">
      <Input
        label="Nombre del proyecto *"
        value={formData.name || ""}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        required
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="Ciudad *"
          value={formData.city || ""}
          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
          required
        />
        <Input
          label="País *"
          value={formData.country || ""}
          onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
          required
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label="Moneda *"
          value={formData.currency || "USD"}
          onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as Currency }))}
          required
        >
          <option value="USD">USD</option>
          <option value="MXN">MXN</option>
        </Select>
        <Input
          label="Tipo de listado"
          value="Preventa"
          readOnly
          disabled
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label="Estado *"
          value={formData.status || "draft"}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ProjectStatus }))}
          required
        >
          <option value="draft">Borrador</option>
          <option value="review">En revisión</option>
          <option value="published">Publicado</option>
        </Select>
        <Input
          label="Etapa"
          value={formData.stage || ""}
          onChange={(e) => setFormData(prev => ({ ...prev, stage: e.target.value }))}
          placeholder="Ej: Preventa, Pre-lanzamiento"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[color:var(--text-strong)] mb-1">
          Descripción *
        </label>
        <textarea
          className="w-full rounded-md border border-[color:var(--line)] px-3 py-2 text-sm shadow-sm bg-[color:var(--bg-surface)] text-[color:var(--text-strong)] placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--focus-ring)] focus:ring-1 focus:ring-[color:var(--focus-ring)] min-h-[120px]"
          value={formData.description || ""}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />
      </div>
      {developers.length > 0 && (
        <Select
          label="Desarrollador"
          value={formData.developerId || ""}
          onChange={(e) => setFormData(prev => ({ ...prev, developerId: e.target.value }))}
        >
          <option value="">Seleccionar desarrollador...</option>
          {developers.map((dev) => (
            <option key={dev.id} value={dev.id}>
              {dev.company}
            </option>
          ))}
        </Select>
      )}
    </div>
  );

  const tabMedia = (
    <div className="space-y-6">
      <ImageUploader
        images={formData.images || []}
        onChange={(images) => {
          setFormData(prev => ({ ...prev, images }));
        }}
      />
      <Input
        label="URL de video (YouTube, Vimeo, etc.)"
        type="url"
        value={formData.videoUrl || ""}
        onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
        placeholder="https://www.youtube.com/watch?v=..."
      />
    </div>
  );

  const tabProperty = (
    <div className="space-y-4">
      <Input
        label="Tipo de propiedad"
        value={formData.propertyType || ""}
        onChange={(e) => setFormData(prev => ({ ...prev, propertyType: e.target.value }))}
        placeholder="Ej: Departamentos de lujo, Casas, Lotes"
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="Precio por propiedad"
          type="number"
          value={formData.propertyPrice || ""}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            propertyPrice: e.target.value ? Number(e.target.value) : undefined 
          }))}
          placeholder="Ej: 480000"
        />
        <Input
          label="Precio de venta (asking price)"
          type="number"
          value={formData.askingPrice || ""}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            askingPrice: e.target.value ? Number(e.target.value) : undefined 
          }))}
          placeholder="Ej: 495000"
        />
      </div>
      <Input
        label="Etapa de desarrollo"
        value={formData.developmentStage || ""}
        onChange={(e) => setFormData(prev => ({ ...prev, developmentStage: e.target.value }))}
        placeholder="Ej: Estructura, Fase de planos, Llave en mano"
      />
      <Input
        label="Total de unidades"
        type="number"
        value={formData.totalUnits || ""}
        onChange={(e) => setFormData(prev => ({ 
          ...prev, 
          totalUnits: e.target.value ? Number(e.target.value) : undefined 
        }))}
        placeholder="Ej: 120"
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <Input
          label="Recámaras"
          type="number"
          value={formData.propertyDetails?.bedrooms || ""}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            propertyDetails: {
              ...prev.propertyDetails,
              bedrooms: e.target.value ? Number(e.target.value) : undefined
            }
          }))}
        />
        <Input
          label="Baños completos"
          type="number"
          value={formData.propertyDetails?.bathrooms || ""}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            propertyDetails: {
              ...prev.propertyDetails,
              bathrooms: e.target.value ? Number(e.target.value) : undefined
            }
          }))}
        />
        <Input
          label="Medios baños"
          type="number"
          value={formData.propertyDetails?.halfBathrooms || ""}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            propertyDetails: {
              ...prev.propertyDetails,
              halfBathrooms: e.target.value ? Number(e.target.value) : undefined
            }
          }))}
        />
        <Input
          label="Superficie (m²)"
          type="number"
          value={formData.propertyDetails?.surfaceArea || ""}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            propertyDetails: {
              ...prev.propertyDetails,
              surfaceArea: e.target.value ? Number(e.target.value) : undefined
            }
          }))}
        />
        <Input
          label="Estacionamientos"
          type="number"
          value={formData.propertyDetails?.parkingSpaces || ""}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            propertyDetails: {
              ...prev.propertyDetails,
              parkingSpaces: e.target.value ? Number(e.target.value) : undefined
            }
          }))}
        />
        <Input
          label="Niveles/Pisos"
          type="number"
          value={formData.propertyDetails?.floors || ""}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            propertyDetails: {
              ...prev.propertyDetails,
              floors: e.target.value ? Number(e.target.value) : undefined
            }
          }))}
        />
      </div>
    </div>
  );

  const tabDetails = (
    <div className="space-y-6">
      <AttributesList
        attributes={formData.attributes || []}
        onChange={(attributes) => setFormData(prev => ({ ...prev, attributes }))}
      />
      <SpecsEditor
        specs={formData.specs || {}}
        onChange={(specs) => setFormData(prev => ({ ...prev, specs }))}
      />
      <ZoneEditor
        zone={formData.zone || {}}
        onChange={(zone) => setFormData(prev => ({ ...prev, zone }))}
      />
      <Input
        label="Ticker (opcional)"
        value={formData.ticker || ""}
        onChange={(e) => setFormData(prev => ({ ...prev, ticker: e.target.value }))}
        placeholder="Ej: SPS:ARRCF"
      />
    </div>
  );

  const tabAdvanced = (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="featured"
          checked={formData.featured || false}
          onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
          className="rounded border-gray-300"
        />
        <label htmlFor="featured" className="text-sm font-medium">
          Proyecto destacado
        </label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="automationReady"
          checked={formData.automationReady || false}
          onChange={(e) => setFormData(prev => ({ ...prev, automationReady: e.target.checked }))}
          className="rounded border-gray-300"
        />
        <label htmlFor="automationReady" className="text-sm font-medium">
          Listo para automatizaciones
        </label>
      </div>
      {agents.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[color:var(--text-strong)] mb-2">
            Agentes IA asignados
          </label>
          <div className="space-y-2">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`agent-${agent.id}`}
                  checked={formData.agentIds?.includes(agent.id) || false}
                  onChange={(e) => {
                    setFormData(prev => {
                      const currentIds = prev.agentIds || [];
                      if (e.target.checked) {
                        return { ...prev, agentIds: [...currentIds, agent.id] };
                      } else {
                        return { ...prev, agentIds: currentIds.filter(id => id !== agent.id) };
                      }
                    });
                  }}
                  className="rounded border-gray-300"
                />
                <label htmlFor={`agent-${agent.id}`} className="text-sm">
                  {agent.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs
        tabs={[
          { key: "basic", label: "Información Básica", content: tabBasic },
          { key: "media", label: "Medios", content: tabMedia },
          { key: "property", label: "Propiedad", content: tabProperty },
          { key: "details", label: "Detalles", content: tabDetails },
          { key: "advanced", label: "Avanzado", content: tabAdvanced }
        ]}
      />
      
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : project ? "Actualizar Proyecto" : "Crear Proyecto"}
        </Button>
      </div>
    </form>
  );
}



