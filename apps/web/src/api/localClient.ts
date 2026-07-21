import {
  computeSiteMetrics,
  createId,
  siteForTemplate,
  subdivisionSite,
  districtSite,
  estateSite,
  type Site,
} from "@thoth/domain";
import type { ApiClient, CreateProjectInput } from "./client";
import type {
  Checkpoint,
  Member,
  Project,
  ProjectSummary,
  ReviewThread,
  User,
} from "./types";

/**
 * A local, browser-persisted implementation of {@link ApiClient}. It stands in
 * for the cloud services during development: state lives in localStorage and
 * calls resolve asynchronously to mimic a network. The UI treats it as a remote
 * backend — swapping in a real HTTP client requires no UI changes.
 */

const STORAGE_KEY = "thoth.workspace.v1";
const LATENCY_MS = 120;

interface Store {
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

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function clone<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

function summarize(project: Project): ProjectSummary {
  const metrics = computeSiteMetrics(project.site, "acres");
  const { site: _site, ...rest } = project;
  void _site;
  return {
    ...rest,
    siteAreaAcres: metrics.siteArea,
    lotCount: metrics.lotCount,
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function seed(): Store {
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
  return { projects, checkpoints: [], threads: [] };
}

function load(): Store {
  if (typeof window === "undefined") {
    return seed();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seed();
      persist(seeded);
      return seeded;
    }
    return JSON.parse(raw) as Store;
  } catch {
    const seeded = seed();
    persist(seeded);
    return seeded;
  }
}

function persist(store: Store): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or unavailable — non-fatal for a demo backend.
  }
}

export class LocalApiClient implements ApiClient {
  private store: Store;

  constructor() {
    this.store = load();
  }

  private commit() {
    persist(this.store);
  }

  private findProject(id: string): Project {
    const project = this.store.projects.find((p) => p.id === id);
    if (!project) {
      throw new Error(`Project not found: ${id}`);
    }
    return project;
  }

  currentUser(): Promise<User> {
    return delay(clone(CURRENT_USER));
  }

  listProjects(): Promise<ProjectSummary[]> {
    const summaries = this.store.projects
      .map((p) => summarize(p))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return delay(clone(summaries));
  }

  getProject(id: string): Promise<Project> {
    return delay(clone(this.findProject(id)));
  }

  createProject(input: CreateProjectInput): Promise<Project> {
    const site = siteForTemplate(input.name, input.template ?? "empty");
    const project: Project = {
      id: createId("proj"),
      name: input.name,
      description: input.description ?? "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
      siteAreaAcres: 0,
      lotCount: 0,
      members: defaultMembers(),
      site,
    };
    this.store.projects.push(project);
    this.commit();
    return delay(clone(project));
  }

  renameProject(
    id: string,
    name: string,
    description?: string,
  ): Promise<Project> {
    const project = this.findProject(id);
    project.name = name;
    project.site.name = name;
    if (description !== undefined) {
      project.description = description;
    }
    project.updatedAt = nowIso();
    this.commit();
    return delay(clone(project));
  }

  deleteProject(id: string): Promise<void> {
    this.store.projects = this.store.projects.filter((p) => p.id !== id);
    this.store.checkpoints = this.store.checkpoints.filter(
      (c) => c.projectId !== id,
    );
    this.store.threads = this.store.threads.filter((t) => t.projectId !== id);
    this.commit();
    return delay(undefined);
  }

  saveSite(projectId: string, site: Site): Promise<Project> {
    const project = this.findProject(projectId);
    project.site = clone(site);
    project.updatedAt = nowIso();
    this.commit();
    return delay(clone(project));
  }

  listCheckpoints(projectId: string): Promise<Checkpoint[]> {
    const checkpoints = this.store.checkpoints
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return delay(clone(checkpoints));
  }

  createCheckpoint(
    projectId: string,
    name: string,
    note?: string,
  ): Promise<Checkpoint> {
    const project = this.findProject(projectId);
    const checkpoint: Checkpoint = {
      id: createId("ckpt"),
      projectId,
      name,
      note,
      createdAt: nowIso(),
      authorName: CURRENT_USER.name,
      site: clone(project.site),
    };
    this.store.checkpoints.push(checkpoint);
    this.commit();
    return delay(clone(checkpoint));
  }

  restoreCheckpoint(projectId: string, checkpointId: string): Promise<Project> {
    const project = this.findProject(projectId);
    const checkpoint = this.store.checkpoints.find(
      (c) => c.id === checkpointId && c.projectId === projectId,
    );
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }
    project.site = clone(checkpoint.site);
    project.updatedAt = nowIso();
    this.commit();
    return delay(clone(project));
  }

  deleteCheckpoint(projectId: string, checkpointId: string): Promise<void> {
    this.store.checkpoints = this.store.checkpoints.filter(
      (c) => !(c.id === checkpointId && c.projectId === projectId),
    );
    this.commit();
    return delay(undefined);
  }

  resetWorkspace(mode: "samples" | "empty"): Promise<void> {
    this.store =
      mode === "samples"
        ? seed()
        : { projects: [], checkpoints: [], threads: [] };
    this.commit();
    return delay(undefined);
  }

  listThreads(projectId: string): Promise<ReviewThread[]> {
    return delay(
      clone(this.store.threads.filter((t) => t.projectId === projectId)),
    );
  }

  addComment(
    projectId: string,
    elementId: string | null,
    body: string,
  ): Promise<ReviewThread> {
    let thread = this.store.threads.find(
      (t) =>
        t.projectId === projectId && t.elementId === elementId && !t.resolved,
    );
    if (!thread) {
      thread = {
        id: createId("thread"),
        projectId,
        elementId,
        resolved: false,
        comments: [],
      };
      this.store.threads.push(thread);
    }
    thread.comments.push({
      id: createId("cmt"),
      authorName: CURRENT_USER.name,
      authorColor: CURRENT_USER.color,
      body,
      createdAt: nowIso(),
    });
    this.commit();
    return delay(clone(thread));
  }

  resolveThread(projectId: string, threadId: string): Promise<ReviewThread> {
    const thread = this.store.threads.find(
      (t) => t.id === threadId && t.projectId === projectId,
    );
    if (!thread) {
      throw new Error(`Thread not found: ${threadId}`);
    }
    thread.resolved = true;
    this.commit();
    return delay(clone(thread));
  }
}
