import { Currency, Developer, Project, ProjectDocument, Reservation, Round, Transaction, User, ResearchItem, PricePoint } from "./types";
import { db } from "./config";

// Usuarios y desarrolladores (solo para demo, no se persisten aún)
const users: User[] = [
  { id: "u_buyer_1", name: "Ana Compradora", role: "buyer", kycStatus: "basic" },
  { id: "u_dev_1", name: "Carlos Dev", role: "developer", kycStatus: "verified" },
  { id: "u_admin_1", name: "Pat Admin", role: "admin", kycStatus: "verified" }
];

const developers: Developer[] = [
  { id: "d1", userId: "u_dev_1", company: "BlueRock Dev S.A.", verifiedAt: new Date().toISOString() }
];

const documents: ProjectDocument[] = [
  { id: crypto.randomUUID(), projectId: "p1", type: "title", url: "#", access: "public", title: "Título de propiedad", fileName: "titulo.pdf", uploadedAt: new Date().toISOString(), uploadedBy: "u_admin_1" },
  { id: crypto.randomUUID(), projectId: "p1", type: "permit", url: "#", access: "public", title: "Permiso de construcción", fileName: "permiso.pdf", uploadedAt: new Date().toISOString(), uploadedBy: "u_admin_1" },
  { id: crypto.randomUUID(), projectId: "p1", type: "terms", url: "#", access: "public", title: "Términos y condiciones", fileName: "terminos.pdf", uploadedAt: new Date().toISOString(), uploadedBy: "u_admin_1" }
];

// Inicializar datos por defecto si no existen
const initializeDefaultData = async () => {
  const projects = await db.getProjects();
  if (projects.length === 0) {
    const nowISO = () => new Date().toISOString();
    
    // Proyectos de ejemplo
    const defaultProjects: Project[] = [
      {
        id: "p1",
        slug: "residencial-arrecife",
        name: "Residencial Arrecife",
        city: "Cancún",
        country: "MX",
        currency: "USD",
        status: "published",
        images: [
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1600&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1505691723518-36a9f3a59c07?q=80&w=1600&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop"
        ],
        description: "Torre residencial frente al mar. Entrega estimada 2027.",
        developerId: "d1",
        createdAt: nowISO(),
        ticker: "SPS:ARRCF",
        totalUnits: 120,
        attributes: ["Frente al mar", "Campo de golf a 5 min", "Alberca", "Gimnasio", "Seguridad 24/7"],
        specs: {
          "Entrega": "Q2 2027",
          "Régimen": "Condominal",
          "Superficie": "65–180 m²",
          "Estacionamientos": "1–2"
        },
        zone: {
          summary: "Zona hotelera con alta absorción turística, conectividad y servicios premium.",
          golf: ["Club de Golf Cancún", "Riviera Golf"],
          schools: ["Colegio Internacional Cancún"],
          transport: ["Aeropuerto CUN a 20 min", "Conectividad Blvd. Kukulcán"],
          retail: ["La Isla Shopping Village", "Luxury Avenue"]
        }
      },
      {
        id: "p2",
        slug: "loft-27",
        name: "LOFT 27",
        city: "CDMX",
        country: "MX",
        currency: "MXN",
        status: "published",
        images: [
          "https://images.unsplash.com/photo-1560448075-bb4caa6c9319?q=80&w=1600&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=1600&auto=format&fit=crop"
        ],
        description: "Lofts urbanos en corredor financiero. Entrega 2026.",
        developerId: "d1",
        createdAt: nowISO(),
        ticker: "SPS:LOF27",
        totalUnits: 80,
        attributes: ["Roof Garden", "Cowork", "Gimnasio", "Lobby"],
        specs: {
          "Entrega": "Q4 2026",
          "Régimen": "Condominal",
          "Superficie": "35–60 m²"
        },
        zone: {
          summary: "Corredor financiero con fuerte demanda de renta, servicios y movilidad.",
          golf: [],
          schools: ["Tec de Monterrey Campus Santa Fe (cercano)"],
          transport: ["Metrobus / Metro / Vías primarias"],
          retail: ["Antara", "Miyana", "Plaza Carso"]
        }
      }
    ];

    for (const project of defaultProjects) {
      await db.createProject(project);
    }

    // Rondas de ejemplo
    const defaultRounds: Round[] = [
      {
        id: "r1",
        projectId: "p1",
        goalType: "reservations",
        goalValue: 30,
        depositAmount: 500,
        slotsPerPerson: 3,
        deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20).toISOString(),
        rule: "all_or_nothing",
        partialThreshold: 0.7,
        status: "open",
        createdAt: nowISO(),
        groupSlots: 30
      },
      {
        id: "r2",
        projectId: "p2",
        goalType: "amount",
        goalValue: 1000000,
        depositAmount: 25000,
        slotsPerPerson: 2,
        deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
        rule: "partial",
        partialThreshold: 0.7,
        status: "open",
        createdAt: nowISO(),
        groupSlots: 40
      }
    ];

    for (const round of defaultRounds) {
      await db.createRound(round);
    }

    // Research de ejemplo
    const defaultResearch: ResearchItem[] = [
      {
        id: crypto.randomUUID(),
        projectId: "p1",
        type: "study",
        title: "Estudio de absorción Cancún 2024",
        source: "MarketLab",
        url: "#",
        publishedAt: "2024-11-01"
      },
      {
        id: crypto.randomUUID(),
        projectId: "p1",
        type: "news",
        title: "Nueva vialidad mejora accesos a zona hotelera",
        source: "Periódico Local",
        url: "#",
        publishedAt: "2025-01-15"
      },
      {
        id: crypto.randomUUID(),
        projectId: "p2",
        type: "report",
        title: "Reporte renta corta estancia CDMX Q3",
        source: "CityData",
        url: "#",
        publishedAt: "2024-09-10"
      }
    ];

    for (const item of defaultResearch) {
      await db.createResearchItem(item);
    }

    // Price History de ejemplo
    const defaultPriceHistory: Record<string, PricePoint[]> = {
      p1: [
        { ts: "2025-01-01", price: 480, volume: 5 },
        { ts: "2025-02-01", price: 500, volume: 7 },
        { ts: "2025-03-01", price: 520, volume: 8 },
        { ts: "2025-04-01", price: 515, volume: 4 },
        { ts: "2025-05-01", price: 540, volume: 6 }
      ],
      p2: [
        { ts: "2025-01-01", price: 22000, volume: 3 },
        { ts: "2025-02-01", price: 23000, volume: 4 },
        { ts: "2025-03-01", price: 23500, volume: 5 },
        { ts: "2025-04-01", price: 24000, volume: 5 },
        { ts: "2025-05-01", price: 24500, volume: 6 }
      ]
    };

    for (const [projectId, points] of Object.entries(defaultPriceHistory)) {
      for (const point of points) {
        await db.addPricePoint(projectId, point);
      }
    }
  }
};

// Inicializar al importar
if (typeof window === 'undefined') {
  initializeDefaultData().catch(console.error);
}

// Exportar objetos para compatibilidad con código existente
export const DB = {
  get users() { return users; },
  get developers() { return developers; },
  get documents() { return documents; },
  get projects() { return db.getProjects(); },
  get rounds() { return db.getRounds(); },
  get reservations() { return db.getReservations(); },
  get transactions() { return db.getTransactions(); },
  get research() { return db.getResearch(); },
  get priceHistory() { return db.getPriceHistory(); },
  get listings() { return db.getListings(); },
  get trades() { return db.getTrades(); }
};

// Funciones helper que usan el servicio db (mantienen compatibilidad)
export const findProjectBySlug = async (slug: string) => {
  return db.getProjectBySlug(slug);
};

export const findProjectById = async (id: string) => {
  return db.getProjectById(id);
};

export const findRoundByProject = async (projectId: string) => {
  return db.getRoundByProjectId(projectId);
};

export const listPublishedProjects = async () => {
  const projects = await db.getProjects();
  return projects.filter(p => p.status === "published");
};

export const byRoundReservations = async (roundId: string) => {
  return db.getReservationsByRoundId(roundId);
};

export const byUserReservations = async (userId: string) => {
  return db.getReservationsByUserId(userId);
};
