//! A tiny in-process handle registry, shared by every stateful binding
//! module ([`crate::auth`], [`crate::collaboration`], [`crate::storage`]).
//!
//! # Why handles, not napi-rs classes
//!
//! `thoth-services`' stateful types (`AuthService<A>`, `CollaborationHub`,
//! `PostgresStorageAdapter`) expose `async fn(&self, ...)` methods. A
//! napi-rs class with `&self` async methods needs the JS object kept alive
//! (and the borrow's lifetime soundly extended) for as long as its returned
//! `Promise` is pending — napi-rs supports this, but it is one of the more
//! failure-prone corners of the FFI boundary (a class instance dropped by
//! JS garbage collection while a Rust future still borrows it is a
//! use-after-free class of bug, not merely a wrong-answer one). This module
//! sidesteps that entirely: every stateful value lives in a process-wide
//! [`Registry`] behind an [`std::sync::Arc`], and every `#[napi]` export
//! below takes a plain `u32` handle, looks up an owned `Arc` clone, and
//! `.await`s methods on *that* — no borrow ever crosses an await point, so
//! there is no lifetime to get wrong. The JS-side wrapper classes in
//! `services/auth`/`services/collaboration` give callers the same
//! ergonomic, object-oriented API; this module is what makes the native
//! side of that safe without leaning on napi-rs' most delicate feature.
//!
//! A handle that's already been closed (removed from the registry) produces
//! a catchable [`napi::Error`] on next use — not a panic, not undefined
//! behavior — the same "stale handle" experience a closed file descriptor
//! or database connection gives.

use std::collections::HashMap;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};

use napi::bindgen_prelude::{Error, Status};

/// A process-wide table of live `T` instances, keyed by an opaque handle
/// minted on insert. `T` is wrapped in `Arc` so callers can clone out an
/// owned reference and use it across an `.await` without holding the
/// registry's lock.
pub(crate) struct Registry<T> {
    next_handle: AtomicU32,
    entries: Mutex<HashMap<u32, Arc<T>>>,
}

impl<T> Registry<T> {
    pub(crate) fn new() -> Self {
        Self {
            next_handle: AtomicU32::new(1),
            entries: Mutex::new(HashMap::new()),
        }
    }

    /// Store `value`, returning a fresh handle that never collides with a
    /// still-live entry (handles are never reused within a process
    /// lifetime, even across `remove` calls, so a stale handle from a
    /// closed client can never silently resolve to an unrelated new one).
    pub(crate) fn insert(&self, value: T) -> u32 {
        let handle = self.next_handle.fetch_add(1, Ordering::Relaxed);
        self.entries
            .lock()
            .expect("thoth-napi registry mutex poisoned")
            .insert(handle, Arc::new(value));
        handle
    }

    /// Look up a live entry by handle, cloning out the `Arc`.
    pub(crate) fn get(&self, handle: u32) -> Option<Arc<T>> {
        self.entries
            .lock()
            .expect("thoth-napi registry mutex poisoned")
            .get(&handle)
            .cloned()
    }

    /// Remove an entry, returning it if it was present. Any `Arc` clones
    /// already in flight (an in-progress `.await` on this handle) keep the
    /// value alive until they finish; only new lookups by this handle fail.
    pub(crate) fn remove(&self, handle: u32) -> Option<Arc<T>> {
        self.entries
            .lock()
            .expect("thoth-napi registry mutex poisoned")
            .remove(&handle)
    }
}

/// A uniform "handle not found" error for every binding module: the handle
/// was never issued, or [`Registry::remove`] already closed it.
pub(crate) fn handle_not_found(kind: &str, handle: u32) -> Error {
    Error::new(
        Status::InvalidArg,
        format!(
            "{kind} handle {handle} does not exist — it was never created, \
             or has already been closed"
        ),
    )
}

/// Convert any [`std::fmt::Display`]-able service error into a catchable
/// `napi::Error`. Every fallible `thoth-services` call funnels through this
/// (or a more specific mapping) rather than ever unwrapping/panicking
/// across the FFI boundary — see the crate's module docs.
pub(crate) fn to_napi_error<E: std::fmt::Display>(err: E) -> Error {
    Error::new(Status::GenericFailure, err.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn insert_get_and_remove_round_trip() {
        let registry: Registry<String> = Registry::new();
        let handle = registry.insert("hello".to_string());

        let got = registry.get(handle).expect("just-inserted handle");
        assert_eq!(*got, "hello");

        let removed = registry.remove(handle).expect("present entry");
        assert_eq!(*removed, "hello");
        assert!(registry.get(handle).is_none());
    }

    #[test]
    fn handles_are_never_reused_after_removal() {
        let registry: Registry<u32> = Registry::new();
        let first = registry.insert(1);
        registry.remove(first);
        let second = registry.insert(2);
        assert_ne!(first, second);
        assert!(registry.get(first).is_none());
        assert_eq!(*registry.get(second).unwrap(), 2);
    }

    #[test]
    fn distinct_instances_get_distinct_handles() {
        let registry: Registry<u32> = Registry::new();
        let a = registry.insert(10);
        let b = registry.insert(20);
        assert_ne!(a, b);
        assert_eq!(*registry.get(a).unwrap(), 10);
        assert_eq!(*registry.get(b).unwrap(), 20);
    }
}
