"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { fmtCurrency, shortDate } from "@/lib/format";
import type { Reservation } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const t = useTranslations("dashboard");
  const { user, loading: authLoading } = useAuth();
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar reservas (usar usuario mock si no hay usuario autenticado)
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        const locale = params?.locale ? `/${params.locale}` : "";
        const redirectPath = `${locale}/dashboard`;
        router.replace(`${locale}/auth/login?redirect=${redirectPath}`);
        return;
      }

      loadReservations();
    }
  }, [authLoading, params, router, user]);

  const loadReservations = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const result = await api.listMyReservations();
      if (result.ok && result.data) {
        setReservations(result.data);
      } else {
        setError(result.error || "Error al cargar reservas");
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar reservas");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
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

  const filteredReservations = filter === "all" 
    ? reservations 
    : reservations.filter(r => r.status === filter);

  const stats = {
    total: reservations.length,
    confirmed: reservations.filter(r => r.status === "confirmed").length,
    pending: reservations.filter(r => r.status === "pending").length,
    totalAmount: reservations
      .filter(r => r.status === "confirmed")
      .reduce((sum, r) => sum + r.amount, 0)
  };

  return (
    <div className="container py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[color:var(--text-strong)]">
          {t("title")}
        </h1>
        <p className="text-sm text-[color:var(--text-muted)] mt-2">
          {t("subtitle")}
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-[color:var(--text-muted)]">{t("stats.totalReservations")}</div>
            <div className="text-2xl font-semibold text-[color:var(--text-strong)] mt-1">
              {stats.total}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-[color:var(--text-muted)]">{t("stats.confirmed")}</div>
            <div className="text-2xl font-semibold text-[color:var(--text-strong)] mt-1">
              {stats.confirmed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-[color:var(--text-muted)]">{t("stats.totalAmount")}</div>
            <div className="text-2xl font-semibold text-[color:var(--text-strong)] mt-1">
              {stats.totalAmount > 0 ? fmtCurrency(stats.totalAmount, "USD", "es") : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === "all" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          {t("all")}
        </Button>
        <Button
          variant={filter === "pending" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setFilter("pending")}
        >
          {t("pending")}
        </Button>
        <Button
          variant={filter === "confirmed" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setFilter("confirmed")}
        >
          {t("confirmed")}
        </Button>
        <Button
          variant={filter === "refunded" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setFilter("refunded")}
        >
          {t("refunded")}
        </Button>
      </div>

      {/* Lista de reservas */}
      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-red-600">{error}</div>
          </CardContent>
        </Card>
      )}

      {filteredReservations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-[color:var(--text-muted)]">
              {filter === "all" ? t("noReservations") : t("noReservationsFiltered", { status: filter })}
            </p>
            <Link href="/projects">
              <Button variant="primary" className="mt-4">
                {t("exploreProjects")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} />
          ))}
        </div>
      )}

      {/* Links de soporte */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2 text-sm">
            <h3 className="font-semibold text-[color:var(--text-strong)]">
              {t("support.title")}
            </h3>
            <p className="text-[color:var(--text-muted)]">
              {t("support.description")}
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Link href="/community">
                <Button variant="secondary" size="sm">
                  {t("support.community")}
                </Button>
              </Link>
              <Link href="/p/how-it-works">
                <Button variant="secondary" size="sm">
                  {t("support.documentation")}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReservationCard({ reservation }: { reservation: Reservation }) {
  const t = useTranslations("dashboard");
  
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    refunded: "bg-red-100 text-red-800",
    assigned: "bg-blue-100 text-blue-800"
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-[color:var(--text-strong)]">
                {t("reservation")} #{reservation.id.slice(0, 8)}
              </h3>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[reservation.status] || "bg-gray-100 text-gray-800"}`}>
                {t(`status.${reservation.status}`)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[color:var(--text-muted)]">{t("reservedSlots")}:</span>{" "}
                <span className="font-medium text-[color:var(--text-strong)]">{reservation.slots}</span>
              </div>
              <div>
                <span className="text-[color:var(--text-muted)]">{t("totalAmount")}:</span>{" "}
                <span className="font-medium text-[color:var(--text-strong)]">
                  {fmtCurrency(reservation.amount, "USD", "es")}
                </span>
              </div>
              <div>
                <span className="text-[color:var(--text-muted)]">{t("date")}:</span>{" "}
                <span className="font-medium text-[color:var(--text-strong)]">
                  {shortDate(reservation.createdAt, "es")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/projects/${reservation.roundId}`}>
              <Button variant="secondary" size="sm">
                {t("viewProject")}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

