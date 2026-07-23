//! `@thoth/service-projects` — project lifecycle, persistence, versioning,
//! and checkpoints.
//!
//! Port of `services/projects/src/{index.ts, store.ts}`. Per
//! `docs/ARCHITECTURE.md`, this service owns:
//!
//! - **Project lifecycle** — create/rename/delete, and the current [`Site`]
//!   payload each project carries ([`ProjectsService`]).
//! - **Checkpoints** — named, restorable snapshots of a project's site (the
//!   "save a snapshot and roll back" capability carried forward from the
//!   archived app, now server-side and shared).
//! - **Review threads** — comments anchored to plan elements, for team
//!   review and public-engagement contexts.
//!
//! Persistence goes through [`crate::storage::StorageAdapter`]
//! ([`store::ProjectStore`]), exactly as `packages/storage/README.md`
//! describes.

mod error;
mod service;
mod store;
mod types;

pub use error::ProjectsError;
pub use service::{ProjectsService, ResetMode};
pub use store::{current_user, default_members, summarize, ProjectStore};
pub use types::{
    compute_site_metrics, Checkpoint, Member, Project, ProjectSummary, ProjectUser, ReviewComment,
    ReviewThread, Site, SiteMetrics, StoreSnapshot,
};
