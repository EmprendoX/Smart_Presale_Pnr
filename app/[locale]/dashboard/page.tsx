"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { api } from "@/lib/api";
import { Reservation, ReservationStatus } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { fmtCurrency } from "@/lib/format";

type ReservationWithDetails = Reservation & {
  projectName?: string;
  currency?: "USD" | "MXN";
  roundGoal?: string;
};

export default function Dashboard() {
  const t = useTranslations("dashboard");
  const tStatus = useTranslations("status");
  const tMessages = useTranslations("messages");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [userId, setUserId] = useState("");
  const [list, setList] = useState<ReservationWithDetails[]>([]);
  const [filter, setFilter] = useState<ReservationStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const { show } = useToast();

  const load = async (uid: string) => {
    setLoading(true);
    try {
      const res = await api.listMyReservations(uid);
      if (!res.ok) {
        show(res.error, tMessages("error"));
        return;
      }

      const projectsRes = await api.listProjects();
      if (projectsRes.ok) {
        const enriched = res.data.map((r: Reservation) => {
          const projectWithRound = projectsRes.data.find((p: any) => {
            return p.round?.id === r.roundId;
          }) as any;
          const project = projectWithRound || projectsRes.data.find((p: any) => p.id === r.roundId);
          return {
            ...r,
            projectName: project?.name || t("reservation"),
            currency: project?.currency || "USD",
            roundGoal: projectWithRound && projectWithRound.round ? 
              `${projectWithRound.round.goalType === "reservations" ? t("roundGoal") : t("roundGoal")}: ${projectWithRound.round.goalValue}` : 
              undefined
          };
        });
        setList(enriched);
      } else {
        setList(res.data);
      }
    } catch (e: any) {
      show(e.message || tMessages("error"), tMessages("error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem("sps_user");
    if (raw) {
      const u = JSON.parse(raw);
      setUserId(u.id);
      load(u.id);
    }
  }, []);

  const filteredList = useMemo(() => {
    if (filter === "all") return list;
    return list.filter(r => r.status === filter);
  }, [list, filter]);

  const refund = async (id: string) => {
    if (!confirm(t("refundConfirm"))) return;
    
    const res = await api.refundReservation(id);
    if (!res.ok) return show(res.error, tMessages("error"));
    show(t("refundRequested"), tMessages("success"));
    load(userId);
  };

  const getStatusBadge = (status: ReservationStatus) => {
    const map: Record<ReservationStatus, { color: "neutral" | "green" | "yellow" | "red"; text: string }> = {
      pending: { color: "yellow", text: tStatus("pending") },
      confirmed: { color: "green", text: tStatus("confirmed") },
      refunded: { color: "red", text: tStatus("refunded") },
      assigned: { color: "green", text: tStatus("assigned") },
      waitlisted: { color: "neutral", text: tStatus("waitlisted") }
    };
    const config = map[status] || { color: "neutral" as const, text: status };
    return <Badge color={config.color}>{config.text}</Badge>;
  };

  const stats = useMemo(() => {
    const total = list.length;
    const confirmed = list.filter(r => r.status === "confirmed" || r.status === "assigned").length;
    const totalAmount = list
      .filter(r => r.status === "confirmed" || r.status === "assigned")
      .reduce((sum, r) => sum + r.amount, 0);
    return { total, confirmed, totalAmount };
  }, [list]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">{t("title")}</h1>
        <div className="flex items-center gap-3">
          <Select value={filter} onChange={e => setFilter(e.target.value as any)}>
            <option value="all">{t("filters.all")}</option>
            <option value="pending">{t("filters.pending")}</option>
            <option value="confirmed">{t("filters.confirmed")}</option>
            <option value="assigned">{t("filters.assigned")}</option>
            <option value="waitlisted">{t("filters.waitlisted")}</option>
            <option value="refunded">{t("filters.refunded")}</option>
          </Select>
        </div>
      </div>

      {stats.total > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-neutral-600">{t("stats.totalReservations")}</div>
              <div className="text-2xl font-semibold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-neutral-600">{t("stats.confirmed")}</div>
              <div className="text-2xl font-semibold text-green-600">{stats.confirmed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-neutral-600">{t("stats.totalAmount")}</div>
              <div className="text-2xl font-semibold">
                {stats.totalAmount > 0 ? fmtCurrency(stats.totalAmount, list[0]?.currency || "USD", locale) : "$0.00"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-600">{tCommon("loading")}</p>
      ) : filteredList.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-neutral-600">
            {filter === "all" ? t("noReservations") : t("noReservationsFiltered", { status: filter })}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredList.map(r => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-lg">{r.projectName || t("reservation")}</div>
                    <div className="text-xs text-neutral-500 mt-1">{t("reservation")} #{r.id.slice(0, 8)}</div>
                  </div>
                  {getStatusBadge(r.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-neutral-600">{t("reservedSlots")}:</span>{" "}
                      <span className="font-medium">{r.slots}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-neutral-600">{t("totalAmount")}:</span>{" "}
                      <span className="font-medium">{fmtCurrency(r.amount, r.currency || "USD", locale)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-neutral-600">{t("date")}:</span>{" "}
                      <span className="font-medium">
                        {new Date(r.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
                          year: "numeric",
                          month: "long",
                          day: "numeric"
                        })}
                      </span>
                    </div>
                    {r.roundGoal && (
                      <div className="text-xs text-neutral-500">{t("roundGoal")}: {r.roundGoal}</div>
                    )}
                  </div>
                  <div className="flex items-end justify-end">
                    {r.status === "confirmed" && (
                      <Button onClick={() => refund(r.id)} variant="secondary">
                        {t("requestRefund")}
                      </Button>
                    )}
                    {r.status === "pending" && (
                      <p className="text-sm text-neutral-600">{t("waitingPayment")}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

