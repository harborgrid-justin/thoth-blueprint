//! `thoth-governance` — regulatory compliance, review governance, and
//! collaboration workflow for Thoth Blueprint.
//!
//! This crate is new capability, not a port: there is no TypeScript
//! original for any of it (unlike `thoth-planning`/`thoth-services`, which
//! port `packages/domain`/`services/*`). It closes Theme 6 of
//! `docs/COMPETITIVE_GAP_ANALYSIS.md` — the ground municipal e-plan-review
//! portals, Esri's ArcGIS Hub public engagement, and enterprise PM/
//! versioning tooling cover that a CAD-shaped tool otherwise leaves to
//! spreadsheets and email:
//!
//! - [`rules`] — a parametric, jurisdiction-configurable zoning/ordinance
//!   rule engine, generalizing `thoth_planning::rules::check_compliance`'s
//!   single fixed rule into data-driven, per-jurisdiction rule sets.
//! - [`diff`] — structured plan-version comparison (added/removed/modified
//!   elements between two [`thoth_planning::Site`] snapshots) and a
//!   conservative three-way merge built on top of it.
//! - [`redline`] — a redline-comment resolution workflow: threads anchored
//!   to a plan element or coordinate, with an open/addressed/resolved/
//!   rejected state machine grouped by review round, composing with
//!   `thoth_services::collaboration::CollaborationHub`'s existing
//!   comment/resolution notifications.
//! - [`audit`] — a structured, queryable regulatory audit trail (who
//!   changed what, when, under which review round), persisted through
//!   `thoth_services::storage::StorageAdapter`.
//! - [`will_serve`] — "will-serve"/utility-capacity request tracking
//!   (requested/reviewed/approved/denied) tied to a project.
//! - [`sharing`] — scoped, revocable public read-only engagement share
//!   tokens over a site, with a view/comment access-level model reusing
//!   `thoth_services::auth`'s `Role`/`Action` vocabulary.
//!
//! # Dependencies and boundaries
//!
//! Built on top of three already-stable sibling crates, none of which this
//! crate modifies:
//!
//! - `thoth_spatial` — `ComplianceFinding`/`ComplianceSeverity` are the
//!   finding type the rule engine ([`rules`]) produces; no parallel finding
//!   type is introduced.
//! - `thoth_planning` — `Site`/`PlanElement` are what the rule engine
//!   evaluates and the diff/merge module compares; this crate reads that
//!   hierarchy, it does not extend it.
//! - `thoth_services` — every persisted concept here
//!   ([`audit::AuditLogEntry`], [`redline::RedlineThread`],
//!   [`will_serve::WillServeRequest`], [`sharing::ShareToken`]) is stored
//!   through `thoth_services::storage::StorageAdapter`, the same seam every
//!   other service in this codebase persists through; [`redline`]/
//!   [`sharing`] compose with `thoth_services::collaboration::CollaborationHub`'s
//!   public API rather than duplicating its pub/sub event bus; [`sharing`]
//!   reuses `thoth_services::auth`'s `Role`/`Action` vocabulary rather than
//!   inventing a second permission model.
//!
//! See `STATUS.md` for an honest, item-by-item mapping of the six gap-
//! analysis items above to the modules that implement them, their test
//! status, and documented scope limitations.

pub mod audit;
pub mod diff;
pub mod error;
pub mod redline;
pub mod rules;
pub mod sharing;
pub mod will_serve;

pub use error::GovernanceError;
