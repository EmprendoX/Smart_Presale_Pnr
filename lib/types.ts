export type Role = "buyer" | "developer" | "admin";

export type Currency = "USD" | "MXN";

export type KycStatus = "none" | "basic" | "verified";

export type User = {
  id: string;
  name: string;
  role: Role;
  kycStatus: KycStatus;
};

export type Developer = {
  id: string;
  userId: string;
  company: string;
  verifiedAt?: string | null;
};

export type ProjectStatus = "draft" | "review" | "published";

export type Project = {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  currency: Currency;
  status: ProjectStatus;
  images: string[];
  videoUrl?: string;
  description: string;
  developerId: string;
  createdAt: string;
  // NUEVO: apariencia de producto financiero / inventario / specs / zona
  ticker?: string;                 // p.ej. "SPS:ARRCF"
  totalUnits?: number;             // total de unidades del desarrollo
  attributes?: string[];           // amenidades/atributos (golf, alberca, etc.)
  specs?: Record<string, string>;  // "Superficie", "Entrega", "Régimen", etc.
  zone?: {
    summary?: string;
    golf?: string[];
    schools?: string[];
    transport?: string[];
    retail?: string[];
  };
  // Tipo de propiedad, costo y etapa
  propertyType?: string;           // "Departamentos", "Casas", "Lotes", "Villa", etc.
  propertyPrice?: number;          // costo por unidad/propiedad
  developmentStage?: string;       // "Preventa", "Construcción", "Entrega", etc.
  // Detalles de la propiedad
  propertyDetails?: {
    bedrooms?: number;             // Número de recámaras
    bathrooms?: number;             // Número de baños completos
    halfBathrooms?: number;        // Número de medios baños
    surfaceArea?: number;          // Superficie en m²
    parkingSpaces?: number;        // Número de estacionamientos
    floors?: number;               // Número de niveles/pisos
  };
};

export type GoalType = "reservations" | "amount";

export type RoundRule = "all_or_nothing" | "partial";

export type RoundStatus = "open" | "nearly_full" | "closed" | "not_met" | "fulfilled";

export type Round = {
  id: string;
  projectId: string;
  goalType: GoalType;
  goalValue: number;
  depositAmount: number; // por slot
  slotsPerPerson: number;
  deadlineAt: string;    // ISO
  rule: RoundRule;
  partialThreshold: number; // 0.7 => 70%
  status: RoundStatus;
  createdAt: string;
  // NUEVO: disponibilidad declarada (para UI clara)
  groupSlots?: number | null;      // tamaño del "grupo de preventa" (si aplica)
};

export type ReservationStatus = "pending" | "confirmed" | "refunded" | "assigned" | "waitlisted";

export type Reservation = {
  id: string;
  roundId: string;
  userId: string;
  slots: number;
  amount: number;
  status: ReservationStatus;
  txId?: string;
  createdAt: string;
};

export type TransactionProvider = "simulated" | "stripe" | "escrow";

export type Transaction = {
  id: string;
  reservationId: string;
  provider: TransactionProvider;
  amount: number;
  currency: Currency;
  status: "pending" | "succeeded" | "refunded";
  payoutAt?: string | null;
};

export type DocumentType = "title" | "permit" | "terms";

export type DocumentAccess = "public" | "private";

export type ProjectDocument = {
  id: string;
  projectId: string;
  type?: DocumentType; // Mantener para compatibilidad
  url: string;
  access?: DocumentAccess; // Mantener para compatibilidad
  // Campos simplificados
  title: string; // Nombre/título del documento
  fileName: string; // Nombre original del archivo
  uploadedAt: string; // ISO date
  uploadedBy: string; // userId del desarrollador
};

export type ProgressSummary = {
  totalSlots: number;
  confirmedSlots: number;
  totalAmount: number;
  confirmedAmount: number;
  percent: number; // 0..100
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

// === Mercado / Research (NUEVO) ===
export type PricePoint = { 
  ts: string; 
  price: number; 
  volume?: number;
};

export type ResearchItem = {
  id: string;
  projectId: string;
  type: "study" | "report" | "news" | "data";
  title: string;
  source?: string;
  url?: string;
  publishedAt?: string;
};

export type SecondaryListingStatus = "active" | "sold" | "cancelled";

export type SecondaryListing = {
  id: string;
  projectId: string;
  roundId: string;
  sellerUserId: string;
  slots: number;          // # de slots a la venta
  ask: number;            // precio pedido total (moneda del proyecto)
  currency: Currency;
  status: SecondaryListingStatus;
  createdAt: string;
  filledAt?: string | null;
};

export type Trade = {
  id: string;
  listingId: string;
  buyerUserId: string;
  price: number;          // precio cerrado total
  slots: number;
  createdAt: string;
};

