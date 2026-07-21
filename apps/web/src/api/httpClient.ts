import type { Site } from "@thoth/domain";
import type { ApiClient, CreateProjectInput } from "./client";
import type {
  Checkpoint,
  Project,
  ProjectSummary,
  ReviewThread,
  User,
} from "./types";

/**
 * An HTTP implementation of {@link ApiClient} that communicates with the
 * server-side projects service backend.
 */
export class HttpApiClient implements ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    // Normalize baseUrl: strip trailing slashes
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API Request failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json() as Promise<T>;
  }

  async currentUser(): Promise<User> {
    return this.request<User>("/api/user");
  }

  async listProjects(): Promise<ProjectSummary[]> {
    return this.request<ProjectSummary[]>("/api/projects");
  }

  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/api/projects/${id}`);
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    return this.request<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async renameProject(
    id: string,
    name: string,
    description?: string,
  ): Promise<Project> {
    return this.request<Project>(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, description }),
    });
  }

  async deleteProject(id: string): Promise<void> {
    return this.request<void>(`/api/projects/${id}`, {
      method: "DELETE",
    });
  }

  async saveSite(projectId: string, site: Site): Promise<Project> {
    return this.request<Project>(`/api/projects/${projectId}/save`, {
      method: "POST",
      body: JSON.stringify({ site }),
    });
  }

  async listCheckpoints(projectId: string): Promise<Checkpoint[]> {
    return this.request<Checkpoint[]>(`/api/projects/${projectId}/checkpoints`);
  }

  async createCheckpoint(
    projectId: string,
    name: string,
    note?: string,
  ): Promise<Checkpoint> {
    return this.request<Checkpoint>(`/api/projects/${projectId}/checkpoints`, {
      method: "POST",
      body: JSON.stringify({ name, note }),
    });
  }

  async restoreCheckpoint(
    projectId: string,
    checkpointId: string,
  ): Promise<Project> {
    return this.request<Project>(
      `/api/projects/${projectId}/checkpoints/${checkpointId}/restore`,
      {
        method: "POST",
      },
    );
  }

  async deleteCheckpoint(
    projectId: string,
    checkpointId: string,
  ): Promise<void> {
    return this.request<void>(
      `/api/projects/${projectId}/checkpoints/${checkpointId}`,
      {
        method: "DELETE",
      },
    );
  }

  async resetWorkspace(mode: "samples" | "empty"): Promise<void> {
    return this.request<void>("/api/workspace/reset", {
      method: "POST",
      body: JSON.stringify({ mode }),
    });
  }

  async listThreads(projectId: string): Promise<ReviewThread[]> {
    return this.request<ReviewThread[]>(`/api/projects/${projectId}/threads`);
  }

  async addComment(
    projectId: string,
    elementId: string | null,
    body: string,
  ): Promise<ReviewThread> {
    return this.request<ReviewThread>(`/api/projects/${projectId}/threads`, {
      method: "POST",
      body: JSON.stringify({ elementId, body }),
    });
  }

  async resolveThread(
    projectId: string,
    threadId: string,
  ): Promise<ReviewThread> {
    return this.request<ReviewThread>(
      `/api/projects/${projectId}/threads/${threadId}/resolve`,
      {
        method: "POST",
      },
    );
  }
}
