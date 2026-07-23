#!/usr/bin/env bash
# Builds the `thoth-napi` native Node addon and drops it where
# `scripts/smoke-test-napi.mjs` (and, eventually, services/*) expect it:
# target/napi/thoth_napi.node.
#
# This is deliberately NOT wired into any services/* package yet —
# thoth-services (the crate this addon exists to eventually front) is still
# a placeholder (see crates/thoth-services/src/lib.rs). This script and the
# smoke test exist to prove the napi-rs build pipeline itself works, the
# same way scripts/build-wasm.sh proves the wasm-bindgen pipeline works.
#
# Usage: yarn build:napi   (from the repo root; see package.json)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

OUT_DIR="target/napi"
mkdir -p "$OUT_DIR"

echo "==> cargo build --release -p thoth-napi"
cargo build --release -p thoth-napi

# napi-rs addons are plain native shared libraries; only the file extension
# tells Node to load them as an N-API addon. The extension per platform:
case "$(uname -s)" in
  Darwin) SRC="target/release/libthoth_napi.dylib" ;;
  Linux)  SRC="target/release/libthoth_napi.so" ;;
  *)      echo "error: unsupported platform for this script: $(uname -s)" >&2; exit 1 ;;
esac

cp "$SRC" "$OUT_DIR/thoth_napi.node"
echo "==> done. $OUT_DIR/thoth_napi.node"
