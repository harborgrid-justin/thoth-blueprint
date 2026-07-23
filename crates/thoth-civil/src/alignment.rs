//! Horizontal roadway alignment and stationing — the survey/civil math behind
//! a DOT plan sheet (baselines like `R/L USH 8 EB` with stations
//! `1760+43.32`, curve points `PC`/`PT`, tangents, and curve data).
//!
//! An alignment is defined by the **PI method**: a chain of Points of
//! Intersection (PIs); each interior PI may carry a circular curve of a given
//! radius, fitted tangent to the two intersecting tangents. From that we
//! resolve the traveled centerline (tangent → curve → tangent …), continuous
//! stationing, and the curve data a plan sheet tabulates (T, L, Δ, E, M,
//! degree of curve, long chord). All math is analytic and exact.
//!
//! Conventions match the rest of the platform: north is −Y, east is +X;
//! azimuth is clockwise from north in `[0, 360)`. Distances/stations are in
//! plan units.
//!
//! Port of `packages/domain/src/civil/alignment.ts` +
//! `packages/domain/src/civil/types/alignment.ts`.

use thoth_spatial::{add, cross, dot, length, normalize, scale, subtract, Point};

use crate::common::{azimuth_of, format_station, DEGREE_OF_CURVE_CONST};
use crate::error::{CivilError, CivilResult};

/// The mathematical family a transition spiral belongs to.
///
/// Declared for parity with the TS source's `AlignmentSpiral`; no function in
/// this module currently constructs spiral elements — [`resolve_alignment`]
/// only ever resolves tangents and circular curves, exactly matching the
/// upstream `resolveAlignment`, which never reads `spiral_in`/`spiral_out`
/// either. The fields exist so this crate's wire format can carry a future
/// spiral-transition feature without a breaking change.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpiralType {
    Clothoid,
    Bloss,
    Biquadratic,
}

/// A transition spiral definition (see [`SpiralType`] for why this is
/// currently unused by [`resolve_alignment`]).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AlignmentSpiral {
    pub length: f64,
    pub spiral_type: SpiralType,
    pub theta_rad: f64,
    pub x: f64,
    pub y: f64,
    pub k: f64,
}

/// A Point of Intersection on an alignment; interior PIs may carry a curve.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AlignmentPi {
    pub point: Point,
    /// Circular curve radius at this PI, plan units. `None`/`<= 0` ⇒ no curve.
    pub radius: Option<f64>,
    /// Entrance spiral length in plan units. See [`SpiralType`]: not yet
    /// consumed by [`resolve_alignment`].
    pub spiral_in: Option<f64>,
    /// Exit spiral length in plan units. See [`SpiralType`].
    pub spiral_out: Option<f64>,
}

impl AlignmentPi {
    /// A PI with no curve (a simple angle point / the POB / the POE).
    pub const fn simple(point: Point) -> Self {
        AlignmentPi { point, radius: None, spiral_in: None, spiral_out: None }
    }

    /// An interior PI with a circular curve of the given radius.
    pub const fn curved(point: Point, radius: f64) -> Self {
        AlignmentPi { point, radius: Some(radius), spiral_in: None, spiral_out: None }
    }
}

/// The kind of parallel offset line carried alongside an alignment.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OffsetKind {
    Pavement,
    Shoulder,
    Row,
    Ditch,
}

/// A parallel offset line carried alongside an alignment (pavement edge,
/// R/W, …).
#[derive(Debug, Clone)]
pub struct AlignmentOffset {
    /// Signed offset, plan units; + is right of travel, − is left.
    pub distance: f64,
    pub kind: OffsetKind,
    pub label: Option<String>,
}

/// Which side(s) of the alignment a widening region applies to.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WideningSide {
    Left,
    Right,
    Both,
}

/// A localized lane-widening region on an offset alignment (turn lanes,
/// passing lanes).
#[derive(Debug, Clone)]
pub struct WideningRegion {
    pub id: String,
    pub start_station: f64,
    pub end_station: f64,
    pub added_width: f64,
    pub entry_taper_length: f64,
    pub exit_taper_length: f64,
    pub side: WideningSide,
}

/// A station-keyed design-speed override (e.g. a school zone).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct DesignSpeedZone {
    pub station: f64,
    pub speed: f64,
}

/// A horizontal alignment definition (the PI chain + its start station).
#[derive(Debug, Clone)]
pub struct HorizontalAlignment {
    pub id: String,
    pub name: String,
    pub pis: Vec<AlignmentPi>,
    /// Station at the Point of Beginning (start), plan units.
    pub start_station: f64,
    /// Parallel offset lines to generate (edge of pavement, right-of-way, …).
    pub offsets: Vec<AlignmentOffset>,
    /// Widening regions on offset alignments.
    pub widenings: Vec<WideningRegion>,
    /// Default design speed in mph (e.g. 45).
    pub design_speed: Option<f64>,
    /// Station-specific design speed zones.
    pub design_speeds: Vec<DesignSpeedZone>,
}

impl HorizontalAlignment {
    /// A minimal alignment: just an id, name, PI chain, and start station.
    pub fn new(id: impl Into<String>, name: impl Into<String>, pis: Vec<AlignmentPi>, start_station: f64) -> Self {
        HorizontalAlignment {
            id: id.into(),
            name: name.into(),
            pis,
            start_station,
            offsets: Vec::new(),
            widenings: Vec::new(),
            design_speed: None,
            design_speeds: Vec::new(),
        }
    }
}

/// Which way a curve turns along the direction of travel.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CurveDirection {
    Left,
    Right,
}

/// Resolved circular curve at a PI, with the values a plan sheet lists.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AlignmentCurve {
    pub pi_index: usize,
    pub pi: Point,
    /// Point of Curvature (tangent-to-curve) and Point of Tangency
    /// (curve-to-tangent).
    pub pc: Point,
    pub pt: Point,
    pub center: Point,
    pub radius: f64,
    /// Central (deflection) angle, radians.
    pub delta: f64,
    pub delta_deg: f64,
    /// Tangent distance T = R·tan(Δ/2).
    pub tangent: f64,
    /// Curve (arc) length L = R·Δ.
    pub length: f64,
    /// External distance E = R(sec(Δ/2) − 1).
    pub external: f64,
    /// Middle ordinate M = R(1 − cos(Δ/2)).
    pub middle_ordinate: f64,
    /// Long chord = 2R·sin(Δ/2).
    pub chord: f64,
    /// Degree of curve (arc definition), degrees per 100 units.
    pub degree_of_curve: f64,
    pub direction: CurveDirection,
    pub pc_station: f64,
    /// Ahead station of the PI, measured along the back tangent (PC + T).
    pub pi_station: f64,
    pub pt_station: f64,
    /// Azimuth of the long chord, degrees clockwise from north.
    pub chord_bearing: f64,
    /// Signed swept angle start→end (radians).
    pub sweep: f64,
    pub start_angle: f64,
    pub spiral_in: Option<AlignmentSpiral>,
    pub spiral_out: Option<AlignmentSpiral>,
}

/// One element of the traveled centerline: a tangent run, a circular curve,
/// or (reserved, see [`SpiralType`]) a spiral.
#[derive(Debug, Clone)]
pub enum AlignmentElement {
    Tangent {
        from: Point,
        to: Point,
        begin_station: f64,
        end_station: f64,
        length: f64,
        /// Azimuth of the tangent, degrees clockwise from north.
        bearing: f64,
    },
    Curve {
        curve: AlignmentCurve,
        begin_station: f64,
        end_station: f64,
    },
    Spiral {
        spiral: AlignmentSpiral,
        begin_station: f64,
        end_station: f64,
    },
}

impl AlignmentElement {
    pub fn begin_station(&self) -> f64 {
        match self {
            AlignmentElement::Tangent { begin_station, .. }
            | AlignmentElement::Curve { begin_station, .. }
            | AlignmentElement::Spiral { begin_station, .. } => *begin_station,
        }
    }

    pub fn end_station(&self) -> f64 {
        match self {
            AlignmentElement::Tangent { end_station, .. }
            | AlignmentElement::Curve { end_station, .. }
            | AlignmentElement::Spiral { end_station, .. } => *end_station,
        }
    }
}

/// A fully-resolved alignment: traveled elements, curve table, and extents.
#[derive(Debug, Clone)]
pub struct ResolvedAlignment {
    pub name: String,
    pub elements: Vec<AlignmentElement>,
    pub curves: Vec<AlignmentCurve>,
    pub start_station: f64,
    pub end_station: f64,
    pub length: f64,
    pub pob: Point,
    pub poe: Point,
}

/// A point and heading resolved at a given station.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AlignmentPoint {
    pub point: Point,
    /// Azimuth, degrees clockwise from north.
    pub bearing: f64,
}

/// Which side of the alignment a point falls on, looking in the direction of
/// travel.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Side {
    Left,
    Right,
    On,
}

/// Station/offset of a point relative to the alignment.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StationOffset {
    pub station: f64,
    pub offset: f64,
    pub side: Side,
}

/// The result of checking one curve's radius against AASHTO minimums for its
/// posted design speed.
#[derive(Debug, Clone, PartialEq)]
pub struct DesignSpeedCheckResult {
    pub pi_index: usize,
    pub station: f64,
    pub curve_radius: f64,
    pub required_radius: f64,
    pub design_speed: f64,
    pub is_violation: bool,
    pub message: String,
}

// --- resolve ---------------------------------------------------------------

/// Resolve an alignment into its traveled centerline, curve table, and
/// continuous stationing. Interior PIs whose radius fits between their
/// neighbors become circular curves; otherwise the PI is a simple angle
/// point.
///
/// # Errors
/// Returns [`CivilError::DegenerateAlignment`] if the alignment has fewer
/// than 2 PIs (there is no centerline to resolve). The TS original returns
/// `null` in this case; this crate distinguishes that caller error from the
/// legitimate "no result" queries below, which stay `Option`.
pub fn resolve_alignment(alignment: &HorizontalAlignment) -> CivilResult<ResolvedAlignment> {
    let pis = &alignment.pis;
    if pis.len() < 2 {
        return Err(CivilError::DegenerateAlignment { count: pis.len() });
    }

    // Resolve a curve at each interior PI (when a radius is set and it fits).
    let mut curves: Vec<Option<AlignmentCurve>> = vec![None; pis.len()];
    for i in 1..pis.len() - 1 {
        let r = pis[i].radius.unwrap_or(0.0);
        if r <= 0.0 {
            continue;
        }
        let pi = pis[i].point;
        let back = normalize(subtract(pi, pis[i - 1].point)); // direction of travel into the PI
        let fwd = normalize(subtract(pis[i + 1].point, pi)); // direction of travel out of the PI
        let cos_d = dot(back, fwd).clamp(-1.0, 1.0);
        let delta = cos_d.acos();
        if delta < 1e-6 || std::f64::consts::PI - delta < 1e-6 {
            continue; // straight or reversal
        }
        let tangent = r * (delta / 2.0).tan();
        // Tangent must fit within both adjacent tangent lengths.
        let back_len = length(subtract(pi, pis[i - 1].point));
        let fwd_len = length(subtract(pis[i + 1].point, pi));
        if tangent > back_len - 1e-6 || tangent > fwd_len - 1e-6 {
            continue;
        }

        let pc = subtract(pi, scale(back, tangent));
        let pt = add(pi, scale(fwd, tangent));
        // Center is offset from PC, perpendicular to the back tangent, toward the turn.
        let mut nrm = Point::new(-back.y, back.x);
        if dot(nrm, fwd) < 0.0 {
            nrm = Point::new(-nrm.x, -nrm.y);
        }
        let center = add(pc, scale(nrm, r));
        // In the north=−Y frame, a clockwise turn (crossz > 0) curves to the right.
        let turn = cross(back, fwd);
        let direction = if turn > 0.0 { CurveDirection::Right } else { CurveDirection::Left };

        let start_angle = (pc.y - center.y).atan2(pc.x - center.x);
        let end_angle = (pt.y - center.y).atan2(pt.x - center.x);
        let mut sweep = end_angle - start_angle;
        // Normalize the sweep to (-π, π] safely without unbounded loops.
        sweep = sweep.sin().atan2(sweep.cos());
        if (sweep.abs() - delta).abs() > 1e-4 {
            let sign = if sweep == 0.0 { 1.0 } else { sweep.signum() };
            sweep = sign * delta;
        }

        curves[i] = Some(AlignmentCurve {
            pi_index: i,
            pi,
            pc,
            pt,
            center,
            radius: r,
            delta,
            delta_deg: delta * 180.0 / std::f64::consts::PI,
            tangent,
            length: r * delta,
            external: r * (1.0 / (delta / 2.0).cos() - 1.0),
            middle_ordinate: r * (1.0 - (delta / 2.0).cos()),
            chord: 2.0 * r * (delta / 2.0).sin(),
            degree_of_curve: DEGREE_OF_CURVE_CONST / r,
            direction,
            pc_station: 0.0, // filled during stationing
            pi_station: 0.0,
            pt_station: 0.0,
            chord_bearing: azimuth_of(normalize(subtract(pt, pc))),
            sweep,
            start_angle,
            spiral_in: None,
            spiral_out: None,
        });
    }

    // Walk the path, emitting tangents and curves and accumulating stations.
    let mut elements: Vec<AlignmentElement> = Vec::new();
    let mut resolved_curves: Vec<AlignmentCurve> = Vec::new();
    let mut station = alignment.start_station;
    let mut cursor = pis[0].point; // current traveled position (POB, then each PT)

    for i in 1..pis.len() {
        let curve = if i < pis.len() - 1 { curves[i].clone() } else { None };
        let tangent_end = curve.as_ref().map_or(pis[i].point, |c| c.pc);
        let seg_len = length(subtract(tangent_end, cursor));
        if seg_len > 1e-9 {
            let dir = normalize(subtract(tangent_end, cursor));
            elements.push(AlignmentElement::Tangent {
                from: cursor,
                to: tangent_end,
                begin_station: station,
                end_station: station + seg_len,
                length: seg_len,
                bearing: azimuth_of(dir),
            });
            station += seg_len;
        }
        if let Some(mut curve) = curve {
            curve.pc_station = station;
            curve.pi_station = station + curve.tangent;
            curve.pt_station = station + curve.length;
            let begin_station = station;
            let end_station = station + curve.length;
            station += curve.length;
            cursor = curve.pt;
            resolved_curves.push(curve.clone());
            elements.push(AlignmentElement::Curve { curve, begin_station, end_station });
        } else {
            cursor = pis[i].point;
        }
    }

    Ok(ResolvedAlignment {
        name: alignment.name.clone(),
        elements,
        curves: resolved_curves,
        start_station: alignment.start_station,
        end_station: station,
        length: station - alignment.start_station,
        pob: pis[0].point,
        poe: cursor,
    })
}

/// Total traveled length of a resolved alignment, plan units.
pub fn alignment_length(resolved: &ResolvedAlignment) -> f64 {
    resolved.length
}

/// Point and heading at a given station.
///
/// # Errors
/// Returns [`CivilError::StationOutOfRange`] if `station` doesn't fall within
/// any element's `[begin_station, end_station]` (within a small tolerance).
pub fn point_at_station(resolved: &ResolvedAlignment, station: f64) -> CivilResult<AlignmentPoint> {
    let elements = &resolved.elements;
    if elements.is_empty() {
        return Err(CivilError::StationOutOfRange {
            station,
            start: resolved.start_station,
            end: resolved.end_station,
        });
    }
    let mut low = 0i64;
    let mut high = elements.len() as i64 - 1;
    while low <= high {
        let mid = ((low + high) as u64 >> 1) as usize;
        let el = &elements[mid];
        if station < el.begin_station() - 1e-6 {
            high = mid as i64 - 1;
        } else if station > el.end_station() + 1e-6 {
            low = mid as i64 + 1;
        } else {
            match el {
                AlignmentElement::Tangent { from, to, begin_station, length: len, .. } => {
                    let t = (station - begin_station) / len.max(1e-9);
                    return Ok(AlignmentPoint {
                        point: Point::new(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t),
                        bearing: match el {
                            AlignmentElement::Tangent { bearing, .. } => *bearing,
                            _ => unreachable!(),
                        },
                    });
                }
                AlignmentElement::Curve { curve, begin_station, .. } => {
                    let frac = (station - begin_station) / curve.length.max(1e-9);
                    let ang = curve.start_angle + curve.sweep * frac;
                    let point = Point::new(curve.center.x + curve.radius * ang.cos(), curve.center.y + curve.radius * ang.sin());
                    let sign = if curve.sweep >= 0.0 { 1.0 } else { -1.0 };
                    let dir = Point::new(-ang.sin() * sign, ang.cos() * sign);
                    return Ok(AlignmentPoint { point, bearing: azimuth_of(dir) });
                }
                AlignmentElement::Spiral { .. } => {
                    // Not constructed by resolve_alignment; see SpiralType docs.
                    break;
                }
            }
        }
    }
    Err(CivilError::StationOutOfRange { station, start: resolved.start_station, end: resolved.end_station })
}

/// Station/offset of a point relative to the alignment (offset +right/−left
/// of travel). Always returns the closest element's projection; never fails
/// on a resolved (non-empty) alignment.
pub fn station_offset_of_point(resolved: &ResolvedAlignment, p: Point) -> StationOffset {
    let mut best = StationOffset { station: resolved.start_station, offset: f64::INFINITY, side: Side::On };
    let mut best_abs = f64::INFINITY;

    for el in &resolved.elements {
        match el {
            AlignmentElement::Tangent { from, to, begin_station, length: len, .. } => {
                let ab = subtract(*to, *from);
                let l2 = dot(ab, ab);
                let mut t = if l2 < 1e-12 { 0.0 } else { dot(subtract(p, *from), ab) / l2 };
                t = t.clamp(0.0, 1.0);
                let foot = add(*from, scale(ab, t));
                let d = length(subtract(p, foot));
                if d < best_abs {
                    best_abs = d;
                    let dir = normalize(ab);
                    let side = cross(dir, subtract(p, foot));
                    best = StationOffset {
                        station: begin_station + t * len,
                        offset: d,
                        side: if side.abs() < 1e-9 { Side::On } else if side > 0.0 { Side::Right } else { Side::Left },
                    };
                }
            }
            AlignmentElement::Curve { curve, begin_station, .. } => {
                let to_p = subtract(p, curve.center);
                let ang = to_p.y.atan2(to_p.x);

                // Clamp the angle to the swept arc.
                let a0 = curve.start_angle;
                let a1 = curve.start_angle + curve.sweep;
                let lo = a0.min(a1);
                let hi = a0.max(a1);
                let mut clamped = ang;
                while clamped < lo - std::f64::consts::PI {
                    clamped += 2.0 * std::f64::consts::PI;
                }
                while clamped > hi + std::f64::consts::PI {
                    clamped -= 2.0 * std::f64::consts::PI;
                }
                clamped = clamped.clamp(lo, hi);
                let foot = Point::new(curve.center.x + curve.radius * clamped.cos(), curve.center.y + curve.radius * clamped.sin());
                let d = length(subtract(p, foot));
                if d < best_abs {
                    best_abs = d;
                    let frac = if curve.sweep == 0.0 { 0.0 } else { (clamped - curve.start_angle) / curve.sweep };
                    let sign = if curve.sweep >= 0.0 { 1.0 } else { -1.0 };
                    let dir = Point::new(-clamped.sin() * sign, clamped.cos() * sign);
                    let side = cross(dir, subtract(p, foot));
                    best = StationOffset {
                        station: begin_station + frac * curve.length,
                        offset: d,
                        side: if side.abs() < 1e-9 { Side::On } else if side > 0.0 { Side::Right } else { Side::Left },
                    };
                }
            }
            AlignmentElement::Spiral { .. } => {}
        }
    }
    best
}

/// A parallel offset line of the alignment centerline (edge of pavement,
/// R/W, ditch, …): the centerline sampled and displaced by `offset` along the
/// right normal (+ right of travel, − left). Concentric through curves.
///
/// `samples` is the number of intervals to sweep across the full alignment
/// length (the TS default is 120).
pub fn offset_alignment_path(resolved: &ResolvedAlignment, offset: f64, samples: u32) -> Vec<Point> {
    let mut out = Vec::new();
    let total = resolved.length;
    if total <= 0.0 {
        return out;
    }
    for i in 0..=samples {
        let Ok(at) = point_at_station(resolved, resolved.start_station + (total * i as f64) / samples as f64) else {
            continue;
        };
        let rad = at.bearing * std::f64::consts::PI / 180.0;
        let dir = Point::new(rad.sin(), -rad.cos()); // travel direction
        let nrm = Point::new(-dir.y, dir.x); // right of travel
        out.push(Point::new(at.point.x + nrm.x * offset, at.point.y + nrm.y * offset));
    }
    out
}

/// Sample a resolved alignment into a single centerline polyline.
pub fn centerline_points(r: &ResolvedAlignment) -> Vec<Point> {
    let mut pts = Vec::new();
    for el in &r.elements {
        match el {
            AlignmentElement::Tangent { from, to, .. } => {
                if pts.is_empty() {
                    pts.push(*from);
                }
                pts.push(*to);
            }
            AlignmentElement::Curve { curve, .. } => {
                let steps = (curve.delta_deg / 2.0).ceil().max(2.0) as u32;
                for i in 0..=steps {
                    let ang = curve.start_angle + (curve.sweep * i as f64) / steps as f64;
                    pts.push(Point::new(curve.center.x + curve.radius * ang.cos(), curve.center.y + curve.radius * ang.sin()));
                }
            }
            AlignmentElement::Spiral { .. } => {}
        }
    }
    pts
}

/// Full-station values at multiples of `interval` within the alignment
/// range (the TS default `interval` is 100).
pub fn full_stations(resolved: &ResolvedAlignment, interval: f64) -> Vec<f64> {
    let mut out = Vec::new();
    let first = (resolved.start_station / interval).ceil() * interval;
    let mut s = first;
    while s <= resolved.end_station + 1e-6 {
        out.push(s);
        s += interval;
    }
    out
}

/// AASHTO minimum curve radius (feet) for eMax = 6% at a given design speed
/// (mph).
fn min_radius_for_speed(speed: f64) -> f64 {
    if speed <= 15.0 {
        50.0
    } else if speed <= 25.0 {
        150.0
    } else if speed <= 35.0 {
        350.0
    } else if speed <= 45.0 {
        600.0
    } else if speed <= 55.0 {
        1000.0
    } else {
        1600.0 // 65 mph or above
    }
}

/// Validates alignment curve radii against AASHTO design speed standards.
/// Minimum radius values for eMax=6% crown rate.
pub fn validate_alignment_design_speed(alignment: &HorizontalAlignment, resolved: &ResolvedAlignment) -> Vec<DesignSpeedCheckResult> {
    let default_speed = alignment.design_speed.unwrap_or(35.0);

    // Zones sorted by descending station (mirrors `_.orderBy(..., ["station"], ["desc"])`).
    let mut sorted_zones = alignment.design_speeds.clone();
    sorted_zones.sort_by(|a, b| b.station.partial_cmp(&a.station).unwrap_or(std::cmp::Ordering::Equal));

    let speed_at_station = |station: f64| -> f64 {
        sorted_zones.iter().find(|z| station >= z.station).map(|z| z.speed).unwrap_or(default_speed)
    };

    resolved
        .curves
        .iter()
        .map(|curve| {
            let station = curve.pc_station;
            let speed = speed_at_station(station);
            let min_rad = min_radius_for_speed(speed);
            let radius = curve.radius;
            let is_violation = radius < min_rad;
            DesignSpeedCheckResult {
                pi_index: curve.pi_index,
                station,
                curve_radius: radius,
                required_radius: min_rad,
                design_speed: speed,
                is_violation,
                message: if is_violation {
                    format!(
                        "Curve at station {} has radius {:.1} which is less than AASHTO minimum of {} for design speed {} mph.",
                        format_station(station, 2),
                        radius,
                        min_rad,
                        speed
                    )
                } else {
                    format!("Curve at station {} satisfies design standards.", format_station(station, 2))
                },
            }
        })
        .collect()
}

/// Creates a `HorizontalAlignment` from existing polyline/line vertices.
///
/// The TS original mints the id from `Date.now()` + `Math.random()`; this
/// port uses [`thoth_spatial::create_id`] instead — a real, collision-free id
/// generator, superior to a timestamp+PRNG for this purpose.
pub fn create_alignment_from_objects(name: impl Into<String>, points: &[Point], default_radius: f64, start_station: f64) -> HorizontalAlignment {
    let n = points.len();
    let pis: Vec<AlignmentPi> = points
        .iter()
        .enumerate()
        .map(|(i, &p)| AlignmentPi {
            point: p,
            radius: if i > 0 && i < n - 1 { Some(default_radius) } else { Some(0.0) },
            spiral_in: None,
            spiral_out: None,
        })
        .collect();
    HorizontalAlignment::new(thoth_spatial::create_id("align"), name, pis, start_station)
}

/// Creates an offset alignment baseline parallel to the parent. Falls back to
/// a clone of `parent` if it cannot be resolved (mirrors the TS `return
/// parent;` fallback exactly).
pub fn create_offset_alignment(parent: &HorizontalAlignment, distance: f64, label: &str) -> HorizontalAlignment {
    let Ok(resolved) = resolve_alignment(parent) else {
        return parent.clone();
    };
    let samples = (resolved.length / 25.0).floor().max(10.0) as u32;
    let offset_pts = offset_alignment_path(&resolved, distance, samples);
    let pis: Vec<AlignmentPi> = offset_pts.into_iter().map(|p| AlignmentPi { point: p, radius: Some(0.0), spiral_in: None, spiral_out: None }).collect();
    HorizontalAlignment::new(
        format!("{}-offset-{}-{}", parent.id, if distance.signum() > 0.0 { "R" } else { "L" }, distance.abs()),
        format!("{} - {}", parent.name, label),
        pis,
        parent.start_station,
    )
}

/// Adds a widening region to an alignment offset, returning the updated
/// alignment.
pub fn add_widening_region(alignment: &HorizontalAlignment, widening: WideningRegion) -> HorizontalAlignment {
    let mut out = alignment.clone();
    out.widenings.push(widening);
    out
}

/// Exports alignment geometry and stationing to a LandXML 1.2 format string.
/// Returns an empty string if `resolved` is absent and the alignment cannot
/// be resolved (mirrors the TS `resolved ?? resolveAlignment(alignment)` then
/// `if (!res) return ""`).
pub fn export_alignment_to_land_xml(alignment: &HorizontalAlignment, resolved: Option<&ResolvedAlignment>) -> String {
    let owned;
    let res = match resolved {
        Some(r) => r,
        None => match resolve_alignment(alignment) {
            Ok(r) => {
                owned = r;
                &owned
            }
            Err(_) => return String::new(),
        },
    };

    let mut coord_geom = Vec::new();
    for elem in &res.elements {
        match elem {
            AlignmentElement::Tangent { from, to, begin_station, .. } => {
                coord_geom.push(format!(
                    "    <Line staStart=\"{:.3}\">\n      <Start>{:.4} {:.4}</Start>\n      <End>{:.4} {:.4}</End>\n    </Line>",
                    begin_station, from.x, from.y, to.x, to.y
                ));
            }
            AlignmentElement::Curve { curve, .. } => {
                coord_geom.push(format!(
                    "    <Curve staStart=\"{:.3}\" rot=\"{}\" radius=\"{:.3}\">\n      <Start>{:.4} {:.4}</Start>\n      <Center>{:.4} {:.4}</Center>\n      <End>{:.4} {:.4}</End>\n    </Curve>",
                    curve.pc_station,
                    if curve.direction == CurveDirection::Right { "cw" } else { "ccw" },
                    curve.radius,
                    curve.pc.x,
                    curve.pc.y,
                    curve.center.x,
                    curve.center.y,
                    curve.pt.x,
                    curve.pt.y
                ));
            }
            AlignmentElement::Spiral { .. } => {}
        }
    }

    format!(
        "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<LandXML xmlns=\"http://www.landxml.org/schema/LandXML-1.2\" version=\"1.2\">\n  <Alignments>\n    <Alignment name=\"{}\" staStart=\"{:.3}\" length=\"{:.3}\">\n      <CoordGeom>\n{}\n      </CoordGeom>\n    </Alignment>\n  </Alignments>\n</LandXML>",
        alignment.name,
        alignment.start_station,
        res.length,
        coord_geom.join("\n")
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;
    use thoth_spatial::distance;

    /// A baseline that runs north, then turns east through a 500-unit curve.
    ///   POB (0,0) → PI (0,−1000) → POE (1000,−1000);  R = 500 at the PI.
    /// Hand values: Δ=90°, T=500, L=500·π/2, PC=(0,−500), PT=(500,−1000).
    fn align() -> HorizontalAlignment {
        HorizontalAlignment::new(
            "a1",
            "R/L TEST",
            vec![
                AlignmentPi::simple(Point::new(0.0, 0.0)),
                AlignmentPi::curved(Point::new(0.0, -1000.0), 500.0),
                AlignmentPi::simple(Point::new(1000.0, -1000.0)),
            ],
            10_000.0, // 100+00
        )
    }

    #[test]
    fn resolve_alignment_computes_t_l_delta_and_derived_curve_data() {
        let r = resolve_alignment(&align()).unwrap();
        assert_eq!(r.curves.len(), 1);
        let c = &r.curves[0];
        assert_relative_eq!(c.delta_deg, 90.0, epsilon = 1e-6);
        assert_relative_eq!(c.tangent, 500.0, epsilon = 1e-6);
        assert_relative_eq!(c.length, 500.0 * std::f64::consts::PI / 2.0, epsilon = 1e-6);
        assert_relative_eq!(c.external, 500.0 * (1.0 / (std::f64::consts::PI / 4.0).cos() - 1.0), epsilon = 1e-6);
        assert_relative_eq!(c.middle_ordinate, 500.0 * (1.0 - (std::f64::consts::PI / 4.0).cos()), epsilon = 1e-6);
        assert_relative_eq!(c.chord, 2.0 * 500.0 * (std::f64::consts::PI / 4.0).sin(), epsilon = 1e-6);
        assert_relative_eq!(c.degree_of_curve, 5729.5779513 / 500.0, epsilon = 1e-4);
    }

    #[test]
    fn resolve_alignment_locates_pc_pt_center_and_turns_right() {
        let r = resolve_alignment(&align()).unwrap();
        let c = &r.curves[0];
        assert_relative_eq!(c.pc.x, 0.0, epsilon = 1e-6);
        assert_relative_eq!(c.pc.y, -500.0, epsilon = 1e-6);
        assert_relative_eq!(c.pt.x, 500.0, epsilon = 1e-6);
        assert_relative_eq!(c.pt.y, -1000.0, epsilon = 1e-6);
        assert_relative_eq!(c.center.x, 500.0, epsilon = 1e-6);
        assert_relative_eq!(c.center.y, -500.0, epsilon = 1e-6);
        assert_relative_eq!(distance(c.pc, c.center), 500.0, epsilon = 1e-6);
        assert_relative_eq!(distance(c.pt, c.center), 500.0, epsilon = 1e-6);
        assert_eq!(c.direction, CurveDirection::Right);
    }

    #[test]
    fn stationing_accumulates_pc_pi_pt_continuously() {
        let r = resolve_alignment(&align()).unwrap();
        let c = &r.curves[0];
        assert_relative_eq!(c.pc_station, 10_500.0, epsilon = 1e-6);
        assert_relative_eq!(c.pi_station, 11_000.0, epsilon = 1e-6);
        assert_relative_eq!(c.pt_station, 10_500.0 + 500.0 * std::f64::consts::PI / 2.0, epsilon = 1e-6);
        assert_relative_eq!(alignment_length(&r), 500.0 + 500.0 * std::f64::consts::PI / 2.0 + 500.0, epsilon = 1e-6);
        assert_relative_eq!(r.end_station, 10_000.0 + alignment_length(&r), epsilon = 1e-6);
    }

    #[test]
    fn full_stations_fall_on_100_unit_multiples_in_range() {
        let r = resolve_alignment(&align()).unwrap();
        let s = full_stations(&r, 100.0);
        assert_eq!(s[0], 10_000.0); // 100+00 is itself a full station
        assert!(s.iter().all(|v| v % 100.0 == 0.0));
        assert!(*s.last().unwrap() <= r.end_station);
    }

    #[test]
    fn point_at_station_returns_endpoints_and_pc_pt() {
        let r = resolve_alignment(&align()).unwrap();
        let p0 = point_at_station(&r, 10_000.0).unwrap().point;
        assert_relative_eq!(p0.x, 0.0, epsilon = 1e-6);
        assert_relative_eq!(p0.y, 0.0, epsilon = 1e-6);
        let p1 = point_at_station(&r, 10_500.0).unwrap().point;
        assert_relative_eq!(p1.x, 0.0, epsilon = 1e-6);
        assert_relative_eq!(p1.y, -500.0, epsilon = 1e-6);
        let p2 = point_at_station(&r, r.end_station).unwrap().point;
        assert_relative_eq!(p2.x, 1000.0, epsilon = 1e-6);
        assert_relative_eq!(p2.y, -1000.0, epsilon = 1e-6);
    }

    #[test]
    fn point_at_station_stays_on_arc_through_the_curve() {
        let r = resolve_alignment(&align()).unwrap();
        let c = &r.curves[0];
        let mid = point_at_station(&r, (c.pc_station + c.pt_station) / 2.0).unwrap().point;
        assert_relative_eq!(distance(mid, c.center), 500.0, epsilon = 1e-4);
    }

    #[test]
    fn point_at_station_heads_north_then_east() {
        let r = resolve_alignment(&align()).unwrap();
        assert_relative_eq!(point_at_station(&r, 10_100.0).unwrap().bearing, 0.0, epsilon = 1e-4);
        assert_relative_eq!(point_at_station(&r, r.end_station - 100.0).unwrap().bearing, 90.0, epsilon = 1e-4);
    }

    #[test]
    fn point_at_station_out_of_range_is_an_error() {
        let r = resolve_alignment(&align()).unwrap();
        assert!(matches!(point_at_station(&r, r.end_station + 1.0), Err(CivilError::StationOutOfRange { .. })));
    }

    #[test]
    fn station_offset_of_point_gives_zero_offset_on_tangent() {
        let r = resolve_alignment(&align()).unwrap();
        let so = station_offset_of_point(&r, Point::new(0.0, -250.0));
        assert_relative_eq!(so.station, 10_250.0, epsilon = 1e-5);
        assert_relative_eq!(so.offset, 0.0, epsilon = 1e-6);
    }

    #[test]
    fn station_offset_of_point_reports_magnitude_and_side() {
        let r = resolve_alignment(&align()).unwrap();
        let so = station_offset_of_point(&r, Point::new(15.0, -250.0));
        assert_relative_eq!(so.offset, 15.0, epsilon = 1e-6);
        assert_eq!(so.side, Side::Right);
        let left = station_offset_of_point(&r, Point::new(-15.0, -250.0));
        assert_eq!(left.side, Side::Left);
    }

    #[test]
    fn offset_alignment_path_offsets_north_running_tangent_to_the_right() {
        let straight = HorizontalAlignment::new(
            "s",
            "S",
            vec![AlignmentPi::simple(Point::new(0.0, 0.0)), AlignmentPi::simple(Point::new(0.0, -100.0))],
            0.0,
        );
        let r = resolve_alignment(&straight).unwrap();
        let right = offset_alignment_path(&r, 10.0, 20);
        for p in &right {
            assert_relative_eq!(p.x, 10.0, epsilon = 1e-6);
        }
        let left = offset_alignment_path(&r, -10.0, 20);
        for p in &left {
            assert_relative_eq!(p.x, -10.0, epsilon = 1e-6);
        }
    }

    #[test]
    fn resolve_alignment_rejects_degenerate_pi_chains() {
        let a = HorizontalAlignment::new("d", "D", vec![AlignmentPi::simple(Point::ZERO)], 0.0);
        assert!(matches!(resolve_alignment(&a), Err(CivilError::DegenerateAlignment { count: 1 })));
        let empty = HorizontalAlignment::new("e", "E", vec![], 0.0);
        assert!(matches!(resolve_alignment(&empty), Err(CivilError::DegenerateAlignment { count: 0 })));
    }

    #[test]
    fn validate_alignment_design_speed_flags_narrow_radii() {
        let a = HorizontalAlignment {
            design_speed: Some(55.0),
            ..HorizontalAlignment::new(
                "a1",
                "Fast highway",
                vec![
                    AlignmentPi::simple(Point::new(0.0, 0.0)),
                    AlignmentPi::curved(Point::new(500.0, 200.0), 250.0),
                    AlignmentPi::simple(Point::new(1000.0, 0.0)),
                ],
                0.0,
            )
        };
        let r = resolve_alignment(&a).unwrap();
        let checks = validate_alignment_design_speed(&a, &r);
        assert!(checks.iter().any(|c| c.is_violation));
    }
}
