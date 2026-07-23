//! Placeholder — implemented by the thoth-bindings/tooling migration agent.
//!
//! Exposes the Rust domain crates to `apps/web` (via `wasm-bindgen`) and to
//! the Node `services/*` (via `napi-rs`). cdylib crate-type is pre-set in
//! Cargo.toml; add wasm-bindgen/napi as dependencies here as you wire real
//! exports.
