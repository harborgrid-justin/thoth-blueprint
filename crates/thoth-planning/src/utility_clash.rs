//! 3D utility conflict/clash detection: pipe-vs-pipe and pipe-vs-structure.
//!
//! Item 42 of the Theme 4 subdivision-design-automation gap analysis. This
//! crate doesn't depend on `thoth-civil`'s real pipe-design types (bends,
//! slopes, structures with rim/invert elevations, hydraulic sizing), and per
//! the task brief this module defines a **minimal local
//! utility-segment-with-depth type** rather than reaching for that
//! dependency — [`crate::elements::Site::networks`]
//! ([`crate::civil_stub::InfrastructureNetwork`]) only carries 2D node
//! positions with no depth, so it can't represent a real 3D clash either.
//!
//! ## Scope
//! - Pipes are modeled as **straight segments** only — no bends, no
//!   vertical curves/sag. Depth is linearly interpolated between the
//!   segment's two end depths.
//! - Structures (manholes, vaults, catch basins) are modeled as vertical
//!   cylinders: a plan-view center + radius, and a top/bottom depth range.
//! - A clash is a genuine 3D conflict: horizontal proximity (accounting for
//!   pipe/structure radii and a minimum clearance) **and** vertical overlap
//!   (accounting for pipe radius and a minimum clearance) must both hold.
//!   Horizontal-only proximity (e.g. two pipes crossing in plan but at
//!   safely different depths) is not flagged.
//! - This is a screening tool for early-stage utility coordination, not a
//!   substitute for a full 3D utility model with real fitting geometry.

use serde::{Deserialize, Serialize};
use thoth_spatial::{closest_point_on_segment, distance, Point};

/// A straight utility pipe segment with linearly-varying depth.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UtilitySegment {
    pub id: String,
    /// Utility discipline, e.g. `"storm"`, `"sanitary"`, `"water"`, `"gas"`.
    pub network_kind: String,
    pub start: Point,
    pub end: Point,
    /// Depth below finished grade at `start`, plan-length units (positive
    /// down).
    pub start_depth: f64,
    /// Depth below finished grade at `end`.
    pub end_depth: f64,
    /// Outer diameter, plan units.
    pub diameter: f64,
}

impl UtilitySegment {
    /// Linearly interpolate this segment's depth at parameter `t` in `[0,1]`
    /// (`0` = `start`, `1` = `end`).
    fn depth_at(&self, t: f64) -> f64 {
        self.start_depth + (self.end_depth - self.start_depth) * t.clamp(0.0, 1.0)
    }

    /// The parameter `t` along the segment closest to `p`, in `[0,1]`.
    fn param_of_closest_point(&self, p: Point) -> f64 {
        let dx = self.end.x - self.start.x;
        let dy = self.end.y - self.start.y;
        let len_sq = dx * dx + dy * dy;
        if len_sq < 1e-12 {
            return 0.0;
        }
        (((p.x - self.start.x) * dx + (p.y - self.start.y) * dy) / len_sq).clamp(0.0, 1.0)
    }
}

/// A vertical-cylinder utility structure (manhole, vault, catch basin, ...).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UtilityStructure {
    pub id: String,
    pub position: Point,
    /// Plan-view footprint radius, plan units.
    pub radius: f64,
    /// Depth below grade to the structure's top, plan units.
    pub top_depth: f64,
    /// Depth below grade to the structure's bottom, plan units.
    pub bottom_depth: f64,
}

/// Which kind of pair a [`UtilityClash`] flags.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ClashKind {
    PipePipe,
    PipeStructure,
}

/// A detected 3D utility conflict.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UtilityClash {
    pub kind: ClashKind,
    pub a_id: String,
    pub b_id: String,
    /// Actual horizontal clear distance between the two elements' surfaces;
    /// negative means their plan-view footprints already overlap.
    pub horizontal_clearance: f64,
    /// Actual vertical clear distance at the point of closest horizontal
    /// approach; negative means their depth ranges already overlap.
    pub vertical_clearance: f64,
    pub message: String,
}

/// Minimum horizontal distance between two 2D segments (0 if they cross).
fn segment_segment_distance(a1: Point, a2: Point, b1: Point, b2: Point) -> f64 {
    if segments_intersect(a1, a2, b1, b2) {
        return 0.0;
    }
    let d1 = distance(a1, closest_point_on_segment(a1, b1, b2));
    let d2 = distance(a2, closest_point_on_segment(a2, b1, b2));
    let d3 = distance(b1, closest_point_on_segment(b1, a1, a2));
    let d4 = distance(b2, closest_point_on_segment(b2, a1, a2));
    d1.min(d2).min(d3).min(d4)
}

fn orientation(a: Point, b: Point, c: Point) -> f64 {
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

fn on_segment(a: Point, b: Point, p: Point) -> bool {
    p.x >= a.x.min(b.x) - 1e-9
        && p.x <= a.x.max(b.x) + 1e-9
        && p.y >= a.y.min(b.y) - 1e-9
        && p.y <= a.y.max(b.y) + 1e-9
}

/// Standard orientation-based segment intersection test (handles the
/// collinear-overlap edge cases explicitly).
fn segments_intersect(a1: Point, a2: Point, b1: Point, b2: Point) -> bool {
    let o1 = orientation(a1, a2, b1);
    let o2 = orientation(a1, a2, b2);
    let o3 = orientation(b1, b2, a1);
    let o4 = orientation(b1, b2, a2);

    if ((o1 > 0.0) != (o2 > 0.0)) && ((o3 > 0.0) != (o4 > 0.0)) && o1 != 0.0 && o2 != 0.0 {
        return true;
    }
    (o1 == 0.0 && on_segment(a1, a2, b1))
        || (o2 == 0.0 && on_segment(a1, a2, b2))
        || (o3 == 0.0 && on_segment(b1, b2, a1))
        || (o4 == 0.0 && on_segment(b1, b2, a2))
}

/// Detect pairwise 3D clashes between straight pipe segments.
///
/// For each pair, the horizontal clearance is the plan-view gap between
/// their centerlines minus both pipes' radii; if that is below
/// `min_horizontal_clearance`, the vertical clearance is checked at the
/// point of closest horizontal approach (each pipe's interpolated depth
/// minus both radii); a clash is only reported when both clearances are
/// insufficient.
pub fn detect_pipe_pipe_clashes(
    segments: &[UtilitySegment],
    min_horizontal_clearance: f64,
    min_vertical_clearance: f64,
) -> Vec<UtilityClash> {
    let mut clashes = Vec::new();
    for i in 0..segments.len() {
        for j in (i + 1)..segments.len() {
            let a = &segments[i];
            let b = &segments[j];
            let center_gap = segment_segment_distance(a.start, a.end, b.start, b.end);
            let horizontal_clearance = center_gap - a.diameter / 2.0 - b.diameter / 2.0;
            if horizontal_clearance >= min_horizontal_clearance {
                continue;
            }

            // Depth at each pipe's point of closest approach to the other's
            // centerline (a reasonable proxy for "where they'd conflict").
            let t_a = a.param_of_closest_point(closest_point_on_segment(
                midpoint(a.start, a.end),
                b.start,
                b.end,
            ));
            let t_b = b.param_of_closest_point(closest_point_on_segment(
                midpoint(b.start, b.end),
                a.start,
                a.end,
            ));
            let depth_a = a.depth_at(t_a);
            let depth_b = b.depth_at(t_b);
            let vertical_gap = (depth_a - depth_b).abs();
            let vertical_clearance = vertical_gap - a.diameter / 2.0 - b.diameter / 2.0;
            if vertical_clearance < min_vertical_clearance {
                clashes.push(UtilityClash {
                    kind: ClashKind::PipePipe,
                    a_id: a.id.clone(),
                    b_id: b.id.clone(),
                    horizontal_clearance,
                    vertical_clearance,
                    message: format!(
                        "{} ({}) and {} ({}) conflict: horizontal clearance {:.2}, vertical clearance {:.2}.",
                        a.id, a.network_kind, b.id, b.network_kind, horizontal_clearance, vertical_clearance
                    ),
                });
            }
        }
    }
    clashes
}

/// Detect pipe-vs-structure 3D clashes.
pub fn detect_pipe_structure_clashes(
    segments: &[UtilitySegment],
    structures: &[UtilityStructure],
    min_horizontal_clearance: f64,
    min_vertical_clearance: f64,
) -> Vec<UtilityClash> {
    let mut clashes = Vec::new();
    for pipe in segments {
        for structure in structures {
            let closest = closest_point_on_segment(structure.position, pipe.start, pipe.end);
            let center_gap = distance(structure.position, closest);
            let horizontal_clearance = center_gap - pipe.diameter / 2.0 - structure.radius;
            if horizontal_clearance >= min_horizontal_clearance {
                continue;
            }

            let t = pipe.param_of_closest_point(structure.position);
            let pipe_depth = pipe.depth_at(t);
            let pipe_top = pipe_depth - pipe.diameter / 2.0;
            let pipe_bottom = pipe_depth + pipe.diameter / 2.0;
            // Vertical gap between the two depth ranges (0 if they overlap).
            let vertical_gap = if pipe_bottom < structure.top_depth {
                structure.top_depth - pipe_bottom
            } else if structure.bottom_depth < pipe_top {
                pipe_top - structure.bottom_depth
            } else {
                0.0
            };
            let vertical_clearance = vertical_gap;
            if vertical_clearance < min_vertical_clearance {
                clashes.push(UtilityClash {
                    kind: ClashKind::PipeStructure,
                    a_id: pipe.id.clone(),
                    b_id: structure.id.clone(),
                    horizontal_clearance,
                    vertical_clearance,
                    message: format!(
                        "Pipe {} conflicts with structure {}: horizontal clearance {:.2}, vertical clearance {:.2}.",
                        pipe.id, structure.id, horizontal_clearance, vertical_clearance
                    ),
                });
            }
        }
    }
    clashes
}

fn midpoint(a: Point, b: Point) -> Point {
    Point::new((a.x + b.x) / 2.0, (a.y + b.y) / 2.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pipe(
        id: &str,
        x0: f64,
        y0: f64,
        x1: f64,
        y1: f64,
        depth: f64,
        diameter: f64,
    ) -> UtilitySegment {
        UtilitySegment {
            id: id.to_string(),
            network_kind: "storm".to_string(),
            start: Point::new(x0, y0),
            end: Point::new(x1, y1),
            start_depth: depth,
            end_depth: depth,
            diameter,
        }
    }

    #[test]
    fn crossing_pipes_at_the_same_depth_clash() {
        let a = pipe("storm-1", 0.0, 5.0, 10.0, 5.0, 6.0, 1.0);
        let b = pipe("sanitary-1", 5.0, 0.0, 5.0, 10.0, 6.0, 1.0);
        let clashes = detect_pipe_pipe_clashes(&[a, b], 1.0, 1.0);
        assert_eq!(clashes.len(), 1);
        assert_eq!(clashes[0].kind, ClashKind::PipePipe);
    }

    #[test]
    fn crossing_pipes_at_safely_different_depths_do_not_clash() {
        let a = pipe("storm-1", 0.0, 5.0, 10.0, 5.0, 2.0, 0.5);
        let b = pipe("sanitary-1", 5.0, 0.0, 5.0, 10.0, 8.0, 0.5);
        let clashes = detect_pipe_pipe_clashes(&[a, b], 1.0, 1.0);
        assert!(clashes.is_empty());
    }

    #[test]
    fn parallel_pipes_far_apart_in_plan_do_not_clash() {
        let a = pipe("storm-1", 0.0, 0.0, 100.0, 0.0, 6.0, 1.0);
        let b = pipe("sanitary-1", 0.0, 50.0, 100.0, 50.0, 6.0, 1.0);
        let clashes = detect_pipe_pipe_clashes(&[a, b], 1.0, 1.0);
        assert!(clashes.is_empty());
    }

    #[test]
    fn pipe_too_close_to_a_structure_at_conflicting_depth_clashes() {
        let pipe_seg = pipe("storm-1", 0.0, 0.0, 20.0, 0.0, 5.0, 1.0);
        let structure = UtilityStructure {
            id: "mh-1".to_string(),
            position: Point::new(10.0, 0.2),
            radius: 0.6,
            top_depth: 4.0,
            bottom_depth: 6.0,
        };
        let clashes = detect_pipe_structure_clashes(&[pipe_seg], &[structure], 0.3, 0.3);
        assert_eq!(clashes.len(), 1);
        assert_eq!(clashes[0].kind, ClashKind::PipeStructure);
    }

    #[test]
    fn pipe_near_a_structure_but_well_below_it_does_not_clash() {
        let pipe_seg = pipe("storm-1", 0.0, 0.0, 20.0, 0.0, 12.0, 1.0);
        let structure = UtilityStructure {
            id: "mh-1".to_string(),
            position: Point::new(10.0, 0.2),
            radius: 0.6,
            top_depth: 1.0,
            bottom_depth: 3.0,
        };
        let clashes = detect_pipe_structure_clashes(&[pipe_seg], &[structure], 0.3, 0.3);
        assert!(clashes.is_empty());
    }
}
