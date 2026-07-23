# `thoth-governance` status

This crate is **new capability**, not a port — none of the six items below
has a TypeScript original anywhere in this repository (unlike
`thoth-planning`/`thoth-services`, which port `packages/domain`/
`services/*`). It closes Theme 6 ("Compliance, governance & collaboration")
of `docs/COMPETITIVE_GAP_ANALYSIS.md`, items 61–66.

Statuses used:

- `implemented+tested` — real logic, exercised by first-party tests
  covering realistic scenarios (not just the happy path).
- `implemented+partial-tests` — real logic, but scope or test coverage is
  narrower than the ideal — explained below.
- `not-yet-implemented` — not started.

Run `cargo test -p thoth-governance`: **49 tests, all passing.**
`cargo fmt -p thoth-governance -- --check` and
`cargo clippy -p thoth-governance --all-targets -- -D warnings` are both
clean.

## Test count by module

```
rules::tests          8 tests
diff::tests           10 tests
redline::tests        10 tests
audit::tests           4 tests
will_serve::tests       7 tests
sharing::tests         10 tests
                    ----
                       49 tests
```

## Coverage table

| # | Gap-analysis item | Module / key types | Status |
| --- | --- | --- | --- |
| 61 | Parametric, jurisdiction-configurable zoning/ordinance rule engine | `src/rules.rs` — `Rule`, `RuleKind`, `RuleSet`, `JurisdictionRuleRegistry`, `evaluate` | `implemented+tested` |
| 62 | Plan-version comparison and merge | `src/diff.rs` — `diff_sites`, `SiteDiff`, `three_way_merge`, `MergeResult` | `implemented+tested` (diff); `implemented+partial-tests` (merge — see below) |
| 63 | Redline-comment resolution workflow tied to a review cycle/status | `src/redline.rs` — `RedlineThread`, `ThreadStatus`, `RedlineService` | `implemented+tested` |
| 64 | Regulatory audit trail | `src/audit.rs` — `AuditLogEntry`, `AuditTrail` | `implemented+tested` |
| 65 | "Will-serve"/utility-capacity request tracking workflow | `src/will_serve.rs` — `WillServeRequest`, `WillServeStatus`, `WillServeTracker` | `implemented+tested` |
| 66 | Public read-only engagement sharing | `src/sharing.rs` — `ShareToken`, `ShareAccessLevel`, `SharingService` | `implemented+tested` |

## Item-by-item notes

### 61 — Rule engine (`src/rules.rs`)

A `Rule` is a value (`id`, `name`, `RuleKind`, `ComplianceSeverity`,
`applies_to_zone: Option<String>`), not a hard-coded `if` branch. `RuleKind`
is a closed set of six parametrized checks documented in full in the
module's schema table (`MinLotArea`, `MaxBuildingHeight`, `MaxFar`,
`MaxCoverage`, `MinSetback`, `ParkingRatioPerUnit`); configuring an
*instance* (thresholds, target yard, zone scope) is pure data — a future
jurisdiction-admin UI's configuration surface. `JurisdictionRuleRegistry`
holds one `RuleSet` per `jurisdiction_id` and
`JurisdictionRuleRegistry::evaluate_site` selects and runs whichever set is
active for a `thoth_planning::Site`'s own `jurisdiction_id`, producing
`thoth_spatial::ComplianceFinding`s — the same type
`thoth_planning::rules::check_compliance` produces, so both engines'
findings merge into one list without a second vocabulary.

Two honest scope notes, documented in the module itself:

- `MinSetback` accepts a `YardType` (front/side/rear) for a jurisdiction
  that wants per-yard minimums documented, but `thoth_planning::Lot` only
  carries one uniform `setback: Option<f64>` — there's no per-yard geometry
  to check yet, so multiple `MinSetback` rules with different yards all
  check the same scalar. The finding message always names which yard the
  rule was configured for, so this is visible, not silently wrong.
- `ParkingRatioPerUnit` computes required spaces from `Building::dwelling_units`,
  but nothing in `thoth_planning` models *supplied* parking (no
  `ParkingLot`/space-count element), so this rule can never fail — it always
  emits an informational finding stating the requirement. Comparing against
  actual supply needs a domain-model addition outside this crate's scope.

Tested: a jurisdiction with four real rules (min lot area, max height, max
FAR, min front setback) evaluated against a compliant lot/building and a
non-conforming one (undersized lot, over-height and over-FAR building,
under-setback), plus zone-scoping (a rule scoped to a zone that doesn't
exist on the site never fires), rule-parameter validation rejecting
malformed rules, the parking rule's informational-only behavior, and the
registry's jurisdiction selection/duplicate-registration errors.

### 62 — Plan-version diff and merge (`src/diff.rs`)

`diff_sites(before, after) -> SiteDiff` is a full, tested snapshot
comparison: every element added/removed/modified, with per-top-level-field
before/after detail for modifications (via a JSON-object comparison of each
element's serialized form), plus `Site`'s own `name`/`jurisdiction_id`/
`geoid` metadata changes. **Deliberately out of scope**: `layers` and the
civil-stub fields (`control_lines`/`civil_symbols`/`networks`) are not
diffed — the six gap-analysis items' emphasis is plan *elements*, and
adding those would be simple but unrequested surface area.

`three_way_merge(base, ours, theirs) -> MergeResult` is the "building
toward, but not required to fully implement, a three-way merge" piece, and
this is the item worth being plain about: **it is a real, working
three-way merge for the cases that have one unambiguous right answer**
(one side changed an element, the other didn't; both sides changed it
identically; one side deleted an element the other left untouched) **and
an honest conflict report for the cases that don't** (both sides changed
the same element differently; one side modified what the other deleted;
same-id elements added independently and differently — this last case is
only reachable if a caller reuses ids, which `thoth_spatial::create_id`
makes practically impossible in normal operation, but it's still handled
explicitly rather than silently picking a winner). It does **not** attempt
semantic geometry merging — there is no logic that tries to reconcile two
different setback edits into a third value, or splice two different
boundary-vertex edits together. That would require domain-specific
merge policy per field this crate has no mandate to invent, so a genuine
both-sides-changed-differently conflict is reported for a human to
resolve, with the base version left in place in the returned (partial)
site. This is why item 62 is `implemented+tested` for the diff half and
`implemented+partial-tests` in spirit for the merge half — the merge logic
itself is fully tested for every case it claims to handle, but the claim is
narrower than "merges any two versions of a site."

Tested: added/removed/modified detection with field-level diffs, no-op
comparison, site-metadata diffs, clean three-way merges combining
non-conflicting changes from both sides (including a clean deletion and a
metadata change from only one side), conflicting modify-vs-modify,
conflicting modify-vs-delete, conflicting metadata edits, and a
multi-element site where unrelated changes to different elements don't
interfere with each other.

### 63 — Redline-comment resolution workflow (`src/redline.rs`)

`RedlineThread` anchors to a plan element, a bare coordinate, or nothing
spatial (`RedlineAnchor::{Element, Coordinate, General}`), carries a
`review_round: u32` for grouping, and a `ThreadStatus` state machine
(`Open` → `Addressed` → `Resolved`, with `Rejected` and reopen paths — the
full transition table is diagrammed in the module docs and enforced by
`RedlineThread::transition`). Persisted through `StorageAdapter` via
`RedlineService`. Composes with
`thoth_services::collaboration::CollaborationHub`'s *existing*
`publish_comment`/`resolve_thread` notifications
(`RedlineService::add_comment_notifying`/`transition_notifying`) rather than
adding a second pub/sub bus — the hub is unmodified.

One documented gap: the hub only has `CommentPosted`/`ThreadResolved`
`CollabEvent` variants today, so `transition_notifying` only broadcasts on
a transition *into* `Resolved`; moving a thread to `Addressed`/`Rejected`/
back to `Open` updates storage (and is fully tested) but has no live-viewer
broadcast yet, since inventing a new `CollabEvent` variant would mean
editing `thoth-services`, which is out of this crate's scope per the
assignment.

Tested: opening a thread anchored to an element and to a coordinate, empty-
comment-body rejection, the full open → addressed → resolved lifecycle,
resolving an already-resolved thread as a distinct error
(`ThreadAlreadyResolved`), illegal direct transitions (`Open` → `Resolved`)
rejected, a rejected thread reopening, round/project listing/filtering, and
both `CollaborationHub` composition points actually receiving the expected
`CollabEvent`.

### 64 — Regulatory audit trail (`src/audit.rs`)

`AuditLogEntry` (`project_id`, `actor_id`, a dot-namespaced `action` code,
`subject_id`, `review_round`, `occurred_at`, an opaque `detail` JSON value)
persisted through `StorageAdapter` via `AuditTrail`, with
`history_for_project`/`history_for_subject`/`history_for_round` query
helpers (in-memory filtering after `list`, matching every other service in
this codebase — `StorageAdapter` has no query API beyond `list`/`get`).
This is an append-and-query log, not an automatic mutation interceptor: it
has no visibility into call sites in sibling crates, so recording an entry
is the caller's responsibility at the point it already has the relevant
context (documented in the module docs as the integration point for a
future `thoth-services` pass).

Tested: recording and listing project history in chronological order,
filtering by subject, filtering by review round.

### 65 — Will-serve/utility-capacity request tracking (`src/will_serve.rs`)

`WillServeRequest` (`utility: UtilityType`, `requested_capacity: f64` +
free-form `capacity_unit` label, `requested_by`, `WillServeStatus`,
optional `reviewer_notes`) with a `Requested → Reviewed → Approved|Denied`
state machine (plus `Reviewed → Requested` for "needs more information"),
persisted through `StorageAdapter` via `WillServeTracker`. Capacity is
validated positive/finite at request time.

Tested: submission, non-positive-capacity rejection, the full
requested → reviewed → approved lifecycle, a denial after review, illegal
direct transitions (`Requested` → `Approved`), and project/status listing.

### 66 — Public read-only engagement sharing (`src/sharing.rs`)

`ShareToken` (an unguessable `thoth_spatial::create_id`-derived token used
as both storage id and the public-link secret, `project_id`,
`ShareAccessLevel::{View, Comment}`, optional `expires_at`, `revoked`)
persisted through `StorageAdapter` via `SharingService`.
`ShareAccessLevel::permits` mirrors `thoth_services::auth::Role::permits`'s
shape against the same `Action` enum — reusing that vocabulary directly
rather than inventing a parallel permission model, per the assignment.
`SharingService::join_collaboration` composes with
`CollaborationHub::join` so a valid public viewer sees the same live
presence/edit stream an authenticated participant does; the hub itself is
unmodified.

Tested: create/resolve, view-only tokens rejecting `Comment`/`Edit`,
comment-level tokens permitting `View`+`Comment` but never `Edit`,
revocation (and its idempotency), expiry (both past and future
`expires_at`), unknown-token lookup, joining the collaboration hub through
a valid token (and being rejected through a revoked one), and project-level
listing including revoked tokens.

## What's deliberately not here

- No HTTP/gRPC transport for any of the six services — same boundary
  `thoth-services` itself draws (see its `STATUS.md`): this crate is the
  service-logic layer a future transport would call into.
- No jurisdiction-admin UI for authoring `RuleSet`s — item 61 asks for a
  schema a UI *could* target, not the UI itself.
- No automatic semantic conflict resolution in `three_way_merge` beyond
  what's described above under item 62 — this was flagged as the likely
  hardest item in the assignment, and it is: real, tested, conservative
  conflict detection, not full auto-merge.
- No new `CollabEvent` variants in `thoth_services::collaboration` (item 63's
  `Addressed`/`Rejected`/reopen transitions aren't broadcast) — adding one
  would mean editing a crate this assignment marks off-limits.
