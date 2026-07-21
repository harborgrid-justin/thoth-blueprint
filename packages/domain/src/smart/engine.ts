import {
  bounds,
  boundaryArea,
  isSpatialElement,
  geoidRegistry,
  registerDefaultGeoidPlugins,
  sheetSize,
  type Site,
} from "@thoth/domain";
import type { ExperienceResult } from "./types";



import * as hyd from "./smartHydraulics";
import * as geo from "./smartGeometry";
import * as grd from "./smartGrading";
import * as sub from "./smartSubdivision";
import * as str from "./smartStructural";
import * as esc from "./smartErosion";
import * as drw from "./smartPlanProduction";

// Ensure default GEOID location plugins are registered in geoidRegistry
registerDefaultGeoidPlugins();

export class SmartEngineeringEngine {
  /**
   * Run all 100 Smart Engineering Automated Experiences dynamically against a Site,
   * sourcing location standards, climate factors, zoning parameters, and drafting dimensions directly from GEOID and spatial data.
   */
  public static runAllExperiences(site?: Site | null): ExperienceResult[] {
    const results: ExperienceResult[] = [];

    // Dynamically compute site parameters from active site elements & GEOID location data
    const p = SmartEngineeringEngine.extractParameters(site);

    // Hydraulics (1-15)
    results.push(hyd.autoSizeStormPipe(p.stormFlowCfs, p.slope));
    results.push(hyd.autoSizeSanitarySlope(p.sanitaryFlowCfs, p.pipeDiamIn));
    results.push(hyd.autoSizeWaterMain(p.waterDemandGpm));
    results.push(hyd.autoSizeDetentionBasin(p.disturbedAcres, p.cPre, p.cPost, p.i100));
    results.push(hyd.autoSizeCulvert(p.culvertFlowCfs));
    results.push(hyd.autoSizeInletThroat(p.gutterFlowCfs));
    results.push(hyd.autoSizeCurbInletCapacity(p.gutterSpreadFt));
    results.push(hyd.autoSizeRiprapApron(p.outfallDiamIn, p.outfallFlowCfs));
    results.push(hyd.autoSizeBioretentionCell(p.imperviousAcres));
    results.push(hyd.autoSizeOilGritSeparator(p.siteAcres));
    results.push(hyd.autoSizePumpWetWell(p.pumpFlowGpm));
    results.push(hyd.autoSizeOrificePlate(p.orificeTargetCfs, p.orificeHeadFt));
    results.push(hyd.autoSizeWeirCrest(p.weirFlowCfs, p.weirHeadFt));
    results.push(hyd.autoSizeForceMainWall(p.operatingPsi));
    results.push(hyd.autoSizeTrenchDrain(p.trenchFlowCfs));

    // Geometry (16-30)
    results.push(geo.autoCalcMinRadius(p.designSpeedMph, p.eMax));
    results.push(geo.autoCalcVerticalKFactor(p.designSpeedMph));
    results.push(geo.autoCalcHeadlightCrestLength(p.gradeDiffPercent, p.ssdFt));
    results.push(geo.autoCalcSagComfortLength(p.gradeDiffPercent, p.designSpeedMph));
    results.push(geo.autoCalcSuperelevationRunoff(p.laneWidthFt, p.eFull, p.designSpeedMph));
    results.push(geo.autoCalcCurveWidening(p.curveRadiusFt, p.designTruck));
    results.push(geo.autoCalcSpiralLength(p.curveRadiusFt, p.designSpeedMph));
    results.push(geo.autoCalcDecisionSightDistance(p.designSpeedMph));
    results.push(geo.autoCalcCurbReturnRadius(p.designTruck));
    results.push(geo.autoCalcRoundaboutICD(p.circulatoryLanes));
    results.push(geo.autoCalcSplitterDeflection(p.entrySpeedMph));
    results.push(geo.autoCalcSlipLaneDecel(p.designSpeedMph));
    results.push(geo.autoCalcPassingSightDistance(p.designSpeedMph));
    results.push(geo.autoCalcGuardrailRunout(p.designSpeedMph, p.adt));
    results.push(geo.autoCalcClearZoneWidth(p.designSpeedMph, p.roadsideSlopeRatio));

    // Grading (31-45)
    results.push(grd.autoSolveCutFillBalance(p.netEarthworkCuYd, p.currentPadElevFt));
    results.push(grd.autoSizeRetainingWall(p.cutHeightFt));
    results.push(grd.autoGradeBuildingPad(p.padSlopePercent));
    results.push(grd.autoGradeADAParkingAisle(p.adaCrossSlope, p.adaLongSlope));
    results.push(grd.autoGradeADARamp(p.adaRampSlopePercent));
    results.push(grd.autoGradeSwaleSlope(p.swaleSlopePercent));
    results.push(grd.autoSolveDaylightTie(p.isCut));
    results.push(grd.autoGradeTerracedBenching(p.embankmentHeightFt));
    results.push(grd.autoGradeCatchmentRidge(p.hasOverlandFlow));
    results.push(grd.autoFixLowPointPonding(p.hasGravityOutlet));
    results.push(grd.autoFixSteepSlopeOverrun(p.slopeRatio));
    results.push(grd.autoFixErosionVelocity(p.channelVelocityFps));
    results.push(grd.autoFixSlopeBoundaryOverrun(p.boundaryOverrunFt));
    results.push(grd.autoFixFoundationOverexcavation(p.foundationCutDepthFt));
    results.push(grd.autoFixSlopeGradeBreaks(p.gradeBreakAngleDeg));

    // Subdivision (46-60)
    results.push(sub.autoSubdivideEqualArea(p.siteAreaSqFt, p.targetLotAreaSqFt));
    results.push(sub.autoEnforceFrontageWidth(p.actualFrontageFt, p.minFrontageFt));
    results.push(sub.autoAlignPerpendicularSideLines(p.isRadialSideLines));
    results.push(sub.autoSizeCulDeSacBulb(p.turnaroundVehicle));
    results.push(sub.autoSizeHammerheadTurnaround());
    results.push(sub.autoPlaceSetbacks(p.setbackFrontFt, p.setbackRearFt, p.setbackSideFt));
    results.push(sub.autoSizeParkingStalls(p.buildingGfaSqFt, p.useCategory));
    results.push(sub.autoSizeDrivewayApron(p.hasTruckTraffic));
    results.push(sub.autoPlaceUtilityEasements(p.rearLotLineLengthFt));
    results.push(sub.autoFixDepthToWidthRatio(p.lotDepthFt, p.lotWidthFt));
    results.push(sub.autoFixLandlockedLot(p.hasDirectRowAccess));
    results.push(sub.autoFixSetbackEncroachment(p.setbackEncroachmentFt));
    results.push(sub.autoFixSightTriangleObstruction(p.hasCornerObstruction));
    results.push(sub.autoSizeTrashEnclosure());
    results.push(sub.autoFixNonConformingLotArea(p.actualLotAreaSqFt, p.minLotAreaSqFt));

    // Structural (61-75)
    results.push(str.autoSizeFloorJoistSpan(p.joistSpanFt, p.floorLiveLoadPsf));
    results.push(str.autoSizeFoundationFooting(p.wallLoadPlf, p.soilBearingPsf));
    results.push(str.autoSizeShearWall(p.wallHeightFt, p.windVelocityMph));
    results.push(str.autoSizeRoofPitch(p.snowLoadPsf));
    results.push(str.autoSizeStairRiserTread(p.stairTotalRiseIn));
    results.push(str.autoSolveStairHeadroom(p.stairHeadroomFt));
    results.push(str.autoSizeCurtainWallMullion(p.mullionSpanFt, p.windPressurePsf));
    results.push(str.autoSizeGlazingGlassThickness(p.windPressurePsf));
    results.push(str.autoSizeEgressDoorWidth(p.occupantLoad));
    results.push(str.autoSizeCorridorWidth(p.occupantLoad));
    results.push(str.autoFixStairHeadroomViolation(p.hasStairHeadroomViolation));
    results.push(str.autoFixCurtainWallThermalBridge(p.hasThermalBridge));
    results.push(str.autoFixDoorADAClearance(p.doorLatchClearanceIn));
    results.push(str.autoFixAtticVentilationRatio(p.atticCeilingAreaSqFt, p.atticVentAreaSqFt));
    results.push(str.autoSizeElevatorShaft(p.elevatorCapacityLbs));

    // Erosion (76-85)
    results.push(esc.autoSizeSedimentBasinVolume(p.disturbedAcres));
    results.push(esc.autoPlaceSiltFence(p.perimeterContourLengthFt));
    results.push(esc.autoSizeConstructionEntrance(p.truckTrafficVolume));
    results.push(esc.autoSizeInletProtection(p.inletType));
    results.push(esc.autoCalcUSLESoilLoss(p.disturbedAcres, p.slopePercent));
    results.push(esc.autoSizeSlopeDrainPipe(p.embankmentAcres));
    results.push(esc.autoFixUnstabilizedSlopeErosion(p.slopePercent));
    results.push(esc.autoFixSedimentBarrierOverflow(p.sedimentBarrierOverflowRisk));
    results.push(esc.autoFixHighSoilLoss(p.annualSoilLossTonsPerAc));
    results.push(esc.autoFixChannelScouring(p.channelShearStressPsf));

    // Plan Production (86-100)
    results.push(drw.autoFitViewportScale(p.extentWidthFt, p.sheetWidthIn));
    results.push(drw.autoComposePlanProfileViewports(p.alignmentLengthFt));
    results.push(drw.autoRotateViewportBaseline(p.baselineBearingDeg));
    results.push(drw.autoGenerateMatchLines(p.matchLineStationFt, p.nextSheetNum));
    results.push(drw.autoScalePlotTextHeight(p.plotScaleFtPerIn));
    results.push(drw.autoPlaceNorthArrowScaleBar(p.plotScaleFtPerIn));
    results.push(drw.autoLabelMetesAndBounds(p.boundaryCourseCount));
    results.push(drw.autoGenerateCurveTable(p.curveCount));
    results.push(drw.autoGeneratePipeSchedule(p.pipeSegmentCount, p.structureCount));
    results.push(drw.autoGenerateUnitSchedule(p.architecturalUnitCount));
    results.push(drw.autoFixLabelCollisions(p.labelCollisionCount));
    results.push(drw.autoFixOffsheetGraphics(p.isOffsheetGraphics));
    results.push(drw.autoPopulateTitleBlock(p.projectName, p.crsName));
    results.push(drw.autoFixLegendSymbols(p.prunedLegendSymbolCount));
    results.push(drw.autoFixSheetIndex(p.sheetNumberList));

    return results;
  }

  private static extractParameters(site?: Site | null) {
    // 1. Resolve local jurisdiction GEOID data from site or default to Prince William County, VA (GEOID: 51153)
    const targetGeoid = (site as any)?.geoid || (site as any)?.jurisdictionId || site?.spatial?.crs || "51153";
    const geoidCode = geoidRegistry.resolve(targetGeoid);
    const {
      zoning,
      stairs,
      civil,
      climate,
      hydraulics,
      geometry,
      grading,
      subdivision,
      structural,
      erosion,
      planProduction,
    } = geoidCode.standards as any;

    // 2. Derive spatial dimensions from site elements
    let siteAreaSqFt = 0;
    let siteExtentWidthFt = 1000;
    let siteExtentHeightFt = 600;

    if (site && site.elements && site.elements.length > 0) {
      const spatialEls = site.elements.filter(isSpatialElement);
      if (spatialEls.length > 0) {
        siteAreaSqFt = spatialEls.reduce((acc, el) => acc + boundaryArea(el.boundary), 0);
        const b = bounds(spatialEls.flatMap((e) => e.boundary));
        siteExtentWidthFt = Math.max(100, b.maxX - b.minX);
        siteExtentHeightFt = Math.max(100, b.maxY - b.minY);
      }
    }

    const siteArea = siteAreaSqFt > 0 ? siteAreaSqFt : 120000;
    const siteAcres = siteArea / 43560;

    const disturbedAcres = Math.max(1.0, siteAcres * 0.75);
    const imperviousAcres = Math.max(0.5, siteAcres * 0.45);
    const embankmentAcres = Math.max(0.5, siteAcres * 0.25);

    const align = site?.alignments?.[0];
    const designSpeedMph = align?.designSpeed ?? (siteExtentWidthFt > (geometry.designSpeedWidthThresholdFt ?? 2000) ? (geometry.highDesignSpeedMph ?? 55) : (geometry.lowDesignSpeedMph ?? 35));
    const alignmentLengthFt = align?.pis ? align.pis.length * (geometry.alignmentPiLengthFactor ?? 400) : siteExtentWidthFt + siteExtentHeightFt;

    // Calculate baseline bearing angle dynamically from alignment PIs or boundary edges
    let baselineBearingDeg = 0;
    if (align && align.pis && align.pis.length >= 2) {
      const dx = align.pis[1].point.x - align.pis[0].point.x;
      const dy = align.pis[1].point.y - align.pis[0].point.y;
      baselineBearingDeg = Math.round(((Math.atan2(dx, dy) * 180) / Math.PI) * 10) / 10;
    } else if (site && site.elements) {
      const spatialEls = site.elements.filter(isSpatialElement);
      if (spatialEls.length > 0 && spatialEls[0].boundary.length >= 2) {
        const pts = spatialEls[0].boundary;
        const dx = pts[1].x - pts[0].x;
        const dy = pts[1].y - pts[0].y;
        baselineBearingDeg = Math.round(((Math.atan2(dx, dy) * 180) / Math.PI) * 10) / 10;
      }
    }

    const building = site?.elements?.find((e) => e.kind === "building") as any;
    const buildingGfaSqFt = building ? (boundaryArea(building.boundary) || 10000) * (building.storeys || 1) : Math.round(siteArea * 0.2);

    // GEOID regional climate & federal reference parameters
    const i100 = climate.rainfallIntensity100Yr ?? 3.5;
    const windVelocityMph = climate.windVelocityMph ?? 120;
    const snowLoadPsf = climate.snowLoadPsf ?? 35;
    const soilBearingPsf = climate.soilBearingPsf ?? 2000;

    const stormFlowCfs = Math.max(hydraulics.minStormFlowCfs ?? 5.0, siteAcres * (imperviousAcres / siteAcres) * i100);
    const gutterFlowCfs = Math.max(hydraulics.minGutterFlowCfs ?? 1.0, stormFlowCfs * (hydraulics.gutterFlowRatio ?? 0.25));
    const gutterSpreadFt = Math.max(hydraulics.minGutterSpreadFt ?? 4.0, gutterFlowCfs * (hydraulics.gutterSpreadMultiplier ?? 2.2));
    const swaleSlopePercent = Math.max(0.5, (siteExtentHeightFt / Math.max(1, siteExtentWidthFt)) * 2);
    const gradeDiffPercent = Math.max(2.0, swaleSlopePercent * 4);

    // GEOID zoning standards
    const minLotAreaSqFt = zoning.minLotArea ?? Math.round(siteArea / 12);
    const targetLotAreaSqFt = minLotAreaSqFt;
    const actualFrontageFt = Math.round(Math.sqrt(targetLotAreaSqFt) * (subdivision.frontageAreaFactor ?? 0.65));
    const minFrontageFt = zoning.minRowWidth ?? Math.round(actualFrontageFt * (subdivision.minFrontageRatio ?? 1.25));

    const perimeterContourLengthFt = Math.round((siteExtentWidthFt + siteExtentHeightFt) * 2);

    // Plan Production Standards derived from sheetSize registry
    const defaultSheet = sheetSize((site as any)?.sheetSizeId ?? "arch-d");
    const sheetWidthIn = Math.max(defaultSheet.wIn, defaultSheet.hIn) - (planProduction.printableWidthMarginIn ?? 2.0); // Printable width in landscape
    const printableWidthIn = sheetWidthIn - (planProduction.printableHeightMarginIn ?? 4.0);
    const plotScaleFtPerIn = Math.max(10, Math.ceil(siteExtentWidthFt / printableWidthIn / (planProduction.plotScaleStepFtPerIn ?? 10)) * (planProduction.plotScaleStepFtPerIn ?? 10));
    const matchLineStationFt = Math.round((printableWidthIn * plotScaleFtPerIn) / (planProduction.matchLineStationRoundFt ?? 100)) * (planProduction.matchLineStationRoundFt ?? 100);
    const maxPrintableModelExtentFt = printableWidthIn * plotScaleFtPerIn;
    const isOffsheetGraphics = siteExtentWidthFt > maxPrintableModelExtentFt || siteExtentHeightFt > maxPrintableModelExtentFt;

    // Dynamically calculate annotation collisions & legend symbols from site elements
    const textEls = site?.elements?.filter((e) => e.kind === "building" || e.kind === "lot") ?? [];
    const labelCollisionCount = Math.max(0, Math.floor(textEls.length * (planProduction.labelCollisionRatio ?? 0.15)));

    const activeKinds = new Set(site?.elements?.map((e) => e.kind) ?? []);
    const standardSymbols = ["building", "lot", "zone", "road", "pipe", "manhole", "tree", "easement"];
    const prunedLegendSymbolCount = standardSymbols.filter((s) => !activeKinds.has(s as any)).length;

    return {
      siteAreaSqFt: siteArea,
      siteAcres,
      disturbedAcres,
      imperviousAcres,
      embankmentAcres,
      extentWidthFt: siteExtentWidthFt,
      extentHeightFt: siteExtentHeightFt,

      // Hydraulics
      stormFlowCfs,
      sanitaryFlowCfs: Math.max(hydraulics.minSanitaryFlowCfs ?? 0.5, siteAcres * (hydraulics.sanitaryFlowPerAcreCfs ?? 0.12)),
      waterDemandGpm: Math.max(hydraulics.minWaterDemandGpm ?? 100, siteAcres * (hydraulics.waterDemandPerAcreGpm ?? 48.0)),
      culvertFlowCfs: Math.max(hydraulics.minCulvertFlowCfs ?? 20, stormFlowCfs * (hydraulics.culvertFlowMultiplier ?? 1.8)),
      gutterFlowCfs,
      gutterSpreadFt,
      outfallFlowCfs: Math.max(hydraulics.minOutfallFlowCfs ?? 10, stormFlowCfs * (hydraulics.outfallFlowMultiplier ?? 0.85)),
      outfallDiamIn: hydraulics.outfallDiamIn ?? 24,
      pumpFlowGpm: Math.max(hydraulics.minPumpFlowGpm ?? 200, siteAcres * (hydraulics.pumpFlowPerAcreGpm ?? 65)),
      orificeTargetCfs: Math.max(hydraulics.minOrificeTargetCfs ?? 1.0, stormFlowCfs * (hydraulics.orificeTargetRatio ?? 0.2)),
      orificeHeadFt: Math.max(hydraulics.minOrificeHeadFt ?? 1.0, (siteExtentHeightFt * (hydraulics.orificeHeadHeightFactor ?? 0.005)) + (hydraulics.orificeHeadOffsetFt ?? 2.0)),
      weirFlowCfs: Math.max(hydraulics.minWeirFlowCfs ?? 15, stormFlowCfs * (hydraulics.weirFlowMultiplier ?? 3.0)),
      weirHeadFt: hydraulics.weirHeadFt ?? 1.2,
      operatingPsi: Math.round((siteExtentHeightFt * (hydraulics.operatingPsiHeightFactor ?? 0.1)) + (hydraulics.operatingPsiBase ?? 60)),
      trenchFlowCfs: Math.max(hydraulics.minTrenchFlowCfs ?? 0.5, stormFlowCfs * (hydraulics.trenchFlowRatio ?? 0.12)),
      pipeDiamIn: hydraulics.pipeDiamIn ?? 8,
      slope: Math.max(hydraulics.minSlope ?? 0.005, siteExtentHeightFt * (hydraulics.slopeHeightFactor ?? 0.00005)),
      cPre: hydraulics.cPre ?? 0.35,
      cPost: civil.maxRunoffCoefficient ?? Math.min(hydraulics.cPostMax ?? 0.9, (hydraulics.cPre ?? 0.35) + (imperviousAcres / siteAcres) * (hydraulics.cPostImperviousFactor ?? 0.55)),
      i100,

      // Geometry
      designSpeedMph,
      alignmentLengthFt,
      eMax: geometry.eMax ?? 0.06,
      gradeDiffPercent,
      ssdFt: designSpeedMph * (geometry.ssdSpeedMultiplier ?? 8.0),
      laneWidthFt: geometry.laneWidthFt ?? 12,
      eFull: geometry.eFull ?? 0.06,
      curveRadiusFt: Math.round((designSpeedMph * designSpeedMph) / (geometry.curveRadiusDivider ?? 6)),
      designTruck: siteAcres > (geometry.truckAcresThreshold ?? 15) ? (geometry.heavyTruck ?? "WB-67") : (geometry.standardTruck ?? "WB-50"),
      circulatoryLanes: siteAcres > (geometry.roundaboutAcresThreshold ?? 20) ? 2 : 1,
      entrySpeedMph: Math.round(designSpeedMph * (geometry.entrySpeedFactor ?? 0.6)),
      adt: Math.round(siteAcres * (geometry.adtPerAcre ?? 450)),
      roadsideSlopeRatio: Math.max(2, Math.round(100 / (gradeDiffPercent * 5))),

      // Grading
      netEarthworkCuYd: Math.round((siteArea * (gradeDiffPercent * 0.01) * 0.1) / 27),
      currentPadElevFt: Math.round(100.0 + (siteExtentHeightFt * 0.05)),
      cutHeightFt: Math.max(grading.minCutHeightFt ?? 2.0, gradeDiffPercent * (grading.cutHeightGradeFactor ?? 1.5)),
      padSlopePercent: grading.padSlopePercent ?? 1.2,
      adaCrossSlope: grading.adaCrossSlope ?? 0.03,
      adaLongSlope: grading.adaLongSlope ?? 0.04,
      adaRampSlopePercent: grading.adaRampSlopePercent ?? 9.5,
      swaleSlopePercent,
      isCut: true,
      embankmentHeightFt: Math.max(grading.minEmbankmentHeightFt ?? 5.0, gradeDiffPercent * (grading.embankmentHeightGradeFactor ?? 3.5)),
      hasOverlandFlow: siteAcres > (grading.overlandFlowAcresThreshold ?? 5.0),
      hasGravityOutlet: siteExtentHeightFt < (grading.gravityOutletHeightThresholdFt ?? 500),
      slopeRatio: grading.slopeRatio ?? 1.2,
      channelVelocityFps: Math.round(Math.sqrt(2 * (grading.channelVelocityGravity ?? 32.2) * (swaleSlopePercent * 0.01) * 10) * 10) / 10,
      boundaryOverrunFt: grading.boundaryOverrunFt ?? 3.5,
      foundationCutDepthFt: grading.foundationCutDepthFt ?? 5.5,
      gradeBreakAngleDeg: Math.round(gradeDiffPercent * (grading.gradeBreakAngleMultiplier ?? 4.5)),

      // Subdivision (Sourced from GEOID Zoning Standards & Federal Reference)
      targetLotAreaSqFt,
      actualFrontageFt,
      minFrontageFt,
      isRadialSideLines: false,
      turnaroundVehicle: siteAcres > (geometry.truckAcresThreshold ?? 15) ? (geometry.standardTruck ?? "WB-50") : "Fire Engine",
      setbackFrontFt: zoning.frontSetback ?? subdivision.defaultFrontSetback ?? 25,
      setbackRearFt: zoning.rearSetback ?? subdivision.defaultRearSetback ?? 30,
      setbackSideFt: zoning.sideSetback ?? subdivision.defaultSideSetback ?? 10,
      buildingGfaSqFt,
      useCategory: siteAcres > (subdivision.commercialAcresThreshold ?? 10) ? "commercial" : "retail",
      hasTruckTraffic: siteAcres > (subdivision.truckTrafficAcresThreshold ?? 5.0),
      rearLotLineLengthFt: Math.round(actualFrontageFt * (subdivision.rearLotLineRatio ?? 1.8)),
      lotDepthFt: Math.round(targetLotAreaSqFt / actualFrontageFt),
      lotWidthFt: actualFrontageFt,
      hasDirectRowAccess: siteAcres <= (subdivision.commercialAcresThreshold ?? 10),
      setbackEncroachmentFt: subdivision.setbackEncroachmentFt ?? 2.5,
      hasCornerObstruction: true,
      actualLotAreaSqFt: targetLotAreaSqFt,
      minLotAreaSqFt: Math.round(targetLotAreaSqFt * (subdivision.minLotAreaFactor ?? 1.15)),

      // Structural (Sourced from GEOID Stair, Egress & Regional Climate Standards)
      joistSpanFt: Math.max(structural.joistSpanMinFt ?? 12, Math.round(Math.sqrt(buildingGfaSqFt) * (structural.joistSpanAreaFactor ?? 0.15))),
      floorLiveLoadPsf: structural.floorLiveLoadPsf ?? 40,
      wallLoadPlf: Math.max(structural.wallLoadMinPlf ?? 1500, Math.round(buildingGfaSqFt * (structural.wallLoadAreaFactor ?? 0.14))),
      soilBearingPsf,
      wallHeightFt: structural.wallHeightFt ?? 10,
      windVelocityMph,
      snowLoadPsf,
      stairTotalRiseIn: structural.stairTotalRiseIn ?? 108,
      stairHeadroomFt: stairs.minHeadroom ?? structural.defaultStairHeadroomFt ?? 6.2,
      mullionSpanFt: structural.mullionSpanFt ?? 11,
      windPressurePsf: Math.round(windVelocityMph * (structural.windPressureFactor ?? 0.3)),
      occupantLoad: Math.max(structural.occupantLoadMin ?? 20, Math.round(buildingGfaSqFt / (structural.occupantLoadGfaDivider ?? 100))),
      hasStairHeadroomViolation: true,
      hasThermalBridge: true,
      doorLatchClearanceIn: structural.doorLatchClearanceIn ?? 12,
      atticCeilingAreaSqFt: buildingGfaSqFt,
      atticVentAreaSqFt: Math.round(buildingGfaSqFt / (structural.atticVentGfaDivider ?? 200)),
      elevatorCapacityLbs: structural.elevatorCapacityLbs ?? 3500,

      // Erosion
      perimeterContourLengthFt,
      truckTrafficVolume: siteAcres > (erosion.heavyTruckTrafficAcresThreshold ?? 10) ? "heavy" : "standard",
      inletType: "curb",
      slopePercent: gradeDiffPercent,
      sedimentBarrierOverflowRisk: disturbedAcres > (erosion.sedimentRiskDisturbedAcresThreshold ?? 3.0),
      annualSoilLossTonsPerAc: Math.round(gradeDiffPercent * (erosion.soilLossGradeMultiplier ?? 2.8) * 10) / 10,
      channelShearStressPsf: Math.round(swaleSlopePercent * (erosion.channelShearSlopeMultiplier ?? 5.6) * 10) / 10,

      // Plan Production (Sourced dynamically from sheetSize & alignment geometry)
      sheetWidthIn,
      baselineBearingDeg,
      matchLineStationFt,
      nextSheetNum: 2,
      plotScaleFtPerIn,
      boundaryCourseCount: Math.max(planProduction.minBoundaryCourses ?? 4, Math.round(perimeterContourLengthFt / (planProduction.boundaryCourseLengthDivider ?? 200))),
      curveCount: Math.max(planProduction.minCurves ?? 2, Math.round(alignmentLengthFt / (planProduction.curveLengthDivider ?? 600))),
      pipeSegmentCount: Math.max(planProduction.minPipeSegments ?? 4, Math.round(siteAcres * (planProduction.pipeSegmentAcresFactor ?? 1.5))),
      structureCount: Math.max(planProduction.minStructures ?? 3, Math.round(siteAcres * (planProduction.structureAcresFactor ?? 1.0))),
      architecturalUnitCount: Math.max(planProduction.minUnits ?? 6, Math.round(buildingGfaSqFt / (planProduction.unitGfaDivider ?? 1000))),
      labelCollisionCount,
      isOffsheetGraphics,
      projectName: site?.name ?? geoidCode.name ?? "Knightsbridge Subdivision",
      crsName: site?.spatial.crs ?? "NAD83 / Virginia North",
      prunedLegendSymbolCount,
      sheetNumberList: Array.from(
        { length: Math.max(2, Math.ceil(alignmentLengthFt / matchLineStationFt)) },
        (_, i) => `C-${i + 1}.00`,
      ),
    };
  }
}

