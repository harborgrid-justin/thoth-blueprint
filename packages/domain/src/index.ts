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
export * from "./spatial/types";
export * from "./spatial/math";
export * from "./spatial/units";
export * from "./spatial/viewport";

// Survey
export * from "./survey/survey";
export * from "./survey/plss";
export * from "./survey/monument";
export * from "./survey/controls";
export * from "./survey/descriptionKeys";
export * from "./survey/points";
export * from "./survey/transparentCommands";
export * from "./survey/advancedLinework";
export * from "./survey/helpers/alignmentReportHelpers";
export * from "./survey/helpers/assemblyBuilderHelpers";
export * from "./survey/helpers/buildPlatFromScratch";
export * from "./survey/helpers/corridorHelpers";
export * from "./survey/helpers/gradingHelpers";
export * from "./survey/helpers/metesAndBoundsHelpers";
export * from "./survey/helpers/pipeHelpers";
export * from "./survey/helpers/planProductionHelpers";
export {
  buildView,
  dms,
  fmt as formatPlatValue,
  niceNumber,
  offset,
  outwardNormal,
  screenPair,
  slug,
  type View,
} from "./survey/helpers/platDrawingHelpers";
export {
  csvCell,
  dmsText,
  generateCoursesCsv,
  signed,
} from "./survey/helpers/platReportHelpers";
export {
  computeGraphicScaleBar,
  planExtent,
} from "./survey/helpers/platSheetHelpers";
export * from "./survey/helpers/profileHelpers";
export * from "./survey/helpers/subdivisionHelpers";
export * from "./survey/helpers/superelevationHelpers";

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
export * from "./planning/elementMeta";
export * from "./planning/elementFactory";
export * from "./planning/search";
export * from "./planning/vertex";
export * from "./planning/geoid/index";
export * from "./planning/sampleData";
export * from "./planning/presets/princeWilliamHousePlat";
export * from "./planning/presets/knightsbridgeLot11Plat";

// Civil
export * from "./civil/alignment";
export * from "./civil/corridor";
export * from "./civil/profile";
export * from "./civil/superelevation";
export * from "./civil/assembly";
export * from "./civil/grading";
export * from "./civil/terrain";
export * from "./civil/terrainModel";
export * from "./civil/pointcloud";
export * from "./civil/network";
export * from "./civil/pipedesign";
export * from "./civil/partbuilder";
export * from "./civil/intersection";
export * from "./civil/sections";
export * from "./civil/siteAndParcels";
export * from "./civil/labelsAndUDP";
export * from "./civil/parcelTables";
export * from "./civil/viewFramesAndMatchLines";
export * from "./civil/sheetsAndDataRefs";
export * from "./civil/sampleLinesAndSections";
export * from "./civil/featureLinesAndGrading";
export * from "./civil/gisAnd3DVisualization";
export * from "./civil/layoutTemplates";
export * from "./civil/scriptsAnd3DObjects";
export { formatBearingDMS, verticesToSvgPath } from "./civil/helpers/civilStudioHelpers";

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
export * from "./drawing/scene";
export * from "./drawing/builders";
export * from "./drawing/defaultSet";

// Domain Storage Layer (Pluggable Repositories)
export * from "./storage/index";

// Smart Automated Engineering Engine (100 Experiences)
export * from "./smart/index";

// Enterprise Global Parts Database
export * from "./parts/index";
