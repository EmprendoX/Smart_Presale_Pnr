import type { DatabaseService } from './db';
import fs from 'fs';

import type {
  User,
  Developer,
  Project,
  Round,
  Reservation,
  Transaction,
  PaymentWebhook,
  ResearchItem,
  PricePoint,
  SecondaryListing,
  Trade,
  ProjectDocument,
  Community,
  AutomationWorkflow,
  IntelligentAgent,
  Tenant,
  TenantSettings,
  Client
} from '../types';

const STORAGE_KEY = 'sps_data';
const DEFAULT_TENANT_ID = 'tenant_default';
const STORAGE_FILE = process.cwd() + '/.sps-mock-data.json';

// Función helper para generar UUIDs de forma segura
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para entornos sin crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

type MemoryStore = {
  users: Map<string, User>;
  developers: Map<string, Developer>;
  projects: Map<string, Project>;
  rounds: Map<string, Round>;
  reservations: Map<string, Reservation>;
  transactions: Map<string, Transaction>;
  paymentWebhooks: Map<string, PaymentWebhook>;
  research: Map<string, ResearchItem>;
  priceHistory: Map<string, PricePoint[]>;
  listings: Map<string, SecondaryListing>;
  trades: Map<string, Trade>;
  documents: Map<string, ProjectDocument>;
  communities: Map<string, Community>;
  automations: Map<string, AutomationWorkflow>;
  agents: Map<string, IntelligentAgent>;
  tenants: Map<string, Tenant>;
  tenantSettings: Map<string, TenantSettings>;
  clients: Map<string, Client>;
};

// Estado en memoria (compartido entre todas las instancias y recargas calientes)
const globalStore = globalThis as typeof globalThis & {
  __SPS_MEMORY_STORE__?: MemoryStore;
  __SPS_MEMORY_INITIALIZED__?: boolean;
};

let memoryStore: MemoryStore = globalStore.__SPS_MEMORY_STORE__ || {
  users: new Map(),
  developers: new Map(),
  projects: new Map(),
  rounds: new Map(),
  reservations: new Map(),
  transactions: new Map(),
  paymentWebhooks: new Map(),
  research: new Map(),
  priceHistory: new Map(),
  listings: new Map(),
  trades: new Map(),
  documents: new Map(),
  communities: new Map(),
  automations: new Map(),
  agents: new Map(),
  tenants: new Map(),
  tenantSettings: new Map(),
  clients: new Map()
};

// Persistir la referencia en el ámbito global para evitar reinicios del estado entre rutas/API
globalStore.__SPS_MEMORY_STORE__ = memoryStore;

// Función para guardar en localStorage (solo en cliente)
function saveToStorage() {
  const data = {
    users: Array.from(memoryStore.users.values()),
    developers: Array.from(memoryStore.developers.values()),
    projects: Array.from(memoryStore.projects.values()),
    rounds: Array.from(memoryStore.rounds.values()),
    reservations: Array.from(memoryStore.reservations.values()),
    transactions: Array.from(memoryStore.transactions.values()),
    paymentWebhooks: Array.from(memoryStore.paymentWebhooks.values()),
    research: Array.from(memoryStore.research.values()),
    priceHistory: Object.fromEntries(memoryStore.priceHistory),
    listings: Array.from(memoryStore.listings.values()),
    trades: Array.from(memoryStore.trades.values()),
    documents: Array.from(memoryStore.documents.values()),
    communities: Array.from(memoryStore.communities.values()),
    automations: Array.from(memoryStore.automations.values()),
    agents: Array.from(memoryStore.agents.values()),
    tenants: Array.from(memoryStore.tenants.values()),
    tenantSettings: Array.from(memoryStore.tenantSettings.values()),
    clients: Array.from(memoryStore.clients.values())
  };

  if (typeof window === 'undefined') {
    try {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.warn('[MockDbService] Failed to save to disk:', error);
    }
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[MockDbService] Failed to save to localStorage:', error);
  }
}

// Función para cargar desde localStorage (solo en cliente)
function loadFromStorage() {
  if (typeof window === 'undefined') return false;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    
    const data = JSON.parse(stored);
    
    // Restaurar todos los datos
    memoryStore.users = new Map(data.users?.map((u: User) => [u.id, u]) || []);
    memoryStore.developers = new Map(data.developers?.map((d: Developer) => [d.id, d]) || []);
    memoryStore.projects = new Map(data.projects?.map((p: Project) => [p.id, p]) || []);
    memoryStore.rounds = new Map(data.rounds?.map((r: Round) => [r.id, r]) || []);
    memoryStore.reservations = new Map(data.reservations?.map((r: Reservation) => [r.id, r]) || []);
    memoryStore.transactions = new Map(data.transactions?.map((t: Transaction) => [t.id, t]) || []);
    memoryStore.paymentWebhooks = new Map(data.paymentWebhooks?.map((w: PaymentWebhook) => [w.id, w]) || []);
    memoryStore.research = new Map(data.research?.map((r: ResearchItem) => [r.id, r]) || []);
    memoryStore.priceHistory = new Map(Object.entries(data.priceHistory || {}));
    memoryStore.listings = new Map(data.listings?.map((l: SecondaryListing) => [l.id, l]) || []);
    memoryStore.trades = new Map(data.trades?.map((t: Trade) => [t.id, t]) || []);
    memoryStore.documents = new Map(data.documents?.map((d: ProjectDocument) => [d.id, d]) || []);
    memoryStore.communities = new Map(data.communities?.map((c: Community) => [c.id, c]) || []);
    memoryStore.automations = new Map(data.automations?.map((a: AutomationWorkflow) => [a.id, a]) || []);
    memoryStore.agents = new Map(data.agents?.map((a: IntelligentAgent) => [a.id, a]) || []);
    memoryStore.tenants = new Map(data.tenants?.map((t: Tenant) => [t.id, t]) || []);
    memoryStore.tenantSettings = new Map(data.tenantSettings?.map((s: TenantSettings) => [s.tenantId, s]) || []);
    memoryStore.clients = new Map(data.clients?.map((c: Client) => [c.id, c]) || []);
    
    return true;
  } catch (error) {
    console.warn('[MockDbService] Failed to load from localStorage:', error);
    return false;
  }
}

// Función para cargar desde archivo (solo en servidor)
function loadFromDisk() {
  if (typeof window !== 'undefined') return false;

  try {
    if (!fs.existsSync(STORAGE_FILE)) return false;
    const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
    const data = JSON.parse(raw);

    memoryStore.users = new Map(data.users?.map((u: User) => [u.id, u]) || []);
    memoryStore.developers = new Map(data.developers?.map((d: Developer) => [d.id, d]) || []);
    memoryStore.projects = new Map(data.projects?.map((p: Project) => [p.id, p]) || []);
    memoryStore.rounds = new Map(data.rounds?.map((r: Round) => [r.id, r]) || []);
    memoryStore.reservations = new Map(data.reservations?.map((r: Reservation) => [r.id, r]) || []);
    memoryStore.transactions = new Map(data.transactions?.map((t: Transaction) => [t.id, t]) || []);
    memoryStore.paymentWebhooks = new Map(data.paymentWebhooks?.map((w: PaymentWebhook) => [w.id, w]) || []);
    memoryStore.research = new Map(data.research?.map((r: ResearchItem) => [r.id, r]) || []);
    memoryStore.priceHistory = new Map(Object.entries(data.priceHistory || {}));
    memoryStore.listings = new Map(data.listings?.map((l: SecondaryListing) => [l.id, l]) || []);
    memoryStore.trades = new Map(data.trades?.map((t: Trade) => [t.id, t]) || []);
    memoryStore.documents = new Map(data.documents?.map((d: ProjectDocument) => [d.id, d]) || []);
    memoryStore.communities = new Map(data.communities?.map((c: Community) => [c.id, c]) || []);
    memoryStore.automations = new Map(data.automations?.map((a: AutomationWorkflow) => [a.id, a]) || []);
    memoryStore.agents = new Map(data.agents?.map((a: IntelligentAgent) => [a.id, a]) || []);
    memoryStore.tenants = new Map(data.tenants?.map((t: Tenant) => [t.id, t]) || []);
    memoryStore.tenantSettings = new Map(data.tenantSettings?.map((s: TenantSettings) => [s.tenantId, s]) || []);
    memoryStore.clients = new Map(data.clients?.map((c: Client) => [c.id, c]) || []);

    return true;
  } catch (error) {
    console.warn('[MockDbService] Failed to load from disk:', error);
    return false;
  }
}

// Inicializar datos por defecto
function initializeDefaultData() {
  const nowISO = () => new Date().toISOString();
  
  // Usuarios demo
  if (memoryStore.users.size === 0) {
    const defaultUsers: User[] = [
      { id: "u_investor_1", name: "Ana Inversionista", role: "investor", kycStatus: "complete", tenantId: DEFAULT_TENANT_ID, email: "ana@example.com" },
      { id: "u_admin_1", name: "Administrador", role: "admin", kycStatus: "complete", tenantId: DEFAULT_TENANT_ID, email: "admin@example.com" }
    ];
    defaultUsers.forEach(u => memoryStore.users.set(u.id, u));
  }
  
  // Desarrolladores - Solo admin puede crear propiedades
  if (memoryStore.developers.size === 0) {
    const defaultDevelopers: Developer[] = [
      { id: "d1", userId: "u_admin_1", company: "Smart Presale Admin", verifiedAt: nowISO(), tenantId: DEFAULT_TENANT_ID }
    ];
    defaultDevelopers.forEach(d => memoryStore.developers.set(d.id, d));
  }
  
  // Proyectos
  if (memoryStore.projects.size === 0) {
    const defaultProjects: Project[] = [
      {
        id: "p1",
        slug: "residencial-arrecife",
        name: "Residencial Arrecife",
        city: "Cancún",
        country: "MX",
        currency: "USD",
        status: "published",
        listingType: "presale",
        stage: "Preventa",
        availabilityStatus: "available",
        images: [
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1600&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1505691723518-36a9f3a59c07?q=80&w=1600&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1600&auto=format&fit=crop"
        ],
        description: "Torre residencial frente al mar. Entrega estimada 2027.",
        developerId: "d1",
        tenantId: DEFAULT_TENANT_ID,
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
        },
        propertyType: "Departamentos de lujo",
        propertyPrice: 480000,
        developmentStage: "Estructura",
        askingPrice: 495000,
        propertyDetails: {
          bedrooms: 3,
          bathrooms: 2,
          halfBathrooms: 1,
          surfaceArea: 145,
          parkingSpaces: 2
        },
        tags: ["playa", "vacacional", "lujo"],
        featured: true,
        automationReady: true,
        agentIds: ["agent-concierge", "agent-analyst"]
      },
      {
        id: "p2",
        slug: "loft-27",
        name: "LOFT 27",
        city: "CDMX",
        country: "MX",
        currency: "MXN",
        status: "published",
        listingType: "presale",
        stage: "Pre-lanzamiento",
        availabilityStatus: "available",
        images: [
          "https://images.unsplash.com/photo-1560448075-bb4caa6c9319?q=80&w=1600&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=1600&auto=format&fit=crop"
        ],
        description: "Lofts urbanos en corredor financiero. Entrega 2026.",
        developerId: "d1",
        tenantId: DEFAULT_TENANT_ID,
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
        },
        propertyType: "Lofts urbanos",
        propertyPrice: 2700000,
        developmentStage: "Fase de planos",
        askingPrice: 2850000,
        propertyDetails: {
          bedrooms: 1,
          bathrooms: 1,
          surfaceArea: 48,
          parkingSpaces: 1
        },
        tags: ["ciudad", "inversión", "renta"],
        featured: true,
        automationReady: true,
        agentIds: ["agent-analyst"]
      }
    ];
    defaultProjects.forEach(p => memoryStore.projects.set(p.id, p));
  }
  
  // Rondas
  if (memoryStore.rounds.size === 0) {
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
    defaultRounds.forEach(r => memoryStore.rounds.set(r.id, r));
  }
  
  // Research
  if (memoryStore.research.size === 0) {
    const defaultResearch: ResearchItem[] = [
      {
        id: generateUUID(),
        projectId: "p1",
        type: "study",
        title: "Estudio de absorción Cancún 2024",
        source: "MarketLab",
        url: "#",
        publishedAt: "2024-11-01"
      },
      {
        id: generateUUID(),
        projectId: "p1",
        type: "news",
        title: "Nueva vialidad mejora accesos a zona hotelera",
        source: "Periódico Local",
        url: "#",
        publishedAt: "2025-01-15"
      },
      {
        id: generateUUID(),
        projectId: "p2",
        type: "report",
        title: "Reporte renta corta estancia CDMX Q3",
        source: "CityData",
        url: "#",
        publishedAt: "2024-09-10"
      }
    ];
    defaultResearch.forEach(r => memoryStore.research.set(r.id, r));
  }
  
  // Price History
  if (memoryStore.priceHistory.size === 0) {
    memoryStore.priceHistory.set("p1", [
      { ts: "2025-01-01", price: 480, volume: 5 },
      { ts: "2025-02-01", price: 500, volume: 7 },
      { ts: "2025-03-01", price: 520, volume: 8 },
      { ts: "2025-04-01", price: 515, volume: 4 },
      { ts: "2025-05-01", price: 540, volume: 6 }
    ]);
    memoryStore.priceHistory.set("p2", [
      { ts: "2025-01-01", price: 22000, volume: 3 },
      { ts: "2025-02-01", price: 23000, volume: 4 },
      { ts: "2025-03-01", price: 23500, volume: 5 },
      { ts: "2025-04-01", price: 24000, volume: 5 },
      { ts: "2025-05-01", price: 24500, volume: 6 }
    ]);
  }
  
  // Agentes
  if (memoryStore.agents.size === 0) {
    const defaultAgents: IntelligentAgent[] = [
      {
        id: "agent-concierge",
        name: "Luna Concierge IA",
        persona: "concierge",
        status: "ready",
        playbook: "Atiende leads interesados en experiencias frente al mar y coordina visitas virtuales.",
        handoffEmail: "concierge@smartpresale.ai",
        languages: ["es", "en"],
        projectIds: ["p1", "p3"],
        createdAt: nowISO(),
        updatedAt: nowISO()
      },
      {
        id: "agent-analyst",
        name: "Atlas Analyst",
        persona: "operations",
        status: "ready",
        playbook: "Provee análisis financiero, seguimiento de KPIs y alertas sobre progreso de rondas.",
        handoffEmail: "ops@smartpresale.ai",
        languages: ["es"],
        projectIds: ["p1", "p2"],
        createdAt: nowISO(),
        updatedAt: nowISO()
      },
      {
        id: "agent-broker",
        name: "Rhea Broker",
        persona: "sales",
        status: "training",
        playbook: "Nutre leads de inventario listo para entrega y coordina negociaciones.",
        handoffEmail: "broker@smartpresale.ai",
        languages: ["es", "en"],
        projectIds: ["p3"],
        createdAt: nowISO(),
        updatedAt: nowISO()
      }
    ];
    defaultAgents.forEach(a => memoryStore.agents.set(a.id, a));
  }
  
  // Automatizaciones
  if (memoryStore.automations.size === 0) {
    const defaultAutomations: AutomationWorkflow[] = [
      {
        id: "auto-presale-progress",
        name: "Alerta progreso 75%",
        description: "Notifica al equipo cuando una preventa supera el 75% y activa comunicación de cierre.",
        status: "active",
        trigger: "milestone",
        channel: "slack",
        projectId: "p1",
        agentId: "agent-analyst",
        createdAt: nowISO(),
        updatedAt: nowISO(),
        metadata: { threshold: 0.75, channel: "#ventas-presale" }
      },
      {
        id: "auto-lead-nurture",
        name: "Secuencia nurturización LOFT 27",
        description: "Secuencia automática de 3 correos + WhatsApp para leads de preventa urbana.",
        status: "paused",
        trigger: "new_lead",
        channel: "email",
        projectId: "p2",
        agentId: "agent-analyst",
        createdAt: nowISO(),
        updatedAt: nowISO(),
        metadata: { cadence: "3-7-14", crmTag: "lead_frio" }
      },
      {
        id: "auto-tour-villa",
        name: "Coordinación de tours Villa Aurora",
        description: "Agenda automáticamente recorridos presenciales y envía dossier digital.",
        status: "active",
        trigger: "new_reservation",
        channel: "whatsapp",
        projectId: "p3",
        agentId: "agent-concierge",
        createdAt: nowISO(),
        updatedAt: nowISO(),
        metadata: { template: "tour_villa", handoff: "concierge@smartpresale.ai" }
      }
    ];
    defaultAutomations.forEach(a => memoryStore.automations.set(a.id, a));
  }
  
  // Comunidades
  if (memoryStore.communities.size === 0) {
    const defaultCommunities: Community[] = [
      {
        id: "comm-global",
        slug: "comunidad-smart-presale",
        name: "Comunidad Global Smart Presale",
        description: "Espacio para inversionistas y desarrolladores con acceso a masterclasses, lanzamientos y playbooks.",
        scope: "global",
        tenantId: DEFAULT_TENANT_ID,
        coverImage: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1600&auto=format&fit=crop",
        tags: ["networking", "educación", "automatización"],
        memberCount: 428,
        featuredPosts: [{
          id: "post-masterclass",
          title: "Cómo lanzar campañas omnicanal en 14 días",
          excerpt: "Checklist accionable para automatizar nurturing desde la primera reserva.",
          author: "Equipo Smart Presale",
          publishedAt: nowISO()
        }],
        moderators: ["Pat Admin", "Luna Concierge IA"],
        threads: [{
          id: "thread-intro",
          title: "Presentaciones y objetivos de inversión",
          author: "Pat Admin",
          replies: 42,
          lastActivityAt: nowISO(),
          status: "approved",
          tags: ["onboarding", "recursos"]
        }],
        badges: [{
          id: "badge-closer",
          label: "Closer",
          description: "3 reservas confirmadas en los últimos 90 días",
          criteria: "closed_won>=3"
        }],
        notificationChannels: [{
          channel: "push",
          enabled: true,
          lastTriggeredAt: nowISO()
        }],
        pushTopic: "global-community"
      }
    ];
    defaultCommunities.forEach(c => memoryStore.communities.set(c.id, c));
  }
  
  // Documentos
  if (memoryStore.documents.size === 0) {
    const defaultDocs: ProjectDocument[] = [
      { id: generateUUID(), projectId: "p1", type: "title", url: "#", access: "public", title: "Título de propiedad", fileName: "titulo.pdf", uploadedAt: nowISO(), uploadedBy: "u_admin_1" },
      { id: generateUUID(), projectId: "p1", type: "permit", url: "#", access: "public", title: "Permiso de construcción", fileName: "permiso.pdf", uploadedAt: nowISO(), uploadedBy: "u_admin_1" },
      { id: generateUUID(), projectId: "p1", type: "terms", url: "#", access: "public", title: "Términos y condiciones", fileName: "terminos.pdf", uploadedAt: nowISO(), uploadedBy: "u_admin_1" }
    ];
    defaultDocs.forEach(d => memoryStore.documents.set(d.id, d));
  }
  
  saveToStorage();
}

// Inicialización diferida - se ejecuta cuando se necesita
let initialized = globalStore.__SPS_MEMORY_INITIALIZED__ ?? false;

function ensureInitialized() {
  if (initialized) return;

  if (typeof window !== 'undefined') {
    // En cliente: intentar cargar desde localStorage primero
    const loaded = loadFromStorage();
    if (!loaded) {
      initializeDefaultData();
    }
  } else {
    // En servidor: intentar cargar desde disco, de lo contrario inicializar por defecto
    const loadedFromDisk = loadFromDisk();
    if (!loadedFromDisk && memoryStore.projects.size === 0) {
      initializeDefaultData();
    }
  }

  initialized = true;
  globalStore.__SPS_MEMORY_INITIALIZED__ = true;
}

export class MockDbService implements DatabaseService {
  constructor() {
    // Asegurar que los datos estén inicializados
    ensureInitialized();
  }

  // Users
  async getUsers(): Promise<User[]> {
    ensureInitialized();
    return Array.from(memoryStore.users.values());
  }

  async getUserById(id: string): Promise<User | null> {
    ensureInitialized();
    return memoryStore.users.get(id) || null;
  }

  async upsertUser(user: User): Promise<User> {
    ensureInitialized();
    memoryStore.users.set(user.id, user);
    saveToStorage();
    return user;
  }

  // Developers
  async getDevelopers(): Promise<Developer[]> {
    ensureInitialized();
    return Array.from(memoryStore.developers.values());
  }

  async getDeveloperById(id: string): Promise<Developer | null> {
    ensureInitialized();
    return memoryStore.developers.get(id) || null;
  }

  async createDeveloper(developer: Developer): Promise<Developer> {
    ensureInitialized();
    memoryStore.developers.set(developer.id, developer);
    saveToStorage();
    return developer;
  }

  async updateDeveloper(id: string, updates: Partial<Developer>): Promise<Developer | null> {
    ensureInitialized();
    const existing = memoryStore.developers.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    memoryStore.developers.set(id, updated);
    saveToStorage();
    return updated;
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    ensureInitialized();
    return Array.from(memoryStore.projects.values());
  }

  async getProjectById(id: string): Promise<Project | null> {
    ensureInitialized();
    return memoryStore.projects.get(id) || null;
  }

  async getProjectBySlug(slug: string): Promise<Project | null> {
    ensureInitialized();
    const projects = Array.from(memoryStore.projects.values());
    for (const project of projects) {
      if (project.slug === slug) return project;
    }
    return null;
  }

  async createProject(project: Project): Promise<Project> {
    ensureInitialized();
    memoryStore.projects.set(project.id, project);
    saveToStorage();
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    ensureInitialized();
    const existing = memoryStore.projects.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    memoryStore.projects.set(id, updated);
    saveToStorage();
    return updated;
  }

  // Tenants & Clients
  async getTenants(): Promise<Tenant[]> {
    ensureInitialized();
    return Array.from(memoryStore.tenants.values());
  }

  async getTenantById(id: string): Promise<Tenant | null> {
    ensureInitialized();
    return memoryStore.tenants.get(id) || null;
  }

  async createTenant(tenant: Tenant): Promise<Tenant> {
    ensureInitialized();
    memoryStore.tenants.set(tenant.id, tenant);
    saveToStorage();
    return tenant;
  }

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | null> {
    ensureInitialized();
    const existing = memoryStore.tenants.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    memoryStore.tenants.set(id, updated);
    saveToStorage();
    return updated;
  }

  async getClients(): Promise<Client[]> {
    ensureInitialized();
    return Array.from(memoryStore.clients.values());
  }

  async getClientsByTenantId(tenantId: string): Promise<Client[]> {
    ensureInitialized();
    return Array.from(memoryStore.clients.values()).filter(c => c.tenantId === tenantId);
  }

  async createClient(client: Client): Promise<Client> {
    ensureInitialized();
    memoryStore.clients.set(client.id, client);
    saveToStorage();
    return client;
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client | null> {
    ensureInitialized();
    const existing = memoryStore.clients.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    memoryStore.clients.set(id, updated);
    saveToStorage();
    return updated;
  }

  async getTenantSettingsByTenantId(tenantId: string): Promise<TenantSettings | null> {
    ensureInitialized();
    return memoryStore.tenantSettings.get(tenantId) || null;
  }

  async upsertTenantSettings(settings: TenantSettings): Promise<TenantSettings> {
    ensureInitialized();
    memoryStore.tenantSettings.set(settings.tenantId, settings);
    saveToStorage();
    return settings;
  }

  // Rounds
  async getRounds(): Promise<Round[]> {
    ensureInitialized();
    return Array.from(memoryStore.rounds.values());
  }

  async getRoundById(id: string): Promise<Round | null> {
    ensureInitialized();
    return memoryStore.rounds.get(id) || null;
  }

  async getRoundByProjectId(projectId: string): Promise<Round | null> {
    ensureInitialized();
    const rounds = Array.from(memoryStore.rounds.values());
    for (const round of rounds) {
      if (round.projectId === projectId) return round;
    }
    return null;
  }

  async createRound(round: Round): Promise<Round> {
    ensureInitialized();
    memoryStore.rounds.set(round.id, round);
    saveToStorage();
    return round;
  }

  async updateRound(id: string, updates: Partial<Round>): Promise<Round | null> {
    ensureInitialized();
    const existing = memoryStore.rounds.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    memoryStore.rounds.set(id, updated);
    saveToStorage();
    return updated;
  }

  // Reservations
  async getReservations(): Promise<Reservation[]> {
    ensureInitialized();
    return Array.from(memoryStore.reservations.values());
  }

  async getReservationById(id: string): Promise<Reservation | null> {
    ensureInitialized();
    return memoryStore.reservations.get(id) || null;
  }

  async getReservationsByRoundId(roundId: string): Promise<Reservation[]> {
    ensureInitialized();
    return Array.from(memoryStore.reservations.values()).filter(r => r.roundId === roundId);
  }

  async getReservationsByUserId(userId: string): Promise<Reservation[]> {
    ensureInitialized();
    return Array.from(memoryStore.reservations.values()).filter(r => r.userId === userId);
  }

  async createReservation(reservation: Reservation): Promise<Reservation> {
    ensureInitialized();
    memoryStore.reservations.set(reservation.id, reservation);
    saveToStorage();
    return reservation;
  }

  async updateReservation(id: string, updates: Partial<Reservation>): Promise<Reservation | null> {
    ensureInitialized();
    const existing = memoryStore.reservations.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    memoryStore.reservations.set(id, updated);
    saveToStorage();
    return updated;
  }

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    ensureInitialized();
    return Array.from(memoryStore.transactions.values());
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    ensureInitialized();
    return memoryStore.transactions.get(id) || null;
  }

  async getTransactionByReservationId(reservationId: string): Promise<Transaction | null> {
    ensureInitialized();
    const transactions = Array.from(memoryStore.transactions.values());
    for (const tx of transactions) {
      if (tx.reservationId === reservationId) return tx;
    }
    return null;
  }

  async createTransaction(transaction: Transaction): Promise<Transaction> {
    ensureInitialized();
    memoryStore.transactions.set(transaction.id, transaction);
    saveToStorage();
    return transaction;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    ensureInitialized();
    const existing = memoryStore.transactions.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    memoryStore.transactions.set(id, updated);
    saveToStorage();
    return updated;
  }

  // Payment Webhooks
  async getPaymentWebhooks(): Promise<PaymentWebhook[]> {
    ensureInitialized();
    return Array.from(memoryStore.paymentWebhooks.values());
  }

  async getPaymentWebhookById(id: string): Promise<PaymentWebhook | null> {
    ensureInitialized();
    return memoryStore.paymentWebhooks.get(id) || null;
  }

  async createPaymentWebhook(event: PaymentWebhook): Promise<PaymentWebhook> {
    ensureInitialized();
    memoryStore.paymentWebhooks.set(event.id, event);
    saveToStorage();
    return event;
  }

  async updatePaymentWebhook(id: string, updates: Partial<PaymentWebhook>): Promise<PaymentWebhook | null> {
    ensureInitialized();
    const existing = memoryStore.paymentWebhooks.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    memoryStore.paymentWebhooks.set(id, updated);
    saveToStorage();
    return updated;
  }

  // Research
  async getResearch(): Promise<ResearchItem[]> {
    ensureInitialized();
    return Array.from(memoryStore.research.values());
  }

  async getResearchByProjectId(projectId: string): Promise<ResearchItem[]> {
    ensureInitialized();
    return Array.from(memoryStore.research.values()).filter(r => r.projectId === projectId);
  }

  async createResearchItem(item: ResearchItem): Promise<ResearchItem> {
    ensureInitialized();
    memoryStore.research.set(item.id, item);
    saveToStorage();
    return item;
  }

  // Price History
  async getPriceHistory(): Promise<Record<string, PricePoint[]>> {
    ensureInitialized();
    return Object.fromEntries(memoryStore.priceHistory);
  }

  async getPriceHistoryByProjectId(projectId: string): Promise<PricePoint[]> {
    ensureInitialized();
    return memoryStore.priceHistory.get(projectId) || [];
  }

  async addPricePoint(projectId: string, point: PricePoint): Promise<void> {
    ensureInitialized();
    const existing = memoryStore.priceHistory.get(projectId) || [];
    existing.push(point);
    memoryStore.priceHistory.set(projectId, existing);
    saveToStorage();
  }

  // Secondary Listings
  async getListings(): Promise<SecondaryListing[]> {
    ensureInitialized();
    return Array.from(memoryStore.listings.values());
  }

  async getListingsByProjectId(projectId: string): Promise<SecondaryListing[]> {
    ensureInitialized();
    return Array.from(memoryStore.listings.values()).filter(l => l.projectId === projectId);
  }

  async getListingById(id: string): Promise<SecondaryListing | null> {
    ensureInitialized();
    return memoryStore.listings.get(id) || null;
  }

  async createListing(listing: SecondaryListing): Promise<SecondaryListing> {
    ensureInitialized();
    memoryStore.listings.set(listing.id, listing);
    saveToStorage();
    return listing;
  }

  async updateListing(id: string, updates: Partial<SecondaryListing>): Promise<SecondaryListing | null> {
    ensureInitialized();
    const existing = memoryStore.listings.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    memoryStore.listings.set(id, updated);
    saveToStorage();
    return updated;
  }

  // Trades
  async getTrades(): Promise<Trade[]> {
    ensureInitialized();
    return Array.from(memoryStore.trades.values());
  }

  async createTrade(trade: Trade): Promise<Trade> {
    ensureInitialized();
    memoryStore.trades.set(trade.id, trade);
    saveToStorage();
    return trade;
  }

  // Documents
  async getDocuments(): Promise<ProjectDocument[]> {
    ensureInitialized();
    return Array.from(memoryStore.documents.values());
  }

  async getDocumentById(id: string): Promise<ProjectDocument | null> {
    ensureInitialized();
    return memoryStore.documents.get(id) || null;
  }

  async getDocumentsByProjectId(projectId: string): Promise<ProjectDocument[]> {
    ensureInitialized();
    return Array.from(memoryStore.documents.values()).filter(d => d.projectId === projectId);
  }

  async getDocumentsByDeveloperId(developerId: string): Promise<ProjectDocument[]> {
    ensureInitialized();
    return Array.from(memoryStore.documents.values()).filter(d => d.uploadedBy === developerId);
  }

  async createDocument(document: ProjectDocument): Promise<ProjectDocument> {
    ensureInitialized();
    memoryStore.documents.set(document.id, document);
    saveToStorage();
    return document;
  }

  async updateDocument(id: string, updates: Partial<ProjectDocument>): Promise<ProjectDocument | null> {
    ensureInitialized();
    const existing = memoryStore.documents.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    memoryStore.documents.set(id, updated);
    saveToStorage();
    return updated;
  }

  async deleteDocument(id: string): Promise<boolean> {
    ensureInitialized();
    const existed = memoryStore.documents.delete(id);
    if (existed) saveToStorage();
    return existed;
  }

  // Communities
  async getCommunities(): Promise<Community[]> {
    ensureInitialized();
    return Array.from(memoryStore.communities.values());
  }

  async getCommunityBySlug(slug: string): Promise<Community | null> {
    ensureInitialized();
    const communities = Array.from(memoryStore.communities.values());
    for (const community of communities) {
      if (community.slug === slug) return community;
    }
    return null;
  }

  async getCommunitiesByProjectId(projectId: string): Promise<Community[]> {
    ensureInitialized();
    return Array.from(memoryStore.communities.values()).filter(c => c.projectId === projectId);
  }

  async createCommunity(community: Community): Promise<Community> {
    ensureInitialized();
    memoryStore.communities.set(community.id, community);
    saveToStorage();
    return community;
  }

  async updateCommunity(id: string, updates: Partial<Community>): Promise<Community | null> {
    ensureInitialized();
    const existing = memoryStore.communities.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    memoryStore.communities.set(id, updated);
    saveToStorage();
    return updated;
  }

  // Automations & Agents
  async getAutomations(): Promise<AutomationWorkflow[]> {
    ensureInitialized();
    return Array.from(memoryStore.automations.values());
  }

  async createAutomation(workflow: AutomationWorkflow): Promise<AutomationWorkflow> {
    ensureInitialized();
    memoryStore.automations.set(workflow.id, workflow);
    saveToStorage();
    return workflow;
  }

  async updateAutomation(id: string, updates: Partial<AutomationWorkflow>): Promise<AutomationWorkflow | null> {
    ensureInitialized();
    const existing = memoryStore.automations.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    memoryStore.automations.set(id, updated);
    saveToStorage();
    return updated;
  }

  async getAgents(): Promise<IntelligentAgent[]> {
    ensureInitialized();
    return Array.from(memoryStore.agents.values());
  }

  async createAgent(agent: IntelligentAgent): Promise<IntelligentAgent> {
    ensureInitialized();
    memoryStore.agents.set(agent.id, agent);
    saveToStorage();
    return agent;
  }

  async updateAgent(id: string, updates: Partial<IntelligentAgent>): Promise<IntelligentAgent | null> {
    ensureInitialized();
    const existing = memoryStore.agents.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    memoryStore.agents.set(id, updated);
    saveToStorage();
    return updated;
  }
}

