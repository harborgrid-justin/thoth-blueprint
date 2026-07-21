import type { Site } from "../spatial/types";


export type ExperienceCategory =
  | "hydraulics"
  | "geometry"
  | "grading"
  | "subdivision"
  | "structural"
  | "erosion"
  | "plan_production";

export interface SmartExperience {
  id: string;
  code: string;
  name: string;
  category: ExperienceCategory;
  description: string;
}

export interface ExperienceResult {
  experienceId: string;
  code: string;
  name: string;
  category: ExperienceCategory;
  status: "optimal" | "warning" | "autofixed" | "autosized";
  message: string;
  recommendedValue?: number | string | object;
  actionTaken?: string;
}

export interface AutoFixAction {
  id: string;
  type: string;
  description: string;
  apply: (site: Site) => Site;
}
