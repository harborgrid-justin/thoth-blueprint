//! Id generation. Port of `packages/domain/src/spatial/id.ts`.
//!
//! The TypeScript original falls back to a non-cryptographic PRNG when
//! `crypto.randomUUID` is unavailable; Rust always has a real CSPRNG-backed
//! UUIDv4 generator available, so there is no fallback branch to port.

/// Generate a reasonably unique id with an optional prefix.
pub fn create_id(prefix: &str) -> String {
    format!("{prefix}_{}", uuid::Uuid::new_v4())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_id_prefixes_and_is_unique() {
        let a = create_id("el");
        let b = create_id("el");
        assert!(a.starts_with("el_"));
        assert_ne!(a, b);
    }
}
