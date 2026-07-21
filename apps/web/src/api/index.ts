import type { ApiClient } from "./client";
import { LocalApiClient } from "./localClient";
import { HttpApiClient } from "./httpClient";

const apiUrl = (import.meta.env.VITE_API_URL as string) || "";

/**
 * The single API client the app talks to. If VITE_API_URL is configured,
 * it points to the remote HTTP backend; otherwise, it falls back to the local
 * browser-persisted (localStorage) implementation.
 */
export const api: ApiClient = apiUrl
  ? new HttpApiClient(apiUrl)
  : new LocalApiClient();

export type { ApiClient, CreateProjectInput } from "./client";
export * from "./types";
