//! Wire types for `@thoth/service-projects`. Port of the interfaces in
//! `services/projects/src/store.ts`.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::auth::Role;
use crate::storage::StorageRecord;

/// A plan payload. `packages/domain`'s `Site` (regions, parcels, lots,
/// zones, land uses, ...) is owned by `thoth-planning`, which is not yet
/// ported — this service persists and versions whatever a caller hands it
/// without interpreting its shape, exactly as `packages/storage` treats
/// every record as opaque data. Once `thoth-planning` lands a typed `Site`,
/// this alias becomes that type with no change to the persistence logic
/// below (`Project`/`Checkpoint` don't inspect `site` beyond round-tripping
/// it, except [`compute_site_metrics`], which degrades gracefully — see its
/// docs).
pub type Site = serde_json::Value;

/// A display-only user reference attached to project membership and review
/// comments. Deliberately distinct from [`crate::auth::User`]: that type
/// carries a password hash and has no business appearing in a member list
/// or a comment's byline.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectUser {
    pub id: String,
    pub name: String,
    pub email: String,
    pub color: String,
}

/// A user's role on one project. The TS original typed `role` as a bare
/// `string`; reusing [`crate::auth::Role`] here is a deliberate, faithful
/// strengthening — the set of roles is the same one `@thoth/service-auth`
/// defines, so there is no reason for a second, stringly-typed vocabulary.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Member {
    pub user: ProjectUser,
    pub role: Role,
}

/// A planning project: metadata plus the current [`Site`] payload.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub site_area_acres: f64,
    pub lot_count: u32,
    pub members: Vec<Member>,
    pub site: Site,
}

impl StorageRecord for Project {
    fn id(&self) -> &str {
        &self.id
    }
}

/// A project summary — everything [`Project`] has except the (potentially
/// large) `site` payload. Returned by project-listing operations so callers
/// don't pay to transfer full plan geometry just to render a project card.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub site_area_acres: f64,
    pub lot_count: u32,
    pub members: Vec<Member>,
}

/// A named, restorable snapshot of a project's site at a point in time —
/// the "save a snapshot and roll back" capability carried forward from the
/// archived app, now server-side and shared.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Checkpoint {
    pub id: String,
    pub project_id: String,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
    pub author_name: String,
    pub site: Site,
}

impl StorageRecord for Checkpoint {
    fn id(&self) -> &str {
        &self.id
    }
}

/// A single message within a [`ReviewThread`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewComment {
    pub id: String,
    pub author_name: String,
    pub author_color: String,
    pub body: String,
    pub created_at: DateTime<Utc>,
}

/// A review conversation anchored to a plan element (or general, if
/// `element_id` is `None`), for team review and public-engagement
/// workflows.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewThread {
    pub id: String,
    pub project_id: String,
    pub element_id: Option<String>,
    pub resolved: bool,
    pub comments: Vec<ReviewComment>,
}

impl StorageRecord for ReviewThread {
    fn id(&self) -> &str {
        &self.id
    }
}

/// The three collections this service persists, loaded/saved together.
/// Mirrors the TS `Store` interface.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoreSnapshot {
    pub projects: Vec<Project>,
    pub checkpoints: Vec<Checkpoint>,
    pub threads: Vec<ReviewThread>,
}

/// Area and lot-count metrics for a [`Site`].
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SiteMetrics {
    pub site_area: f64,
    pub lot_count: u32,
}

/// Compute area/lot-count metrics for a site payload.
///
/// A faithful port of `computeSiteMetrics` requires the full planning
/// element hierarchy (`thoth-planning`), which doesn't exist yet. Until
/// then, this reads `siteAreaAcres`/`lotCount` directly off the JSON
/// payload if present (as a temporary compatibility path for an already
/// computed value) and otherwise reports zero — degrading gracefully rather
/// than guessing at geometry it can't parse. Replace with a real call into
/// `thoth_planning::compute_site_metrics` once that crate lands.
pub fn compute_site_metrics(site: &Site) -> SiteMetrics {
    SiteMetrics {
        site_area: site
            .get("siteAreaAcres")
            .and_then(serde_json::Value::as_f64)
            .unwrap_or(0.0),
        lot_count: site
            .get("lotCount")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(0) as u32,
    }
}
