import type { Site } from "@thoth/domain";
import type { Checkpoint, Project, ProjectSummary, ReviewThread, User } from "./types";

/**
 * The cloud API surface the workspace talks to. The app depends on this
 * interface, never on a concrete backend — matching the platform's cloud-first
 * design. A local implementation ({@link LocalApiClient}) backs development and
 * demos today; a real HTTP/websocket client can be dropped in with no changes
 * to the UI. Persistence here is a transport detail, not the source of truth
 * the UI reasons about.
 */
export interface ApiClient {
  /** The currently signed-in user (stubbed until services/auth exists). */
  currentUser(): Promise<User>;

  listProjects(): Promise<ProjectSummary[]>;
  getProject(id: string): Promise<Project>;
  createProject(input: CreateProjectInput): Promise<Project>;
  renameProject(id: string, name: string, description?: string): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  /** Persist a project's site (a save / autosave). */
  saveSite(projectId: string, site: Site): Promise<Project>;

  listCheckpoints(projectId: string): Promise<Checkpoint[]>;
  createCheckpoint(projectId: string, name: string, note?: string): Promise<Checkpoint>;
  restoreCheckpoint(projectId: string, checkpointId: string): Promise<Project>;
  deleteCheckpoint(projectId: string, checkpointId: string): Promise<void>;

  listThreads(projectId: string): Promise<ReviewThread[]>;
  addComment(
    projectId: string,
    elementId: string | null,
    body: string,
  ): Promise<ReviewThread>;
  resolveThread(projectId: string, threadId: string): Promise<ReviewThread>;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  /** Optional starter template; falls back to an empty site. */
  template?: "empty" | "subdivision" | "district" | "estate";
}
