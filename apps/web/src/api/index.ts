import type { ApiClient } from "./client";
import { LocalApiClient } from "./localClient";

/**
 * The single API client the app talks to. Today this is the local,
 * browser-persisted backend; point it at a real HTTP/websocket client when the
 * cloud services land, without touching the UI.
 */
export const api: ApiClient = new LocalApiClient();

export type { ApiClient, CreateProjectInput } from "./client";
export * from "./types";
