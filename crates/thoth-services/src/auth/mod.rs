//! `@thoth/service-auth` — identity & access.
//!
//! First real implementation, replacing the TypeScript scaffold at
//! `services/auth/src/index.ts` (which only exported `__SCAFFOLD__ = true`).
//! Per `docs/ARCHITECTURE.md`, this service owns:
//!
//! - **Authentication** — registration and credential verification, with
//!   passwords hashed via Argon2id ([`hash_password`]/[`verify_password`]).
//! - **Organizations and teams** that own projects ([`Organization`],
//!   [`Team`]).
//! - **Roles and permissions** (view/comment/edit, plus member management)
//!   enforced across services ([`Role`], [`Action`], [`Membership`]).
//!
//! # Boundary
//!
//! This module owns identity and authorization; other services ask it "who
//! is this and may they do X" via [`AuthService::authorize`] rather than
//! re-implementing access control. It has no knowledge of planning
//! geometry. It also does not stand up a web server or issue
//! sessions/tokens — those are a future HTTP/gRPC transport layer's
//! concern, built on top of this service-logic layer.

mod error;
mod password;
mod service;
mod types;

pub use error::AuthError;
pub use password::{hash_password, verify_password};
pub use service::AuthService;
pub use types::{membership_id, Action, Membership, Organization, Role, Team, User};
