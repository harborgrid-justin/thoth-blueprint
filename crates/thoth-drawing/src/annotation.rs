//! Annotation and drafting symbology — the text, leaders, tags, and reference
//! marks that turn geometry into a readable sheet: text styles, keynotes and
//! keynote tags, structural **column grids** with bubbled gridlines, **revision
//! clouds** with delta tags, and room/door/window tags. Pure data plus small
//! geometry helpers; the renderer draws the bubbles, clouds, and leaders.
//!
//! Port of `packages/domain/src/drawing/annotation.ts`.

use thoth_spatial::{add, distance, normalize, scale, subtract, Point, Polygon};

/// Text justification.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TextJustify {
    Left,
    Center,
    Right,
}

/// A named text style.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct TextStyle {
    pub id: String,
    pub label: String,
    /// Text height in paper millimetres.
    pub height: f64,
    pub font: String,
    pub justify: TextJustify,
    #[serde(default)]
    pub bold: bool,
}

/// A leader: a line from an arrow to a text landing.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct Leader {
    pub id: String,
    /// Points from the arrow tip to the text landing (model space).
    pub points: Vec<Point>,
    pub text: String,
    pub arrow: LeaderArrow,
}

/// The terminator drawn at a leader's arrow end.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LeaderArrow {
    Arrow,
    Dot,
    None,
}

/// A project keynote (a numbered note referenced by tags).
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct Keynote {
    pub id: String,
    /// Keynote number/code, e.g. "A1" or "07".
    pub number: String,
    pub text: String,
}

/// A keynote tag placed on the drawing, optionally with a leader.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct KeynoteTag {
    pub id: String,
    pub keynote_id: String,
    pub position: Point,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub leader_to: Option<Point>,
}

/// Which end(s) of a gridline carry a bubble.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum BubbleEnds {
    Start,
    End,
    Both,
}

/// Whether a gridline's bubble label reads as a digit or a letter axis.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GridAxisKind {
    Digit,
    Letter,
}

/// A structural/column grid line with a bubble label at one or both ends.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct GridLine {
    pub id: String,
    /// Bubble label — digits for one axis, letters for the other.
    pub label: String,
    pub kind: GridAxisKind,
    /// The gridline in model space.
    pub from: Point,
    pub to: Point,
    /// Which ends carry a bubble.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bubbles: Option<BubbleEnds>,
}

/// The computed placement of a grid bubble.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct GridBubble {
    pub center: Point,
    /// Direction from the line end outward to the bubble, unit vector.
    pub dir: Point,
    pub label: String,
}

/// A revision cloud enclosing changed content, tagged with a delta number.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct RevisionCloud {
    pub id: String,
    pub delta: i32,
    /// The cloud boundary in model space (arcs bulge outward along it).
    pub boundary: Polygon,
}

/// A room tag (name + number + optional area) placed at a point.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct RoomTag {
    pub id: String,
    pub room_id: String,
    pub position: Point,
}

/// Whether an opening tag marks a door or a window.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OpeningKind {
    Door,
    Window,
}

/// A door/window tag (mark bubble) placed at a point.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct OpeningTag {
    pub id: String,
    pub opening_id: String,
    pub kind: OpeningKind,
    pub position: Point,
}

/// Standard text styles (title, heading, note, tag).
pub fn text_styles() -> Vec<TextStyle> {
    vec![
        TextStyle {
            id: "title".to_string(),
            label: "Sheet title".to_string(),
            height: 5.0,
            font: "sans-serif".to_string(),
            justify: TextJustify::Left,
            bold: true,
        },
        TextStyle {
            id: "heading".to_string(),
            label: "Heading".to_string(),
            height: 3.5,
            font: "sans-serif".to_string(),
            justify: TextJustify::Left,
            bold: true,
        },
        TextStyle {
            id: "note".to_string(),
            label: "Note".to_string(),
            height: 2.5,
            font: "sans-serif".to_string(),
            justify: TextJustify::Left,
            bold: false,
        },
        TextStyle {
            id: "tag".to_string(),
            label: "Tag".to_string(),
            height: 2.5,
            font: "sans-serif".to_string(),
            justify: TextJustify::Center,
            bold: true,
        },
    ]
}

/// Bubble placements for a gridline, offset `gap` model units beyond each
/// tagged end along the line direction.
pub fn grid_bubble_geometry(line: &GridLine, gap: f64) -> Vec<GridBubble> {
    let dir = normalize(subtract(line.to, line.from));
    let which = line.bubbles.unwrap_or(BubbleEnds::Both);
    let mut out = Vec::new();
    if matches!(which, BubbleEnds::Start | BubbleEnds::Both) {
        out.push(GridBubble {
            center: add(line.from, scale(dir, -gap)),
            dir: scale(dir, -1.0),
            label: line.label.clone(),
        });
    }
    if matches!(which, BubbleEnds::End | BubbleEnds::Both) {
        out.push(GridBubble { center: add(line.to, scale(dir, gap)), dir, label: line.label.clone() });
    }
    out
}

/// Sample a revision-cloud boundary into scalloped arc bumps — returns the
/// bump apex points between consecutive vertices so a renderer can draw the
/// arcs.
pub fn revision_cloud_bumps(cloud: &RevisionCloud, bump_size: f64) -> Vec<Point> {
    let b = &cloud.boundary;
    let mut apexes = Vec::new();
    let n = b.len();
    if n == 0 {
        return apexes;
    }
    for i in 0..n {
        let a = b[i];
        let c = b[(i + 1) % n];
        let len = distance(a, c);
        let count = ((len / bump_size).round() as i64).max(1);
        let dir = normalize(subtract(c, a));
        let nrm = Point::new(-dir.y, dir.x);
        for j in 0..count {
            let t = (j as f64 + 0.5) / count as f64;
            let mid = add(a, scale(dir, len * t));
            apexes.push(add(mid, scale(nrm, bump_size * 0.5)));
        }
    }
    apexes
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn text_styles_has_four_standard_entries() {
        let styles = text_styles();
        assert_eq!(styles.len(), 4);
        assert!(styles.iter().any(|s| s.id == "title" && s.bold));
    }

    #[test]
    fn grid_bubble_geometry_defaults_to_both_ends() {
        let line = GridLine {
            id: "g1".to_string(),
            label: "A".to_string(),
            kind: GridAxisKind::Letter,
            from: Point::new(0.0, 0.0),
            to: Point::new(10.0, 0.0),
            bubbles: None,
        };
        let bubbles = grid_bubble_geometry(&line, 2.0);
        assert_eq!(bubbles.len(), 2);
        assert_relative_eq!(bubbles[0].center.x, -2.0, epsilon = 1e-9);
        assert_relative_eq!(bubbles[1].center.x, 12.0, epsilon = 1e-9);
    }

    #[test]
    fn grid_bubble_geometry_respects_start_only() {
        let line = GridLine {
            id: "g1".to_string(),
            label: "1".to_string(),
            kind: GridAxisKind::Digit,
            from: Point::new(0.0, 0.0),
            to: Point::new(10.0, 0.0),
            bubbles: Some(BubbleEnds::Start),
        };
        let bubbles = grid_bubble_geometry(&line, 2.0);
        assert_eq!(bubbles.len(), 1);
    }

    #[test]
    fn revision_cloud_bumps_produces_at_least_one_bump_per_edge() {
        let cloud = RevisionCloud {
            id: "rc1".to_string(),
            delta: 1,
            boundary: vec![Point::new(0.0, 0.0), Point::new(10.0, 0.0), Point::new(10.0, 10.0), Point::new(0.0, 10.0)],
        };
        let bumps = revision_cloud_bumps(&cloud, 6.0);
        // 4 edges of length 10, bump size 6 -> round(10/6)=2 bumps per edge
        assert_eq!(bumps.len(), 8);
    }

    #[test]
    fn revision_cloud_bumps_of_empty_boundary_is_empty() {
        let cloud = RevisionCloud { id: "rc2".to_string(), delta: 1, boundary: vec![] };
        assert!(revision_cloud_bumps(&cloud, 6.0).is_empty());
    }
}
