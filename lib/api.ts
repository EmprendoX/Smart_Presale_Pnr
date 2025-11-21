import {
  ApiResult,
  Project,
  Reservation,
  Round,
  AutomationWorkflow,
  IntelligentAgent,
  Community,
  TransactionProvider
} from "./types";

const json = (res: Response) => res.json();

export const api = {
  // Proyectos
  listProjects: async (): Promise<ApiResult<Project[]>> =>
    fetch("/api/projects", { cache: "no-store", credentials: "include" }).then(json),

  getProject: async (idOrSlug: string): Promise<ApiResult<{ project: Project; round: Round | null }>> =>
    fetch(`/api/projects/${idOrSlug}`, { cache: "no-store", credentials: "include" }).then(json),

  publishProject: async (id: string): Promise<ApiResult<Project>> =>
    fetch(`/api/projects/${id}`, { 
      method: "PATCH", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
      credentials: "include"
    }).then(json),

  // Rondas
  createRound: async (input: Partial<Round>): Promise<ApiResult<Round>> =>
    fetch("/api/rounds", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      credentials: "include"
    }).then(json),

  // Reservas
  createReservation: async (input: {
    roundId: string; slots: number; kyc: { fullName: string; country: string; phone: string }
  }): Promise<ApiResult<Reservation>> =>
    fetch("/api/reservations", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      credentials: "include"
    }).then(json),

  listMyReservations: async (userId: string): Promise<ApiResult<Reservation[]>> =>
    fetch(`/api/reservations?userId=${encodeURIComponent(userId)}`, { cache: "no-store", credentials: "include" }).then(json),

  refundReservation: async (id: string): Promise<ApiResult<Reservation>> =>
    fetch(`/api/reservations/${id}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    }).then(json),

  // Pago simulado
  checkout: async (
    reservationId: string
  ): Promise<
    ApiResult<{
      transactionId: string;
      reservationStatus: Reservation["status"];
      clientSecret?: string | null;
      provider: TransactionProvider;
      nextAction?: string | null;
    }>
  > =>
    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId }),
      credentials: "include"
    }).then(json),

  // Cierre de ronda (simulado)
  closeRound: async (roundId: string): Promise<ApiResult<{ status: string }>> =>
    fetch("/api/close-round", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId }),
      credentials: "include"
    }).then(json),

  // Automations
  listAutomations: async (): Promise<ApiResult<AutomationWorkflow[]>> =>
    fetch("/api/automations", { cache: "no-store", credentials: "include" }).then(json),

  createAutomation: async (payload: Partial<AutomationWorkflow>): Promise<ApiResult<AutomationWorkflow>> =>
    fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include"
    }).then(json),

  updateAutomation: async (id: string, payload: Partial<AutomationWorkflow>): Promise<ApiResult<AutomationWorkflow>> =>
    fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include"
    }).then(json),

  // Agents
  listAgents: async (): Promise<ApiResult<IntelligentAgent[]>> =>
    fetch("/api/agents", { cache: "no-store", credentials: "include" }).then(json),

  createAgent: async (payload: Partial<IntelligentAgent>): Promise<ApiResult<IntelligentAgent>> =>
    fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include"
    }).then(json),

  updateAgent: async (id: string, payload: Partial<IntelligentAgent>): Promise<ApiResult<IntelligentAgent>> =>
    fetch(`/api/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include"
    }).then(json),

  // Communities
  listCommunities: async (): Promise<ApiResult<Community[]>> =>
    fetch("/api/communities", { cache: "no-store", credentials: "include" }).then(json),

  getCommunity: async (slug: string): Promise<ApiResult<Community>> =>
    fetch(`/api/communities/${slug}`, { cache: "no-store", credentials: "include" }).then(json)
};

/**
 * 🔌 Para conectar Supabase:
 * - Reemplaza fetch(...) por llamadas a servicios en /lib/services/supabase.ts
 *   (insert/select/update) y retorna ApiResult<T>.
 * 🔌 Para Stripe Connect:
 * - api.checkout -> /api/checkout hará PaymentIntent + Destination Charge.
 * 🔌 Para Escrow.com:
 * - api.checkout -> POST a proveedor, guarda tx en DB y marca "pending".
 */

