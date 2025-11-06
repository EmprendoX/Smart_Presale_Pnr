import { ApiResult, Project, Reservation, Round } from "./types";

const json = (res: Response) => res.json();

export const api = {
  // Proyectos
  listProjects: async (): Promise<ApiResult<Project[]>> =>
    fetch("/api/projects", { cache: "no-store" }).then(json),

  getProject: async (idOrSlug: string): Promise<ApiResult<{ project: Project; round: Round | null }>> =>
    fetch(`/api/projects/${idOrSlug}`, { cache: "no-store" }).then(json),

  publishProject: async (id: string): Promise<ApiResult<Project>> =>
    fetch(`/api/projects/${id}`, { 
      method: "PATCH", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }) 
    }).then(json),

  // Rondas
  createRound: async (input: Partial<Round>): Promise<ApiResult<Round>> =>
    fetch("/api/rounds", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input) 
    }).then(json),

  // Reservas
  createReservation: async (input: {
    roundId: string; userId: string; slots: number; kyc: { fullName: string; country: string; phone: string; idNumber?: string }
  }): Promise<ApiResult<Reservation>> =>
    fetch("/api/reservations", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input) 
    }).then(json),

  listMyReservations: async (userId: string): Promise<ApiResult<Reservation[]>> =>
    fetch(`/api/reservations?userId=${encodeURIComponent(userId)}`, { cache: "no-store" }).then(json),

  refundReservation: async (id: string): Promise<ApiResult<Reservation>> =>
    fetch(`/api/reservations/${id}/refund`, { 
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }).then(json),

  // Pago simulado
  checkout: async (reservationId: string): Promise<ApiResult<{ txId: string }>> =>
    fetch("/api/checkout", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId }) 
    }).then(json),

  // Cierre de ronda (simulado)
  closeRound: async (roundId: string): Promise<ApiResult<{ status: string }>> =>
    fetch("/api/close-round", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId }) 
    }).then(json)
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

