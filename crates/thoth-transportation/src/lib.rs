//! `thoth-transportation` — transportation and traffic-engineering domain
//! logic for Thoth Blueprint.
//!
//! This crate closes the gap between Thoth Blueprint's civil-engineering
//! core (`thoth_civil`: alignments, superelevation, vertical profiles) and
//! the transportation/traffic-engineering capability commercial platforms
//! provide — Civil 3D's roundabout/intersection design tools, AutoTURN's
//! vehicle swept-path analysis, and OpenRoads Designer's AASHTO geometric-
//! design checks. See `docs/COMPETITIVE_GAP_ANALYSIS.md`, Theme 2, for the
//! full mandate, and `STATUS.md` in this crate for an item-by-item
//! implementation/test-coverage report.
//!
//! Framework-agnostic: no React, no server framework, no database driver —
//! just `f64` math built on [`thoth_spatial`] (geometry primitives) and
//! [`thoth_civil`] (alignments, vertical profiles, superelevation runoff).
//!
//! ## Module map
//!
//! | Module | Gap item(s) | Summary |
//! |---|---|---|
//! | [`sight_distance`] | 14 | AASHTO stopping sight distance, horizontal & vertical curve checks |
//! | [`vertical_curve_design`] | 15 | AASHTO crest/sag vertical-curve minimum-length design |
//! | [`design_speed_policy`] | 16, 17 (shared) | AASHTO side-friction table, minimum radius, required superelevation |
//! | [`superelevation_policy`] | 16 | Superelevation design-speed policy compliance |
//! | [`horizontal_curve_policy`] | 17 | Minimum horizontal-curve-radius policy check |
//! | [`design_vehicle`] | 18, 19 (shared) | AASHTO design-vehicle rigid-link chain geometry |
//! | [`turning_template`] | 18 | Static intersection turning-radius templates |
//! | [`swept_path`] | 19 | Vehicle swept-path (tractrix) simulation |
//! | [`trip_generation`] | 20 | ITE trip-generation estimate |
//! | [`turnaround`] | 21 | Cul-de-sac / hammerhead turnaround geometry generator |
//! | [`roundabout`] | 22 | Roundabout inscribed-circle sizing & fastest-path check |
//! | [`pavement`] | 23 | AASHTO 1993 flexible/rigid pavement structural design |
//! | [`ada_route`] | 24 | ADA accessible-route slope/landing compliance |
//! | [`signal_warrant`] | 25 | MUTCD Warrant 1 (8-hour volume) signal warrant |

pub mod ada_route;
pub mod design_speed_policy;
pub mod design_vehicle;
pub mod error;
pub mod horizontal_curve_policy;
pub mod pavement;
pub mod roundabout;
pub mod sight_distance;
pub mod signal_warrant;
pub mod superelevation_policy;
pub mod swept_path;
pub mod trip_generation;
pub mod turnaround;
pub mod turning_template;
pub mod vertical_curve_design;

pub use error::{TransportationError, TransportationResult};
