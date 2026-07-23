//! Persistence for `@thoth/service-projects`. Port of
//! `services/projects/src/store.ts`.

use chrono::{Duration, Utc};
use serde_json::json;
use thoth_spatial::create_id;

use super::types::{
    compute_site_metrics, Checkpoint, Member, Project, ProjectSummary, ProjectUser, ReviewThread,
    Site, StoreSnapshot,
};
use super::ProjectsError;
use crate::auth::Role;
use crate::storage::{StorageAdapter, StorageError};

const PROJECTS: &str = "projects";
const CHECKPOINTS: &str = "checkpoints";
const THREADS: &str = "threads";

/// The signed-in user in this single-tenant-per-process demo seed —
/// mirrors the TS `CURRENT_USER` constant. A future auth-integrated
/// deployment resolves this from the authenticated request instead of a
/// constant.
pub fn current_user() -> ProjectUser {
    ProjectUser {
        id: "user-me".to_string(),
        name: "You".to_string(),
        email: "planner@thoth.dev".to_string(),
        color: "#0ea5e9".to_string(),
    }
}

fn teammates() -> [ProjectUser; 2] {
    [
        ProjectUser {
            id: "user-amaya".to_string(),
            name: "Amaya Okonkwo".to_string(),
            email: "amaya@city.gov".to_string(),
            color: "#f59e0b".to_string(),
        },
        ProjectUser {
            id: "user-liang".to_string(),
            name: "Liang Wei".to_string(),
            email: "liang@studio.co".to_string(),
            color: "#ec4899".to_string(),
        },
    ]
}

/// The default member roster attached to a newly seeded/created project:
/// the current user as owner, plus two sample teammates.
pub fn default_members() -> Vec<Member> {
    let [amaya, liang] = teammates();
    vec![
        Member {
            user: current_user(),
            role: Role::Owner,
        },
        Member {
            user: amaya,
            role: Role::Editor,
        },
        Member {
            user: liang,
            role: Role::Commenter,
        },
    ]
}

/// Project metadata plus computed metrics, omitting the `site` payload.
pub fn summarize(project: &Project) -> ProjectSummary {
    let metrics = compute_site_metrics(&project.site);
    ProjectSummary {
        id: project.id.clone(),
        name: project.name.clone(),
        description: project.description.clone(),
        created_at: project.created_at,
        updated_at: project.updated_at,
        site_area_acres: metrics.site_area,
        lot_count: metrics.lot_count,
        members: project.members.clone(),
    }
}

/// A minimal, structurally-tagged placeholder site — see [`Site`]'s docs
/// for why this service doesn't construct a real planning `Site`.
fn placeholder_site(name: &str, template: &str) -> Site {
    json!({ "name": name, "template": template, "elements": [] })
}

/// Seed data: three sample projects, matching
/// `services/projects/src/store.ts`'s `seedStore` (project names and
/// relative timestamps are faithful; the `Site` payloads are the
/// [`placeholder_site`] stand-in described above).
fn seed_store() -> StoreSnapshot {
    let now = Utc::now();
    let projects = vec![
        Project {
            id: create_id("proj"),
            name: "Willow Creek Subdivision".to_string(),
            description:
                "48-unit single-family subdivision feasibility study with a neighborhood park."
                    .to_string(),
            created_at: now - Duration::hours(26),
            updated_at: now - Duration::minutes(90),
            site_area_acres: 0.0,
            lot_count: 0,
            members: default_members(),
            site: placeholder_site("Willow Creek Subdivision", "subdivision"),
        },
        Project {
            id: create_id("proj"),
            name: "Riverside Mixed-Use District".to_string(),
            description:
                "Downtown district plan exploring land-use allocation and FAR envelopes."
                    .to_string(),
            created_at: now - Duration::hours(72),
            updated_at: now - Duration::hours(5),
            site_area_acres: 0.0,
            lot_count: 0,
            members: default_members(),
            site: placeholder_site("Riverside Mixed-Use District", "district"),
        },
        Project {
            id: create_id("proj"),
            name: "Kestrel Ridge Estate".to_string(),
            description: "A single-household estate at landscape scale — regions, terrain, forest, and a reservoir.".to_string(),
            created_at: now - Duration::hours(100),
            updated_at: now - Duration::hours(12),
            site_area_acres: 0.0,
            lot_count: 0,
            members: default_members(),
            site: placeholder_site("Kestrel Ridge Estate", "estate"),
        },
    ];

    StoreSnapshot {
        projects,
        checkpoints: Vec::new(),
        threads: Vec::new(),
    }
}

/// Persistence for projects, checkpoints, and review threads, through the
/// platform's [`StorageAdapter`] seam (SQLite by default — see
/// `packages/storage/README.md` for how this swaps to an enterprise
/// backend).
pub struct ProjectStore<A: StorageAdapter> {
    storage: A,
}

impl<A: StorageAdapter> ProjectStore<A> {
    /// Wrap a storage backend. Any [`StorageAdapter`] works — memory for
    /// tests, SQLite for local/small deployments, Postgres for an
    /// enterprise backend.
    pub fn new(storage: A) -> Self {
        Self { storage }
    }

    async fn persist(&self, store: &StoreSnapshot) -> Result<(), ProjectsError> {
        self.storage
            .transaction(move || async move {
                self.storage.clear(PROJECTS).await?;
                self.storage.clear(CHECKPOINTS).await?;
                self.storage.clear(THREADS).await?;
                for project in &store.projects {
                    self.storage.put(PROJECTS, project.clone()).await?;
                }
                for checkpoint in &store.checkpoints {
                    self.storage.put(CHECKPOINTS, checkpoint.clone()).await?;
                }
                for thread in &store.threads {
                    self.storage.put(THREADS, thread.clone()).await?;
                }
                Ok::<(), StorageError>(())
            })
            .await?;
        Ok(())
    }

    /// Load the full store, seeding three sample projects on first run (an
    /// empty `projects` collection is the "never initialized" signal, same
    /// as the TS original).
    pub async fn load_store(&self) -> Result<StoreSnapshot, ProjectsError> {
        let projects: Vec<Project> = self.storage.list(PROJECTS).await?;
        if projects.is_empty() {
            let seeded = seed_store();
            self.persist(&seeded).await?;
            return Ok(seeded);
        }

        let checkpoints: Vec<Checkpoint> = self.storage.list(CHECKPOINTS).await?;
        let threads: Vec<ReviewThread> = self.storage.list(THREADS).await?;
        Ok(StoreSnapshot {
            projects,
            checkpoints,
            threads,
        })
    }

    /// Persist a full store snapshot, replacing every existing record in
    /// all three collections.
    pub async fn write_store(&self, store: &StoreSnapshot) -> Result<(), ProjectsError> {
        self.persist(store).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::MemoryStorageAdapter;

    fn store() -> ProjectStore<MemoryStorageAdapter> {
        ProjectStore::new(MemoryStorageAdapter::new())
    }

    #[tokio::test]
    async fn seeds_store_on_initial_load_if_none_exists() {
        let db = store();
        let snapshot = db.load_store().await.unwrap();

        assert_eq!(snapshot.projects.len(), 3);
        assert_eq!(snapshot.checkpoints.len(), 0);
        assert_eq!(snapshot.threads.len(), 0);

        let names: Vec<&str> = snapshot.projects.iter().map(|p| p.name.as_str()).collect();
        assert!(names.contains(&"Willow Creek Subdivision"));
        assert!(names.contains(&"Riverside Mixed-Use District"));
        assert!(names.contains(&"Kestrel Ridge Estate"));
    }

    #[tokio::test]
    async fn does_not_reseed_once_projects_already_exist() {
        let db = store();
        let first = db.load_store().await.unwrap();
        db.write_store(&StoreSnapshot {
            projects: vec![first.projects[0].clone()],
            checkpoints: first.checkpoints.clone(),
            threads: first.threads.clone(),
        })
        .await
        .unwrap();

        let second = db.load_store().await.unwrap();
        assert_eq!(second.projects.len(), 1);
    }

    #[tokio::test]
    async fn persists_changes_across_load_write_calls() {
        let db = store();
        let mut snapshot = db.load_store().await.unwrap();
        let original_count = snapshot.projects.len();

        let new_project = Project {
            id: "proj-test-123".to_string(),
            name: "Test persistence project".to_string(),
            description: "Unit testing store persistence".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            site_area_acres: 10.0,
            lot_count: 5,
            members: default_members(),
            site: snapshot.projects[0].site.clone(),
        };

        snapshot.projects.push(new_project);
        db.write_store(&snapshot).await.unwrap();

        let reloaded = db.load_store().await.unwrap();
        assert_eq!(reloaded.projects.len(), original_count + 1);

        let saved = reloaded.projects.iter().find(|p| p.id == "proj-test-123");
        assert!(saved.is_some());
        assert_eq!(saved.unwrap().name, "Test persistence project");
    }

    #[tokio::test]
    async fn round_trips_checkpoints_and_review_threads() {
        let db = store();
        let mut snapshot = db.load_store().await.unwrap();
        let project = snapshot.projects[0].clone();

        snapshot.checkpoints.push(Checkpoint {
            id: "cp-1".to_string(),
            project_id: project.id.clone(),
            name: "Before rezoning".to_string(),
            note: None,
            created_at: Utc::now(),
            author_name: "You".to_string(),
            site: project.site.clone(),
        });
        snapshot.threads.push(ReviewThread {
            id: "thrd-1".to_string(),
            project_id: project.id.clone(),
            element_id: None,
            resolved: false,
            comments: Vec::new(),
        });
        db.write_store(&snapshot).await.unwrap();

        let reloaded = db.load_store().await.unwrap();
        assert!(reloaded.checkpoints.iter().any(|c| c.id == "cp-1"));
        assert!(reloaded.threads.iter().any(|t| t.id == "thrd-1"));
    }

    #[tokio::test]
    async fn generates_correct_project_summaries() {
        let db = store();
        let snapshot = db.load_store().await.unwrap();
        let project = &snapshot.projects[0];

        let summary = summarize(project);
        assert_eq!(summary.id, project.id);
        assert_eq!(summary.name, project.name);
        assert_eq!(summary.members.len(), project.members.len());
        // ProjectSummary has no `site` field at all — the exclusion is
        // structural (enforced by the type), not a runtime check.
    }
}
