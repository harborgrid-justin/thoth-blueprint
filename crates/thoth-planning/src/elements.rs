//! The planning element hierarchy: every concrete kind of thing a [`Site`] can
//! contain, plus `Site` itself.
//!
//! Port of the `Region`/`Parcel`/`Block`/`Lot`/`Zone`/`LandUse`/`Building`/
//! `RightOfWay`/`Easement`/`OpenSpace`/`WaterBody`/`PlantingArea`/
//! `GradeRegion`/`Stair`/`CurtainWall`/`DoorElement`/`WindowElement`/
//! `RoofElement` interfaces and the point elements (`PlanNote`, `Tree`,
//! `SpotElevationPoint`) from `packages/domain/src/spatial/types/index.ts`,
//! plus `Site` itself.
//!
//! `thoth-spatial` intentionally does not host this hierarchy — see its
//! module docs — because these types are planning-domain concepts (the
//! "sacred primitives" CLAUDE.md calls out), not spatial-foundation leaves.
//! Every concrete element embeds [`thoth_spatial::ElementBase`] via
//! `#[serde(flatten)]`, matching the TS `interface X extends ElementBase`
//! pattern; [`new_base`] is the constructor helper that stands in for the
//! inherent-`impl` a same-crate port would give `ElementBase` (Rust's orphan
//! rule forbids adding inherent methods to a foreign type from this crate).
//!
//! **Scoping note** (see `GAPS.md`): the TS `Site` interface also carries
//! `networks`, `alignments`, `monuments`, `plss`, `drawingSets`,
//! `sheetViewports`, `dimensions`, `cadLayers`, `buildingModels`, and
//! `annotations` — fields typed by `thoth-civil`, `thoth-survey`, and
//! `thoth-drawing`, none of which are dependencies of this crate. This port
//! keeps the fields this crate's own rules/metrics/subdivision engine reads
//! (`spatial`, `layers`, `elements`, `jurisdiction_id`, `geoid`) plus the
//! locally-stubbed `control_lines`/`civil_symbols`/`networks` that the
//! erosion-compliance audit needs (see [`crate::civil_stub`]), and omits the
//! rest pending a later integration pass once those sibling crates exist.

use serde::de::{self, Deserializer};
use serde::{Deserialize, Serialize, Serializer};
use serde_json::Value;

use thoth_spatial::{
    ElementBase, ElementKind, Layer, Point, Polygon, RenovationStatus, SpatialContext,
};

use crate::civil_stub::{CivilSymbol, ControlLine, InfrastructureNetwork};
use crate::land_use::LandUseCategory;

/// Build an [`ElementBase`] with the given required fields and every optional
/// field unset — the Rust equivalent of a TS object literal that only sets
/// `id`/`kind`/`name`/`layerId`/`boundary` and leaves the rest `undefined`.
pub fn new_base(
    id: impl Into<String>,
    kind: ElementKind,
    name: impl Into<String>,
    layer_id: impl Into<String>,
    boundary: Polygon,
) -> ElementBase {
    ElementBase {
        id: id.into(),
        kind,
        name: name.into(),
        layer_id: layer_id.into(),
        boundary,
        arcs: None,
        cad_layer_id: None,
        line_weight: None,
        line_type: None,
        hatch_id: None,
        renovation_status: RenovationStatus::default(),
    }
}

// --- large-scale / cadastral elements --------------------------------------

/// The land-division `regionType` a [`Region`] carries.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RegionType {
    Estate,
    District,
    Watershed,
    Reserve,
    Agricultural,
    Settlement,
}

/// A large-scale land division above the parcel.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Region {
    #[serde(flatten)]
    pub base: ElementBase,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub region_type: Option<RegionType>,
}

/// A legally or conceptually distinct piece of land — the fundamental unit.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Parcel {
    #[serde(flatten)]
    pub base: ElementBase,
    /// Optional assessor/parcel identifier.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub apn: Option<String>,
}

/// An area bounded by rights-of-way that contains lots (parcel → block → lot).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Block {
    #[serde(flatten)]
    pub base: ElementBase,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parcel_id: Option<String>,
}

/// A subdivided unit of a parcel/block intended for a building or use.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Lot {
    #[serde(flatten)]
    pub base: ElementBase,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parcel_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_id: Option<String>,
    /// Required minimum distance from each boundary to a building, plan units.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub setback: Option<f64>,
}

/// An area governed by planning rules (e.g. a zoning district).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Zone {
    #[serde(flatten)]
    pub base: ElementBase,
    /// A zoning designation code, e.g. `"R-1"`, `"C-2"`, `"MU"`.
    pub designation: String,
    /// Land uses permitted within the zone.
    #[serde(default)]
    pub allowed_uses: Vec<LandUseCategory>,
    /// Maximum building coverage as a fraction of lot area (0–1).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_coverage: Option<f64>,
    /// Maximum floor area ratio.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_far: Option<f64>,
    /// Maximum building height in plan units.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_height: Option<f64>,
    /// Minimum setback from boundaries in plan units.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_setback: Option<f64>,
}

/// The designated purpose of an area, allocated across the site.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LandUse {
    #[serde(flatten)]
    pub base: ElementBase,
    pub category: LandUseCategory,
}

/// A structure represented by a 2D footprint on a lot.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Building {
    #[serde(flatten)]
    pub base: ElementBase,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lot_id: Option<String>,
    /// Number of storeys; multiplies footprint area into gross floor area.
    pub storeys: f64,
    /// Height in plan units (informational; storeys drive floor-area math).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<f64>,
    /// Dwelling units contained, for density metrics.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dwelling_units: Option<f64>,
    /// Renamed from TS `use` (a reserved word in Rust).
    #[serde(rename = "use", skip_serializing_if = "Option::is_none")]
    pub use_: Option<LandUseCategory>,
}

/// Land reserved for streets, paths, or utilities — typically public.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RightOfWay {
    #[serde(flatten)]
    pub base: ElementBase,
    /// Centerline of the ROW, if modeled linearly.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub centerline: Option<Vec<Point>>,
    /// Nominal width in plan units.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<f64>,
}

/// The restriction purpose an [`Easement`] carries.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EasementPurpose {
    Utility,
    Access,
    Drainage,
    Other,
}

/// An area encumbering a parcel/lot that restricts building.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Easement {
    #[serde(flatten)]
    pub base: ElementBase,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub purpose: Option<EasementPurpose>,
}

/// Unbuilt land reserved as open space (distinct from a "park" land use).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct OpenSpace {
    #[serde(flatten)]
    pub base: ElementBase,
    /// Whether this open space is a public dedication.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dedicated: Option<bool>,
}

/// The kind of a [`WaterBody`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WaterType {
    Lake,
    Pond,
    River,
    Stream,
    Wetland,
    Reservoir,
}

/// A body of water — a landscape and drainage feature.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WaterBody {
    #[serde(flatten)]
    pub base: ElementBase,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub water_type: Option<WaterType>,
}

/// The vegetation kind a [`PlantingArea`] carries.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PlantingType {
    Lawn,
    Forest,
    Garden,
    Orchard,
    Crop,
    Meadow,
}

/// A landscaped / vegetated area (lawn, forest, garden, crop, meadow).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlantingArea {
    #[serde(flatten)]
    pub base: ElementBase,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub planting_type: Option<PlantingType>,
    /// Estimated canopy/cover fraction (0–1) for landscape metrics.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub canopy_cover: Option<f64>,
}

/// How a [`GradeRegion`] reshapes land to its target elevation.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GradeMethod {
    Flat,
    Terrace,
}

/// A grading region: land reshaped to a target elevation (pad, terrace, or basin).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GradeRegion {
    #[serde(flatten)]
    pub base: ElementBase,
    /// Finished-grade elevation in plan units.
    pub target_elevation: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<GradeMethod>,
}

// --- point elements (no boundary polygon) ----------------------------------

/// A free-form annotation anchored on the canvas.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlanNote {
    pub id: String,
    pub kind: ElementKind,
    pub layer_id: String,
    pub text: String,
    pub position: Point,
    #[serde(default)]
    pub renovation_status: RenovationStatus,
}

/// A single tree/shrub as a point, with a canopy radius for coverage math.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Tree {
    pub id: String,
    pub kind: ElementKind,
    pub layer_id: String,
    pub position: Point,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub species: Option<String>,
    /// Canopy radius in plan units.
    pub canopy_radius: f64,
    #[serde(default)]
    pub renovation_status: RenovationStatus,
}

/// A surveyed spot elevation / benchmark — a control point for the terrain surface.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SpotElevationPoint {
    pub id: String,
    pub kind: ElementKind,
    pub layer_id: String,
    pub position: Point,
    /// Elevation in plan units.
    pub z: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(default)]
    pub renovation_status: RenovationStatus,
}

// --- Stair, CurtainWall, Door, Window, Roof planning elements --------------

/// The stair-plan topology of a [`Stair`] element.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum StairType {
    Straight,
    Spiral,
    UShape,
}

/// Stringer profile treatment.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StringerProfile {
    Open,
    Closed,
    None,
}

/// Nosing profile treatment.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NosingProfile {
    Round,
    Square,
    None,
}

/// A stair planning element representing straight, spiral, or U-shaped stairways.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Stair {
    #[serde(flatten)]
    pub base: ElementBase,
    pub stair_type: StairType,
    pub width: f64,
    /// Total rise height.
    pub height: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub radius: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_rotation: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub u_shape_offset: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub flight_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub intermediate_landing_length: Option<f64>,
    /// Target tread depth.
    pub tread_depth_limit: f64,
    /// Target riser height.
    pub riser_height_limit: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub landing_slab_thickness: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tread_slab_thickness: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stringer_profile: Option<StringerProfile>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stringer_width: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nosing_profile: Option<NosingProfile>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nosing_overhang: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub slip_resistant_grooves: Option<bool>,
    /// Standard overhead-clearance limit (e.g. 6'8").
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overhead_clearance_limit: Option<f64>,
    /// Ceiling elevation above the stair's starting level.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ceiling_elevation: Option<f64>,
}

/// How a curtain-wall grid axis is subdivided.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DivisionMode {
    #[default]
    Uniform,
    Fixed,
    Manual,
}

/// A curtain-wall panel infill material.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InfillMaterial {
    Glazing,
    Brick,
    Insulation,
    Door,
    Window,
}

/// The rectangular grid layout of a [`CurtainWall`]'s mullions and infill.
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct CurtainWallGrid {
    #[serde(default)]
    pub vertical_divisions: DivisionMode,
    /// Division coordinates along the wall width, measured from the start.
    #[serde(default)]
    pub vertical_offsets: Vec<f64>,
    #[serde(default)]
    pub horizontal_divisions: DivisionMode,
    /// Division heights from the bottom sill.
    #[serde(default)]
    pub horizontal_offsets: Vec<f64>,
    /// Per-mullion-index width override.
    #[serde(default, skip_serializing_if = "std::collections::BTreeMap::is_empty")]
    pub mullion_widths: std::collections::BTreeMap<u32, f64>,
    /// `"row,col"` -> infill material override.
    #[serde(default, skip_serializing_if = "std::collections::BTreeMap::is_empty")]
    pub infill_materials: std::collections::BTreeMap<String, InfillMaterial>,
}

/// Perimeter-frame corner treatment.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CornerStyle {
    Rectangular,
    #[serde(rename = "L-corner")]
    LCorner,
    #[serde(rename = "V-corner")]
    VCorner,
}

/// A curtain wall planning element representing glazed panel structures.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CurtainWall {
    #[serde(flatten)]
    pub base: ElementBase,
    /// Total wall length in plan.
    pub width: f64,
    /// Total height.
    pub height: f64,
    pub grid: CurtainWallGrid,
    /// `"row,col"` of the main grid -> a nested sub-grid definition.
    #[serde(default, skip_serializing_if = "std::collections::BTreeMap::is_empty")]
    pub nested_grids: std::collections::BTreeMap<String, CurtainWallGrid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub corner_style: Option<CornerStyle>,
    /// Perimeter frame width (e.g. 0.1 m).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frame_profile_width: Option<f64>,
    /// Gap between frame/panels (e.g. 0.01 m).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expansion_gap: Option<f64>,
    /// Front/back glass offset in frame (e.g. 0.02 m).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pane_offset: Option<f64>,
    /// Spacing of glass clips (e.g. 0.5 m).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clip_spacing: Option<f64>,
    /// Structural-column tie spacing (e.g. 1.2 m).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub structural_tie_spacing: Option<f64>,
    /// Thermal resistance of the frame.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frame_r_value: Option<f64>,
}

/// A fire-rating classification shared by door and window elements.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FireRating {
    #[serde(rename = "20-min")]
    TwentyMin,
    #[serde(rename = "45-min")]
    FortyFiveMin,
    #[serde(rename = "90-min")]
    NinetyMin,
    #[serde(rename = "3-hour")]
    ThreeHour,
    #[serde(rename = "none")]
    None,
}

/// Safety-glazing classification shared by door and window elements.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SafetyGlazing {
    Tempered,
    Wire,
    None,
}

/// Frame material shared by door and window elements.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FrameProfile {
    Wood,
    Metal,
    Vinyl,
}

/// How a [`DoorElement`] operates.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DoorOperation {
    Swing,
    DoubleSwing,
    Slide,
    Folding,
    Pocket,
    Overhead,
}

/// Door hardware trim style.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum HardwareTrim {
    Lever,
    Knob,
    #[serde(rename = "pull-bar")]
    PullBar,
    #[serde(rename = "panic-bar")]
    PanicBar,
}

/// A door planning element (as distinct from the wall-hosted `Door` opening
/// in `crate::building_interior`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DoorElement {
    #[serde(flatten)]
    pub base: ElementBase,
    pub width: f64,
    pub height: f64,
    pub depth: f64,
    pub door_operation: DoorOperation,
    /// Swing angle in degrees (default 90 when absent).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub swing_angle: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sill_thickness: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sill_overhang: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub threshold_height: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub weatherstripping: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hardware_trim: Option<HardwareTrim>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fire_rating: Option<FireRating>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stc_rating: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub safety_glazing: Option<SafetyGlazing>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frame_profile: Option<FrameProfile>,
}

/// A window operation type.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum WindowType {
    Awning,
    Casement,
    Hopper,
    SingleHung,
    DoubleHung,
    Gliding,
}

/// A window planning element (as distinct from the wall-hosted `Window`
/// opening in `crate::building_interior`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WindowElement {
    #[serde(flatten)]
    pub base: ElementBase,
    pub width: f64,
    pub height: f64,
    pub depth: f64,
    pub window_type: WindowType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sill_thickness: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sill_overhang: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub threshold_height: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub weatherstripping: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fire_rating: Option<FireRating>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stc_rating: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub safety_glazing: Option<SafetyGlazing>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub frame_profile: Option<FrameProfile>,
}

/// Roof form.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RoofType {
    Gable,
    Hip,
    Shed,
    Mansard,
    Flat,
}

/// Shingle/roofing material.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ShingleMaterial {
    Asphalt,
    Slate,
    Metal,
    Tile,
}

/// Dormer form.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DormerType {
    Gable,
    Hip,
    Shed,
}

/// A roof dormer projecting from a roof plane.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Dormer {
    #[serde(rename = "type")]
    pub dormer_type: DormerType,
    pub width: f64,
    pub offset: f64,
}

/// A roof planning element.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RoofElement {
    #[serde(flatten)]
    pub base: ElementBase,
    pub roof_type: RoofType,
    /// Vertical rise per 12 horizontal units (e.g. 4 for a 4:12 pitch).
    pub pitch: f64,
    /// Eaves projection width (default 0.3 m when absent).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overhang: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub soffit_width: Option<f64>,
    /// Structural thickness (default 0.2 m when absent).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thickness: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shingle_material: Option<ShingleMaterial>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gutters: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub soffit_vents: Option<bool>,
    #[serde(default)]
    pub dormers: Vec<Dormer>,
}

// --- the discriminated union of every element kind -------------------------

/// Any element that can appear in a plan — the discriminated union of every
/// concrete element kind, keyed by [`ElementKind`] (the TS `PlanElement`
/// union). Serializes/deserializes exactly like the TS tagged union: a plain
/// JSON object with a `"kind"` field selecting the shape, not a wrapper.
#[derive(Debug, Clone, PartialEq)]
pub enum PlanElement {
    Region(Region),
    Parcel(Parcel),
    Block(Block),
    Lot(Lot),
    Zone(Zone),
    LandUse(LandUse),
    Building(Building),
    RightOfWay(RightOfWay),
    Easement(Easement),
    OpenSpace(OpenSpace),
    WaterBody(WaterBody),
    PlantingArea(PlantingArea),
    GradeRegion(GradeRegion),
    Stair(Stair),
    CurtainWall(CurtainWall),
    Door(DoorElement),
    Window(WindowElement),
    Roof(RoofElement),
    Note(PlanNote),
    Tree(Tree),
    Spot(SpotElevationPoint),
}

impl PlanElement {
    /// The element's discriminant kind.
    pub fn kind(&self) -> ElementKind {
        match self {
            PlanElement::Region(_) => ElementKind::Region,
            PlanElement::Parcel(_) => ElementKind::Parcel,
            PlanElement::Block(_) => ElementKind::Block,
            PlanElement::Lot(_) => ElementKind::Lot,
            PlanElement::Zone(_) => ElementKind::Zone,
            PlanElement::LandUse(_) => ElementKind::Landuse,
            PlanElement::Building(_) => ElementKind::Building,
            PlanElement::RightOfWay(_) => ElementKind::Row,
            PlanElement::Easement(_) => ElementKind::Easement,
            PlanElement::OpenSpace(_) => ElementKind::Openspace,
            PlanElement::WaterBody(_) => ElementKind::Water,
            PlanElement::PlantingArea(_) => ElementKind::Planting,
            PlanElement::GradeRegion(_) => ElementKind::Grade,
            PlanElement::Stair(_) => ElementKind::Stair,
            PlanElement::CurtainWall(_) => ElementKind::Curtainwall,
            PlanElement::Door(_) => ElementKind::Door,
            PlanElement::Window(_) => ElementKind::Window,
            PlanElement::Roof(_) => ElementKind::Roof,
            PlanElement::Note(_) => ElementKind::Note,
            PlanElement::Tree(_) => ElementKind::Tree,
            PlanElement::Spot(_) => ElementKind::Spot,
        }
    }

    /// The element's shared base (id/name/layer/boundary/…), for every kind
    /// that carries one. Point elements (`Note`/`Tree`/`Spot`) return `None` —
    /// they have a `position`, not a `boundary`, matching the TS
    /// `isSpatialElement` split between `SpatialElement` and `PointElement`.
    pub fn base(&self) -> Option<&ElementBase> {
        match self {
            PlanElement::Region(e) => Some(&e.base),
            PlanElement::Parcel(e) => Some(&e.base),
            PlanElement::Block(e) => Some(&e.base),
            PlanElement::Lot(e) => Some(&e.base),
            PlanElement::Zone(e) => Some(&e.base),
            PlanElement::LandUse(e) => Some(&e.base),
            PlanElement::Building(e) => Some(&e.base),
            PlanElement::RightOfWay(e) => Some(&e.base),
            PlanElement::Easement(e) => Some(&e.base),
            PlanElement::OpenSpace(e) => Some(&e.base),
            PlanElement::WaterBody(e) => Some(&e.base),
            PlanElement::PlantingArea(e) => Some(&e.base),
            PlanElement::GradeRegion(e) => Some(&e.base),
            PlanElement::Stair(e) => Some(&e.base),
            PlanElement::CurtainWall(e) => Some(&e.base),
            PlanElement::Door(e) => Some(&e.base),
            PlanElement::Window(e) => Some(&e.base),
            PlanElement::Roof(e) => Some(&e.base),
            PlanElement::Note(_) | PlanElement::Tree(_) | PlanElement::Spot(_) => None,
        }
    }

    /// `true` for every kind that carries a boundary polygon (mirrors the TS
    /// `isSpatialElement` predicate).
    pub fn is_spatial(&self) -> bool {
        self.base().is_some()
    }
}

impl Serialize for PlanElement {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match self {
            PlanElement::Region(e) => e.serialize(serializer),
            PlanElement::Parcel(e) => e.serialize(serializer),
            PlanElement::Block(e) => e.serialize(serializer),
            PlanElement::Lot(e) => e.serialize(serializer),
            PlanElement::Zone(e) => e.serialize(serializer),
            PlanElement::LandUse(e) => e.serialize(serializer),
            PlanElement::Building(e) => e.serialize(serializer),
            PlanElement::RightOfWay(e) => e.serialize(serializer),
            PlanElement::Easement(e) => e.serialize(serializer),
            PlanElement::OpenSpace(e) => e.serialize(serializer),
            PlanElement::WaterBody(e) => e.serialize(serializer),
            PlanElement::PlantingArea(e) => e.serialize(serializer),
            PlanElement::GradeRegion(e) => e.serialize(serializer),
            PlanElement::Stair(e) => e.serialize(serializer),
            PlanElement::CurtainWall(e) => e.serialize(serializer),
            PlanElement::Door(e) => e.serialize(serializer),
            PlanElement::Window(e) => e.serialize(serializer),
            PlanElement::Roof(e) => e.serialize(serializer),
            PlanElement::Note(e) => e.serialize(serializer),
            PlanElement::Tree(e) => e.serialize(serializer),
            PlanElement::Spot(e) => e.serialize(serializer),
        }
    }
}

impl<'de> Deserialize<'de> for PlanElement {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        // Two-pass: buffer to a `Value`, peek "kind", then deserialize the
        // full struct for that variant. This is the internally-tagged-enum
        // behavior serde's derive can't express here because the tag field
        // ("kind") also lives *inside* the flattened `ElementBase` of every
        // spatial variant, which `#[serde(tag = "...")]` cannot combine with
        // `#[serde(flatten)]`.
        let value = Value::deserialize(deserializer)?;
        let kind = value
            .get("kind")
            .and_then(Value::as_str)
            .ok_or_else(|| de::Error::missing_field("kind"))?
            .to_string();

        macro_rules! decode {
            ($ty:ty, $variant:ident) => {
                serde_json::from_value::<$ty>(value)
                    .map(PlanElement::$variant)
                    .map_err(de::Error::custom)
            };
        }

        match kind.as_str() {
            "region" => decode!(Region, Region),
            "parcel" => decode!(Parcel, Parcel),
            "block" => decode!(Block, Block),
            "lot" => decode!(Lot, Lot),
            "zone" => decode!(Zone, Zone),
            "landuse" => decode!(LandUse, LandUse),
            "building" => decode!(Building, Building),
            "row" => decode!(RightOfWay, RightOfWay),
            "easement" => decode!(Easement, Easement),
            "openspace" => decode!(OpenSpace, OpenSpace),
            "water" => decode!(WaterBody, WaterBody),
            "planting" => decode!(PlantingArea, PlantingArea),
            "grade" => decode!(GradeRegion, GradeRegion),
            "stair" => decode!(Stair, Stair),
            "curtainwall" => decode!(CurtainWall, CurtainWall),
            "door" => decode!(DoorElement, Door),
            "window" => decode!(WindowElement, Window),
            "roof" => decode!(RoofElement, Roof),
            "note" => decode!(PlanNote, Note),
            "tree" => decode!(Tree, Tree),
            "spot" => decode!(SpotElevationPoint, Spot),
            other => Err(de::Error::custom(format!("unknown element kind: {other}"))),
        }
    }
}

// --- Site -------------------------------------------------------------------

/// The overall area being planned; the top-level container for a project's
/// spatial content.
///
/// See the module docs for which TS `Site` fields this scoped port keeps.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Site {
    pub id: String,
    pub name: String,
    pub spatial: SpatialContext,
    #[serde(default)]
    pub layers: Vec<Layer>,
    #[serde(default)]
    pub elements: Vec<PlanElement>,
    /// Active region plug-in (jurisdiction) id — see `crate::regions`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jurisdiction_id: Option<String>,
    /// Active GEOID standard identifier.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub geoid: Option<String>,
    /// Civil / erosion-control line features (silt fence, tree line, flow, …).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub control_lines: Option<Vec<ControlLine>>,
    /// Civil / erosion-control point symbols (inlet protection, ditch check, …).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub civil_symbols: Option<Vec<CivilSymbol>>,
    /// Road and utility networks serving the site.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub networks: Option<Vec<InfrastructureNetwork>>,
}

impl Site {
    /// Elements of one spatial kind, downcast to their concrete slice. Prefer
    /// this over manual `match`/`filter_map` at call sites (mirrors the TS
    /// `elementsOfKind` helper in `metrics.ts`).
    pub fn elements_of_kind(&self, kind: ElementKind) -> Vec<&PlanElement> {
        self.elements.iter().filter(|e| e.kind() == kind).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ctx() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: thoth_spatial::Unit::Meters,
            scale: 1.0,
        }
    }

    fn square(size: f64) -> Polygon {
        vec![
            Point::new(0.0, 0.0),
            Point::new(size, 0.0),
            Point::new(size, size),
            Point::new(0.0, size),
        ]
    }

    #[test]
    fn plan_element_round_trips_through_json_by_kind() {
        let lot = Lot {
            base: new_base("l1", ElementKind::Lot, "Lot 1", "layer", square(10.0)),
            parcel_id: None,
            block_id: None,
            setback: Some(2.0),
        };
        let el = PlanElement::Lot(lot.clone());
        let json = serde_json::to_value(&el).unwrap();
        assert_eq!(json["kind"], "lot");
        assert_eq!(json["setback"], 2.0);

        let round_tripped: PlanElement = serde_json::from_value(json).unwrap();
        assert_eq!(round_tripped, PlanElement::Lot(lot));
    }

    #[test]
    fn point_elements_have_no_base() {
        let tree = Tree {
            id: "t1".to_string(),
            kind: ElementKind::Tree,
            layer_id: "layer".to_string(),
            position: Point::new(0.0, 0.0),
            species: None,
            canopy_radius: 3.0,
            renovation_status: RenovationStatus::default(),
        };
        let el = PlanElement::Tree(tree);
        assert!(!el.is_spatial());
        assert!(el.base().is_none());
        assert_eq!(el.kind(), ElementKind::Tree);
    }

    #[test]
    fn spatial_elements_expose_their_base() {
        let parcel = Parcel {
            base: new_base("p1", ElementKind::Parcel, "Parcel 1", "layer", square(10.0)),
            apn: Some("123-45".to_string()),
        };
        let el = PlanElement::Parcel(parcel);
        assert!(el.is_spatial());
        assert_eq!(el.base().unwrap().id, "p1");
    }

    #[test]
    fn site_filters_elements_by_kind() {
        let site = Site {
            id: "s1".to_string(),
            name: "Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![
                PlanElement::Parcel(Parcel {
                    base: new_base("p1", ElementKind::Parcel, "P1", "l", square(10.0)),
                    apn: None,
                }),
                PlanElement::Lot(Lot {
                    base: new_base("lo1", ElementKind::Lot, "Lot 1", "l", square(5.0)),
                    parcel_id: None,
                    block_id: None,
                    setback: None,
                }),
            ],
            jurisdiction_id: None,
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
        };
        assert_eq!(site.elements_of_kind(ElementKind::Lot).len(), 1);
        assert_eq!(site.elements_of_kind(ElementKind::Parcel).len(), 1);
        assert_eq!(site.elements_of_kind(ElementKind::Building).len(), 0);
    }

    #[test]
    fn unknown_kind_fails_to_deserialize() {
        let value = serde_json::json!({ "kind": "not-a-real-kind" });
        let result: Result<PlanElement, _> = serde_json::from_value(value);
        assert!(result.is_err());
    }
}
