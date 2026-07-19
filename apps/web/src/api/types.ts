import type { Site } from "@thoth/domain";

/** Access roles a member can hold on a project (mirrors services/auth intent). */
export type Role = "owner" | "editor" | "commenter" | "viewer";

/** A person in the system. */
export interface User {
  id: string;
  name: string;
  email: string;
  /** A short color used for presence cursors and avatars. */
  color: string;
}

/** A collaborator on a project. */
export interface Member {
  user: User;
  role: Role;
}

/** Project summary shown in listings (without the full site payload). */
export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  /** Denormalized headline figures for dashboard cards. */
  siteAreaAcres: number;
  lotCount: number;
  members: Member[];
}

/** A server-persisted planning workspace: a site plus its collaborators. */
export interface Project extends ProjectSummary {
  site: Site;
}

/** A named snapshot of a project's site at a point in time. */
export interface Checkpoint {
  id: string;
  projectId: string;
  name: string;
  note?: string;
  createdAt: string;
  authorName: string;
  site: Site;
}

/** A comment thread anchored to a plan element (collaboration/review). */
export interface ReviewThread {
  id: string;
  projectId: string;
  elementId: string | null;
  resolved: boolean;
  comments: ReviewComment[];
}

export interface ReviewComment {
  id: string;
  authorName: string;
  authorColor: string;
  body: string;
  createdAt: string;
}
