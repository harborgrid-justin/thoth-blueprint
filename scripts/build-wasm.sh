#!/usr/bin/env bash
# Builds the `thoth-bindings` wasm-bindgen boundary and generates the two JS
# packages the rest of the repo consumes:
#
#   apps/web/src/wasm/thoth-bindings           `--target web`    — the real
#     production artifact. Vite bundles this straight into apps/web via a
#     normal ES module import; it loads the .wasm with `fetch` +
#     `import.meta.url`, which Vite (and any modern bundler) understands
#     natively. This is what ships to the browser.
#
#   apps/web/src/wasm/thoth-bindings-node-test `--target nodejs`  — a
#     test-only artifact used exclusively by the Vitest equivalence test
#     (see apps/web/src/lib/geometryWasm.test.ts). Node's `fetch` cannot load
#     `file://` URLs, so the `web` target's glue can't be exercised directly
#     under plain Node/Vitest; the `nodejs` target instead loads the wasm
#     bytes synchronously via `fs`, which works under any Node process with
#     zero extra plumbing. Both artifacts are generated from the exact same
#     compiled .wasm, so there is no behavioral drift between "what ships"
#     and "what the test exercises" — only the JS loading shim differs.
#     Its .js is renamed to .cjs below: apps/web's package.json sets
#     "type": "module", so a plain .js would be parsed as ESM even though
#     wasm-bindgen's `nodejs` target emits CommonJS (`exports.foo = ...`).
#
# Usage: yarn build:wasm   (from the repo root; see package.json)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

CRATE=thoth-bindings
OUT_NAME=thoth_bindings
WEB_OUT_DIR=apps/web/src/wasm/thoth-bindings
NODE_TEST_OUT_DIR=apps/web/src/wasm/thoth-bindings-node-test

if ! command -v wasm-bindgen >/dev/null 2>&1; then
  echo "error: wasm-bindgen (the CLI) is not on PATH." >&2
  echo "  install a version matching the wasm-bindgen crate in crates/thoth-bindings/Cargo.toml, e.g.:" >&2
  echo "    cargo install wasm-bindgen-cli --version \$(sed -n 's/.*wasm-bindgen = \"\\(.*\\)\"/\\1/p' crates/thoth-bindings/Cargo.toml)" >&2
  exit 1
fi

if ! rustup target list --installed 2>/dev/null | grep -q wasm32-unknown-unknown; then
  echo "==> adding wasm32-unknown-unknown target (also declared in rust-toolchain.toml)"
  rustup target add wasm32-unknown-unknown
fi

echo "==> cargo build --release --target wasm32-unknown-unknown -p $CRATE"
cargo build --release --target wasm32-unknown-unknown -p "$CRATE"

WASM_PATH="target/wasm32-unknown-unknown/release/${OUT_NAME}.wasm"

echo "==> wasm-bindgen --target web   -> $WEB_OUT_DIR"
rm -rf "$WEB_OUT_DIR"
wasm-bindgen "$WASM_PATH" --out-dir "$WEB_OUT_DIR" --out-name "$OUT_NAME" --target web

echo "==> wasm-bindgen --target nodejs -> $NODE_TEST_OUT_DIR (test-only, not shipped)"
rm -rf "$NODE_TEST_OUT_DIR"
wasm-bindgen "$WASM_PATH" --out-dir "$NODE_TEST_OUT_DIR" --out-name "$OUT_NAME" --target nodejs
# Force CommonJS parsing regardless of apps/web's "type": "module" (see note above).
mv "$NODE_TEST_OUT_DIR/$OUT_NAME.js" "$NODE_TEST_OUT_DIR/$OUT_NAME.cjs"

echo "==> done. $WEB_OUT_DIR/$OUT_NAME.js is what apps/web imports."
