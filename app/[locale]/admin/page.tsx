"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { fmtCurrency } from "@/lib/format";
import { ProjectStatus } from "@/lib/types";
import { api } from "@/lib/api";

type ProjectWithRound = {
  id: string;
  name: string;
  slug: string;
  status: ProjectStatus;
  round?: any;
  createdAt: string;
};

export default function Admin() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const tMessages = useTranslations("messages");
  const tStatus = useTranslations("status");
  const locale = useLocale();
  const { show } = useToast();
  const [items, setItems] = useState<ProjectWithRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects").then(r => r.json());
      if (res.ok) setItems(res.data);
      else show(res.error, tMessages("error"));
    } catch (e: any) {
      show(e.message || t("messages.loadError"), tMessages("error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredItems = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter(p => p.status === statusFilter);
  }, [items, statusFilter]);

  const stats = useMemo(() => {
    const total = items.length;
    const draft = items.filter(p => p.status === "draft").length;
    const review = items.filter(p => p.status === "review").length;
    const published = items.filter(p => p.status === "published").length;
    return { total, draft, review, published };
  }, [items]);

  const publish = async (id: string) => {
    if (!confirm(t("publishConfirm"))) return;
    
    setPublishingId(id);
    try {
      const response = await fetch(`/api/projects/${id}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }) 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Error HTTP ${response.status}` }));
        throw new Error(errorData.error || `Error al publicar: ${response.statusText}`);
      }

      const res = await response.json();
      
      if (!res.ok) {
        throw new Error(res.error || "Error desconocido al publicar el proyecto");
      }

      if (!res.data || res.data.status !== "published") {
        throw new Error("El proyecto no se actualizó correctamente");
      }

      show(t("messages.projectPublished"), tMessages("success"));
      await load();
    } catch (error: any) {
      console.error("Error al publicar proyecto:", error);
      show(error.message || t("messages.updateError"), tMessages("error"));
    } finally {
      setPublishingId(null);
    }
  };

  const updateStatus = async (id: string, status: ProjectStatus) => {
    setPublishingId(id);
    try {
      const response = await fetch(`/api/projects/${id}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }) 
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Error HTTP ${response.status}` }));
        throw new Error(errorData.error || `Error al actualizar: ${response.statusText}`);
      }

      const res = await response.json();
      
      if (!res.ok) {
        throw new Error(res.error || "Error desconocido al actualizar el proyecto");
      }

      if (!res.data) {
        throw new Error("No se recibieron datos actualizados del servidor");
      }

      show(t("messages.projectUpdated", { status: tStatus(status) }), tMessages("success"));
      await load();
    } catch (error: any) {
      console.error("Error al actualizar estado:", error);
      show(error.message || t("messages.updateError"), tMessages("error"));
    } finally {
      setPublishingId(null);
    }
  };

  const closeRound = async (roundId?: string | null) => {
    if (!roundId) return;
    if (!confirm(t("closeRoundConfirm"))) return;
    
    const res = await fetch("/api/close-round", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId }) 
    }).then(r => r.json());
    
    if (res.ok) { 
      show(t("roundClosed", { status: res.data.status }), tMessages("success")); 
      load(); 
    } else {
      show(res.error, tMessages("error"));
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
    const map: Record<ProjectStatus, { color: "neutral" | "green" | "yellow" | "red"; text: string }> = {
      draft: { color: "neutral", text: tStatus("draft") },
      review: { color: "yellow", text: tStatus("review") },
      published: { color: "green", text: tStatus("published") }
    };
    const config = map[status];
    return <Badge color={config.color}>{config.text}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">{t("title")}</h1>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="all">{t("filters.all")}</option>
          <option value="draft">{t("filters.draft")}</option>
          <option value="review">{t("filters.review")}</option>
          <option value="published">{t("filters.published")}</option>
        </Select>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-neutral-600">{t("stats.totalProjects")}</div>
            <div className="text-2xl font-semibold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-neutral-600">{t("stats.draft")}</div>
            <div className="text-2xl font-semibold text-neutral-600">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-neutral-600">{t("stats.review")}</div>
            <div className="text-2xl font-semibold text-yellow-600">{stats.review}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-neutral-600">{t("stats.published")}</div>
            <div className="text-2xl font-semibold text-green-600">{stats.published}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-600">{tCommon("loading")}</p>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-neutral-600">
            {statusFilter === "all" ? t("noProjects") : t("noProjectsFiltered", { status: tStatus(statusFilter) })}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((p: any) => {
            const round = p.round;
            const hasReservations = round?.id;
            
            return (
              <Card key={p.id}>
                <CardHeader className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-lg">{p.name}</div>
                      {getStatusBadge(p.status)}
                    </div>
                    <div className="text-sm text-neutral-600 mt-1">
                      {t("created")}: {new Date(p.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "es-MX")}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {p.status !== "published" && (
                      <Button 
                        onClick={() => publish(p.id)} 
                        size="sm"
                        disabled={publishingId === p.id}
                      >
                        {publishingId === p.id ? t("publishing") : t("publish")}
                      </Button>
                    )}
                    {p.status === "review" && (
                      <Button 
                        onClick={() => updateStatus(p.id, "draft")} 
                        variant="secondary" 
                        size="sm"
                        disabled={publishingId === p.id}
                      >
                        {publishingId === p.id ? t("updating") : t("backToDraft")}
                      </Button>
                    )}
                    {p.status === "published" && (
                      <Button 
                        onClick={() => updateStatus(p.id, "review")} 
                        variant="secondary" 
                        size="sm"
                        disabled={publishingId === p.id}
                      >
                        {publishingId === p.id ? t("updating") : t("unpublish")}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {round ? (
                      <>
                        <div className="grid sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-neutral-600">{t("roundGoal")}:</span>{" "}
                            <span className="font-medium">
                              {round.goalType === "reservations" 
                                ? `${round.goalValue} ${t("reservations")}` 
                                : fmtCurrency(round.goalValue, p.currency || "USD", locale)}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-600">{t("depositPerSlot")}:</span>{" "}
                            <span className="font-medium">
                              {fmtCurrency(round.depositAmount, p.currency || "USD", locale)}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-600">{t("deadline")}:</span>{" "}
                            <span className="font-medium">
                              {new Date(round.deadlineAt).toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-600">{t("roundStatus")}:</span>{" "}
                            <Badge color={round.status === "open" ? "green" : round.status === "closed" ? "neutral" : "red"}>
                              {round.status}
                            </Badge>
                          </div>
                          {round.groupSlots && (
                            <div>
                              <span className="text-neutral-600">{t("presaleGroup")}:</span>{" "}
                              <span className="font-medium">{round.groupSlots} {t("slots")}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 pt-2 border-t">
                          <Button 
                            variant="secondary" 
                            onClick={() => closeRound(round.id)}
                            size="sm"
                          >
                            {t("closeRound")}
                          </Button>
                          <a 
                            href={`/api/ics-round?roundId=${round.id}`}
                            className="px-4 py-2 rounded-md border text-sm hover:bg-neutral-50"
                            download
                          >
                            {t("downloadIcs")}
                          </a>
                          <Link 
                            href={`/p/${p.slug}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-sm text-brand hover:underline"
                          >
                            {t("viewProject")}
                          </Link>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-neutral-600">
                        {t("noRound")}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
