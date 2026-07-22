import path from "path";
import { fileURLToPath } from "url";
import { createStorage, type StorageAdapter } from "@thoth/storage";
import {
  createId,
  subdivisionSite,
  districtSite,
  estateSite,
  computeSiteMetrics,
  type Site,
} from "@thoth/domain";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const SQLITE_FILE = path.join(DATA_DIR, "thoth.sqlite3");

// Define basic interface types matching frontend / types
export interface User {
  id: string;
  name: string;
  email: string;
  color: string;
}

export interface Member {
  user: User;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  siteAreaAcres: number;
  lotCount: number;
  members: Member[];
  site: Site;
}

export interface Checkpoint {
  id: string;
  projectId: string;
  name: string;
  note?: string;
  createdAt: string;
  authorName: string;
  site: Site;
}

export interface ReviewComment {
  id: string;
  authorName: string;
  authorColor: string;
  body: string;
  createdAt: string;
}

export interface ReviewThread {
  id: string;
  projectId: string;
  elementId: string | null;
  resolved: boolean;
  comments: ReviewComment[];
}

export interface Store {
  projects: Project[];
  checkpoints: Checkpoint[];
  threads: ReviewThread[];
}

const CURRENT_USER: User = {
  id: "user-me",
  name: "You",
  email: "planner@thoth.dev",
  color: "#0ea5e9",
};

const TEAMMATES: User[] = [
  {
    id: "user-amaya",
    name: "Amaya Okonkwo",
    email: "amaya@city.gov",
    color: "#f59e0b",
  },
  {
    id: "user-liang",
    name: "Liang Wei",
    email: "liang@studio.co",
    color: "#ec4899",
  },
];

function defaultMembers(): Member[] {
  return [
    { user: CURRENT_USER, role: "owner" },
    { user: TEAMMATES[0], role: "editor" },
    { user: TEAMMATES[1], role: "commenter" },
  ];
}

function summarize(project: Project) {
  const metrics = computeSiteMetrics(project.site, "acres");
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    siteAreaAcres: metrics.siteArea,
    lotCount: metrics.lotCount,
    members: project.members,
  };
}

function seedStore(): Store {
  const sub = subdivisionSite("Willow Creek Subdivision");
  const dist = districtSite("Riverside Mixed-Use District");
  const estate = estateSite("Kestrel Ridge Estate");
  const createdAt = new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString();

  const projects: Project[] = [
    {
      id: createId("proj"),
      name: "Willow Creek Subdivision",
      description:
        "48-unit single-family subdivision feasibility study with a neighborhood park.",
      createdAt,
      updatedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      siteAreaAcres: 0,
      lotCount: 0,
      members: defaultMembers(),
      site: sub,
    },
    {
      id: createId("proj"),
      name: "Riverside Mixed-Use District",
      description:
        "Downtown district plan exploring land-use allocation and FAR envelopes.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      siteAreaAcres: 0,
      lotCount: 0,
      members: defaultMembers(),
      site: dist,
    },
    {
      id: createId("proj"),
      name: "Kestrel Ridge Estate",
      description:
        "A single-household estate at landscape scale — regions, terrain, forest, and a reservoir.",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 100).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      siteAreaAcres: 0,
      lotCount: 0,
      members: defaultMembers(),
      site: estate,
    },
  ];

  return {
    projects,
    checkpoints: [],
    threads: [],
  };
}

// Persistence goes through @thoth/storage (SQLite by default — see
// packages/storage/README.md for how this swaps to an enterprise backend).
// Created lazily so tests can select a different STORAGE_DRIVER before the
// first read/write.
let storage: StorageAdapter | undefined;

function getStorage(): StorageAdapter {
  if (!storage) {
    storage = createStorage({ sqlite: { file: SQLITE_FILE } });
  }
  return storage;
}

async function persist(target: StorageAdapter, store: Store): Promise<void> {
  await target.transaction(async () => {
    await target.clear("projects");
    await target.clear("checkpoints");
    await target.clear("threads");
    for (const project of store.projects) {
      await target.put<Project>("projects", project);
    }
    for (const checkpoint of store.checkpoints) {
      await target.put<Checkpoint>("checkpoints", checkpoint);
    }
    for (const thread of store.threads) {
      await target.put<ReviewThread>("threads", thread);
    }
  });
}

export async function loadStore(): Promise<Store> {
  const target = getStorage();
  const projects = await target.list<Project>("projects");

  if (projects.length === 0) {
    const seeded = seedStore();
    await persist(target, seeded);
    return seeded;
  }

  const [checkpoints, threads] = await Promise.all([
    target.list<Checkpoint>("checkpoints"),
    target.list<ReviewThread>("threads"),
  ]);

  return { projects, checkpoints, threads };
}

export async function writeStore(store: Store): Promise<void> {
  await persist(getStorage(), store);
}

export const db = {
  loadStore,
  writeStore,
  summarize,
  CURRENT_USER,
  defaultMembers,
};

/** Test-only hook: lets tests reset the lazily-created storage singleton. */
export const __test__ = {
  resetStorage(): void {
    storage = undefined;
  },
};
