import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  createId,
  subdivisionSite,
  districtSite,
  estateSite,
  computeSiteMetrics,
} from "@thoth/domain";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const DB_FILE = path.join(DATA_DIR, "db.json");

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
  site: any;
}

export interface Checkpoint {
  id: string;
  projectId: string;
  name: string;
  note?: string;
  createdAt: string;
  authorName: string;
  site: any;
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
  { id: "user-amaya", name: "Amaya Okonkwo", email: "amaya@city.gov", color: "#f59e0b" },
  { id: "user-liang", name: "Liang Wei", email: "liang@studio.co", color: "#ec4899" },
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
      description: "48-unit single-family subdivision feasibility study with a neighborhood park.",
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
      description: "Downtown district plan exploring land-use allocation and FAR envelopes.",
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
      description: "A single-household estate at landscape scale — regions, terrain, forest, and a reservoir.",
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

export function loadStore(): Store {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const store = seedStore();
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf-8");
    return store;
  }

  try {
    const content = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(content) as Store;
  } catch (err) {
    console.error("Failed to parse database file, loading seed store instead.", err);
    return seedStore();
  }
}

export function writeStore(store: Store): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export const db = {
  loadStore,
  writeStore,
  summarize,
  CURRENT_USER,
  defaultMembers,
};
