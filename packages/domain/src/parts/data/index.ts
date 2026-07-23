import architecturalParts from "./architectural.json";
import civilParts from "./civil.json";
import electricalParts from "./electrical.json";
import lumberParts from "./lumber.json";
import mechanicalPlumbingParts from "./mechanical_plumbing.json";
import surveyParts from "./survey.json";
import drawingParts from "./drawing.json";
import type { PartSpecification } from "../types";

export const INITIAL_PARTS_CATALOG: PartSpecification[] = [
  ...(architecturalParts as unknown as PartSpecification[]),
  ...(electricalParts as unknown as PartSpecification[]),
  ...(lumberParts as unknown as PartSpecification[]),
  ...(civilParts as unknown as PartSpecification[]),
  ...(mechanicalPlumbingParts as unknown as PartSpecification[]),
  ...(surveyParts as unknown as PartSpecification[]),
  ...(drawingParts as unknown as PartSpecification[]),
];
