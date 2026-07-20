/**
 * @thoth/domain — planning domain model for Thoth Blueprint.
 *
 * The framework-agnostic heart of the platform: spatial foundation, planning
 * primitives, and the rules and metrics over them. No React, no server
 * framework, no database driver. Vocabulary mirrors docs/GLOSSARY.md.
 */

// Spatial foundation
export * from "./spatial/geometry";
export * from "./spatial/curve";
export * from "./spatial/spatial";
export * from "./spatial/primitives";
export * from "./spatial/id";

// Survey
export * from "./survey/survey";
export * from "./survey/plss";
export * from "./survey/monument";
export * from "./survey/controls";
export * from "./survey/descriptionKeys";

// Planning
export * from "./planning/landuse";
export * from "./planning/landlot";
export * from "./planning/building";
export * from "./planning/rules";
export * from "./planning/metrics";
export * from "./planning/regions";
export * from "./planning/subdivision";
export * from "./planning/renovation";
export * from "./planning/stairs";
export * from "./planning/curtainwall";
export * from "./planning/doorwindow";
export * from "./planning/roof";
export * from "./planning/erosion";

// Civil
export * from "./civil/alignment";
export * from "./civil/corridor";
export * from "./civil/profile";
export * from "./civil/superelevation";
export * from "./civil/assembly";
export * from "./civil/grading";
export * from "./civil/terrain";
export * from "./civil/pointcloud";
export * from "./civil/network";
export * from "./civil/pipedesign";
export * from "./civil/partbuilder";

// Drawing / Drafting / Sheet generation
export * from "./drawing/sheetsize";
export * from "./drawing/sheet";
export * from "./drawing/sheetview";
export * from "./drawing/drafting";
export * from "./drawing/hatch";
export * from "./drawing/dimension";
export * from "./drawing/annotation";
export * from "./drawing/labeling";
export * from "./drawing/planproduction";
export * from "./drawing/schedule";
export * from "./drawing/platset";
export * from "./drawing/qto";
export * from "./drawing/collada";
export * from "./planning/sampleData";
