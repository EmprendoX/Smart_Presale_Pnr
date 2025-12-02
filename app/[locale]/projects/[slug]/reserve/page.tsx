"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { fmtCurrency } from "@/lib/format";

type Params = { locale: string; slug: string };

export default function ReservePage({ params }: { params: Params }) {
  const router = useRouter();
  const t = useTranslations("reservation");
  const { user, loading: authLoading } = useAuth();
  const { slug } = params;
  
  const [project, setProject] = useState<any>(null);
  const [round, setRound] = useState<any>(null);
  const [slots, setSlots] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);

  // Cargar proyecto y ronda
  useEffect(() => {
    const loadProject = async () => {
      try {
        const result = await api.getProject(slug);
        if (result.ok && result.data) {
          setProject(result.data.project);
          setRound(result.data.round);
        } else {
          setError(result.error || "No se pudo cargar el proyecto");
        }
      } catch (err: any) {
        setError(err.message || "Error al cargar el proyecto");
      } finally {
        setLoadingProject(false);
      }
    };

    loadProject();
  }, [slug]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/${params.locale}/auth/login?redirect=/${params.locale}/projects/${slug}/reserve`);
    }
  }, [authLoading, params.locale, router, slug, user]);

  const handleReserve = async () => {
    if (!round || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const amount = slots * round.depositAmount;
      
      // Crear reserva (usar datos del usuario o valores por defecto)
      const result = await api.createReservation({
        roundId: round.id,
        slots,
        kyc: {
          fullName: user?.fullName || user?.email?.split("@")[0] || "Usuario Demo",
          country: "MX",
          phone: user?.metadata?.phone || ""
        }
      });

      if (!result.ok) {
        throw new Error(result.error || "Error al crear la reserva");
      }

      // Redirigir a página de pago o dashboard
      router.push(`/${params.locale}/dashboard?reservation=${result.data?.id}`);
    } catch (err: any) {
      setError(err.message || "Error al procesar la reserva");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || loadingProject) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-[color:var(--text-muted)]">{t("loading")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project || !round) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-[color:var(--text-muted)]">{error || t("projectNotFound")}</p>
            <Link href="/projects">
              <Button variant="secondary" className="mt-4">
                {t("backToProjects")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAmount = slots * round.depositAmount;
  const maxSlots = round.slotsPerPerson || 10;

  return (
    <div className="container py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold text-[color:var(--text-strong)]">
            {t("title", { projectName: project.name })}
          </h1>
          <p className="text-sm text-[color:var(--text-muted)] mt-2">
            {t("subtitle")}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Información del proyecto */}
          <div className="rounded-lg border p-4 bg-[color:var(--bg-soft)]">
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-[color:var(--text-muted)]">{t("project")}:</span>{" "}
                <span className="font-medium text-[color:var(--text-strong)]">{project.name}</span>
              </div>
              <div>
                <span className="text-[color:var(--text-muted)]">{t("depositPerSlot")}:</span>{" "}
                <span className="font-medium text-[color:var(--text-strong)]">
                  {fmtCurrency(round.depositAmount, project.currency, "es")}
                </span>
              </div>
              <div>
                <span className="text-[color:var(--text-muted)]">{t("deadline")}:</span>{" "}
                <span className="font-medium text-[color:var(--text-strong)]">
                  {new Date(round.deadlineAt).toLocaleDateString("es-MX")}
                </span>
              </div>
            </div>
          </div>

          {/* Selección de slots */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[color:var(--text-strong)] mb-2">
                {t("selectSlots")}
              </label>
              <Input
                type="number"
                min={1}
                max={maxSlots}
                value={slots}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setSlots(Math.min(Math.max(value, 1), maxSlots));
                }}
                className="w-full"
              />
              <p className="text-xs text-[color:var(--text-muted)] mt-1">
                {t("maxSlots", { max: maxSlots })}
              </p>
            </div>

            {/* Resumen */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between text-lg font-semibold text-[color:var(--text-strong)]">
                <span>{t("total")}:</span>
                <span>{fmtCurrency(totalAmount, project.currency, "es")}</span>
              </div>
              <p className="text-xs text-[color:var(--text-muted)] mt-2">
                {t("totalDescription", { slots, amount: fmtCurrency(round.depositAmount, project.currency, "es") })}
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Link href={`/projects/${slug}`}>
              <Button variant="secondary">{t("cancel")}</Button>
            </Link>
            <Button
              variant="primary"
              onClick={handleReserve}
              disabled={isLoading || slots < 1}
              className="sm:w-auto w-full"
            >
              {isLoading ? t("processing") : t("confirmReservation")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



