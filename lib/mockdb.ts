import { ListingType } from "./types";
import { db } from "./config";

// Funciones helper que usan el servicio db (mantienen compatibilidad con código existente)
// Los datos ahora están en MockDbService que se inicializa automáticamente

export const findProjectBySlug = async (slug: string) => {
  return db.getProjectBySlug(slug);
};

export const findProjectById = async (id: string) => {
  return db.getProjectById(id);
};

export const findRoundByProject = async (projectId: string) => {
  return db.getRoundByProjectId(projectId);
};

const PROJECT_IMAGE_PLACEHOLDER = "/images/project-placeholder.svg";

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? 'tenant_default';

export const listPublishedProjects = async (filter?: { listingType?: ListingType; tenantId?: string }) => {
  const projects = await db.getProjects();
  return projects
    .filter(p => {
      if (p.status !== "published") return false;
      const projectTenantId = p.tenantId || DEFAULT_TENANT_ID;
      if (filter?.tenantId && projectTenantId !== filter.tenantId) return false;
      if (filter?.listingType && p.listingType !== filter.listingType) return false;
      return true;
    })
    .map(project => {
      if (project.images && project.images.length > 0) {
        return project;
      }

      return {
        ...project,
        images: [PROJECT_IMAGE_PLACEHOLDER]
      };
    });
};

export const byRoundReservations = async (roundId: string) => {
  return db.getReservationsByRoundId(roundId);
};

export const byUserReservations = async (userId: string) => {
  return db.getReservationsByUserId(userId);
};

export const listCommunities = async () => {
  return db.getCommunities();
};

export const listCommunitiesByProject = async (projectId: string) => {
  return db.getCommunitiesByProjectId(projectId);
};

export const findCommunityBySlug = async (slug: string) => {
  return db.getCommunityBySlug(slug);
};

export const listAutomations = async () => {
  return db.getAutomations();
};

export const listAgents = async () => {
  return db.getAgents();
};

// Objeto DB para compatibilidad con código existente (getters async)
export const DB = {
  get users() { return db.getUsers(); },
  get developers() { return db.getDevelopers(); },
  get documents() { return db.getDocuments(); },
  get projects() { return db.getProjects(); },
  get rounds() { return db.getRounds(); },
  get reservations() { return db.getReservations(); },
  get transactions() { return db.getTransactions(); },
  get research() { return db.getResearch(); },
  get priceHistory() { return db.getPriceHistory(); },
  get listings() { return db.getListings(); },
  get trades() { return db.getTrades(); },
  get communities() { return db.getCommunities(); },
  get automations() { return db.getAutomations(); },
  get agents() { return db.getAgents(); }
};
