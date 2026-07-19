#!/usr/bin/env python3
"""Generate the Requirements Traceability Matrix from the source requirement files.

Source of truth = the per-requirement tables in 02-functional/*.md (and the
Constrains column of 03-nonfunctional/*.md for the NFR scope matrix). This makes
the source `Trace` columns authoritative and the RTM a derived artifact — run
after editing any requirement.

Usage:  python3 docs/requirements/_meta/scripts/gen_rtm.py
Writes: docs/requirements/04-traceability/traceability-matrix.md
Prints: a counts summary for updating README / SRS / coverage-report.
"""
import os, re, sys
from collections import defaultdict, OrderedDict

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
ROOT = os.path.normpath(ROOT)
FUNC = os.path.join(ROOT, "02-functional")
NFRF = os.path.join(ROOT, "03-nonfunctional", "nonfunctional-requirements.md")
OUT = os.path.join(ROOT, "04-traceability", "traceability-matrix.md")

FILES = OrderedDict([
    ("FE", ("frontend-requirements.md", "apps/web")),
    ("BE", ("backend-requirements.md", None)),        # module per area heading
    ("DOM", ("domain-requirements.md", "packages/domain")),
    ("IOP", ("interoperability-requirements.md", "services/geospatial")),
])

AREA_HEADING = re.compile(r'^##\s+.+?—\s+`([A-Z]+-[A-Z0-9]+)`(?:\s*\((.+?)\))?')
ROWID = re.compile(r'^[A-Z]+-[A-Z0-9]+-\d{3}$')

def parse_rows(path, prefix, default_module):
    rows = []
    module = default_module
    with open(path) as f:
        for ln in f:
            h = AREA_HEADING.match(ln)
            if h:
                module = (h.group(2) or default_module or "").replace("`", "").strip()
                continue
            if not ln.startswith("|"):
                continue
            parts = [p.strip() for p in ln.strip().strip("|").split("|")]
            if len(parts) < 6:
                continue
            rid = parts[0].strip("`").strip()
            if not ROWID.match(rid):
                continue
            rows.append({
                "id": rid, "pri": parts[2], "phase": parts[3],
                "trace": parts[4], "verify": parts[5], "module": module,
            })
    return rows

def bucket_trace(trace):
    toks = [t.strip().strip("`") for t in re.split(r"[,;]", trace) if t.strip()]
    stk, other = [], []
    for t in toks:
        (stk if t.startswith("STK-") else other).append(t)
    dedup = lambda xs: list(OrderedDict.fromkeys(xs))
    return ", ".join(dedup(stk)) or "—", ", ".join(dedup(other)) or "—"

# ---- parse functional ----
layers = OrderedDict()
for pfx, (fname, mod) in FILES.items():
    layers[pfx] = parse_rows(os.path.join(FUNC, fname), pfx, mod)

allrows = [r for rs in layers.values() for r in rs]

# ---- parse NFR (for Matrix D + count) ----
def parse_nfr(path):
    cat_scope = OrderedDict()
    count = 0
    with open(path) as f:
        for ln in f:
            if not ln.startswith("|"):
                continue
            parts = [p.strip() for p in ln.strip().strip("|").split("|")]
            if len(parts) < 6:
                continue
            rid = parts[0].strip("`").strip()
            m = re.match(r'^NFR-([A-Z0-9]+)-\d{3}$', rid)
            if not m:
                continue
            count += 1
            cat = m.group(1)
            for s in re.split(r"[,;]", parts[4]):
                s = s.strip().strip("`")
                if s:
                    cat_scope.setdefault(cat, [])
                    if s not in cat_scope[cat]:
                        cat_scope[cat].append(s)
    return cat_scope, count

nfr_scope, nfr_count = parse_nfr(NFRF)

# ---- roll-ups ----
PHASES = ["P1", "P2", "P3", "P4", "P5"]
phase_by_layer = defaultdict(lambda: defaultdict(int))
verify_ct = defaultdict(int)
module_ct = defaultdict(int)
module_areas = defaultdict(set)
for r in allrows:
    phase_by_layer[r["id"].split("-")[0]][r["phase"]] += 1
    verify_ct[r["verify"]] += 1
    module_ct[r["module"]] += 1
    module_areas[r["module"]].add("-".join(r["id"].split("-")[:2]))

def area_of(rid):
    return "-".join(rid.split("-")[:2])

# ---- emit ----
L = []
def w(s=""):
    L.append(s)

w("# Requirements Traceability Matrix (RTM)")
w()
w("> **Generated file.** Matrix C and the roll-ups below are produced by")
w("> [`_meta/scripts/gen_rtm.py`](../_meta/scripts/gen_rtm.py) from the `Trace`")
w("> columns of the requirement source files — the source files are authoritative.")
w("> Re-run the generator after editing any requirement; do not hand-edit Matrix C.")
w()
w("This is the spine of the suite: it realizes **bidirectional traceability** across")
w("the chain defined in")
w("[standards & conventions](../00-overview/standards-and-conventions.md#traceability-model):")
w()
w("```")
w("BR ─▶ STK ─▶ {FE, BE, DOM, IOP} ─▶ Phase · Module · Verification")
w("                    ▲")
w("              NFR (cross-cutting constraints)")
w("```")
w()
w("Read it **down** (a business goal → the features that deliver it) or **up** (a")
w("requirement → why it exists). The [coverage report](coverage-report.md) validates")
w("the matrix against coverage rules `R1`–`R5`.")
w()
w("**Legend.** Priority: **M** Must · **S** Should · **C** Could · **W** Won't-yet.")
w("Verify: **T** Test · **D** Demonstration · **I** Inspection · **A** Analysis.")
w("Status: ⬜ Planned (specified, not yet built) · 🟡 In progress · ✅ Done. The")
w("repository is currently scaffold ([ROADMAP](../../ROADMAP.md) Phase 0), so every")
w("requirement is **⬜ Planned**; this column becomes the live build tracker.")
w()
w("---")
w()
# Matrix A
w("## Matrix A — Business → Stakeholder")
w()
w("Every business requirement is served by at least one stakeholder (rule `R1`).")
w("Source: [business requirements](../01-business/business-requirements.md).")
w()
w("| Business req | Served by stakeholders |")
w("| --- | --- |")
BR_STK = [
    ("BR-001 Web-native workspace", "STK-001, STK-002, STK-005"),
    ("BR-002 Domain-native objects", "STK-001, STK-002"),
    ("BR-003 Real-time collaboration", "STK-003, STK-005"),
    ("BR-004 Spatial honesty", "STK-001, STK-002"),
    ("BR-005 Interoperability", "STK-001, STK-004, STK-007"),
    ("BR-006 CAD-grade precision", "STK-001, STK-004"),
    ("BR-007 Governed & auditable", "STK-003, STK-005, STK-006"),
    ("BR-008 Planning intelligence", "STK-001, STK-002, STK-004"),
    ("BR-009 Full stakeholder spectrum", "STK-001 – STK-007"),
    ("BR-010 Open & self-hostable", "STK-007"),
    ("BR-011 Incremental, domain-first", "all (via Phase)"),
]
for br, stk in BR_STK:
    w(f"| [`{br.split()[0]}`](../01-business/business-requirements.md) {br.split(' ',1)[1]} | {stk} |")
w()
# Matrix B
w("## Matrix B — Stakeholder → functional areas & module")
w()
w("A non-exhaustive digest of each stakeholder's principal functional areas (rule")
w("`R2`). The authoritative, complete stakeholder trace for every requirement is the")
w("↑ Stakeholder column of [Matrix C](#matrix-c--master-requirement-traceability).")
w("Source: [stakeholders](../01-business/stakeholders.md).")
w()
w("| Stakeholder | Frontend | Backend | Domain | Interop |")
w("| --- | --- | --- | --- | --- |")
w("| STK-001 Site planner | CANVAS, PRECISION, MEASURE, PREFS | GEO, IMPORT, JOB | CRS, UNIT, GEOM, PARCEL, LOT, SURVEY, SUBDIV, METRIC | DXF, GEOJSON, SHP, RASTER |")
w("| STK-002 Urban planner | STYLE, METRIC, LAYER, FIND, SCENARIO | GEO | ZONE, LANDUSE, BLOCK, METRIC, COMPLY, SCENARIO | — |")
w("| STK-003 Reviewer | REVIEW, PROJECT, NOTIFY | COMMENT, VERSION, AUDIT, ACCESS, NOTIFY | IDENT, SNAPSHOT | — |")
w("| STK-004 Developer | CANVAS, METRIC, PRINT | EXPORT, JOB | SETBACK, BUILDING, ENVELOPE, PARKING, METRIC | PDF, DXF |")
w("| STK-005 Community | REVIEW, NAV, HELP | ACCESS | — | PDF |")
w("| STK-006 Org admin | ACCOUNT, STATE | AUTH, ACCESS, AUDIT, SEARCH, STORAGE | — | — |")
w("| STK-007 Integrator | IO | API, IMPORT, EXPORT, JOB, WEBHOOK | SERIAL | GEOJSON, SHP, GPKG, CSV, FIELD, SCHEMA |")
w()
w("---")
w()
# Matrix C
w("## Matrix C — Master requirement traceability")
w()
w("One row per requirement, generated from the source files. Requirement text lives")
w("in the linked sources; this matrix carries the trace links.")
w()
SUBS = OrderedDict([
    ("FE", ("C.1 Frontend", "module `apps/web`", "frontend-requirements.md", False)),
    ("BE", ("C.2 Backend", "modules `services/*`", "backend-requirements.md", True)),
    ("DOM", ("C.3 Domain model", "module `packages/domain`", "domain-requirements.md", False)),
    ("IOP", ("C.4 Interoperability", "module `services/geospatial` (+`apps/web` via `FE-IO`)", "interoperability-requirements.md", False)),
])
for pfx, (title, modtext, fname, show_module) in SUBS.items():
    w(f"### {title} — {modtext} · source [{fname}](../02-functional/{fname})")
    w()
    if show_module:
        w("| Req | Module | ↑ Stakeholder | ↑ Business / Constraint / NFR | Phase | Pri | V | Status |")
        w("| --- | --- | --- | --- | :--: | :--: | :--: | :--: |")
    else:
        w("| Req | ↑ Stakeholder | ↑ Business / Constraint / NFR | Phase | Pri | V | Status |")
        w("| --- | --- | --- | :--: | :--: | :--: | :--: |")
    for r in layers[pfx]:
        stk, other = bucket_trace(r["trace"])
        if show_module:
            w(f"| {r['id']} | {r['module']} | {stk} | {other} | {r['phase']} | {r['pri']} | {r['verify']} | ⬜ |")
        else:
            w(f"| {r['id']} | {stk} | {other} | {r['phase']} | {r['pri']} | {r['verify']} | ⬜ |")
    w()
w("---")
w()
# Matrix D
w("## Matrix D — Non-functional → constrained scope")
w()
w("Every NFR names the requirements/modules it constrains (rule `R5`), generated")
w("from the `Constrains` column of the")
w("[non-functional requirements](../03-nonfunctional/nonfunctional-requirements.md).")
w()
w("| NFR category | Constrains (areas / modules / requirements) |")
w("| --- | --- |")
for cat, scope in nfr_scope.items():
    w(f"| NFR-{cat} | {', '.join(scope)} |")
w()
w("---")
w()
# Matrix E
w("## Matrix E — Phase coverage (roadmap alignment)")
w()
w("Requirement counts by roadmap [phase](../../ROADMAP.md), computed from Matrix C.")
w("Confirms the domain model (P1) leads and later phases build on it.")
w()
w("| Phase | Focus | FE | BE | DOM | IOP | Total |")
w("| --- | --- | :--: | :--: | :--: | :--: | :--: |")
FOCUS = {"P1": "Domain model foundation", "P2": "Single-player cloud workspace",
         "P3": "Interoperability", "P4": "Collaboration & review",
         "P5": "Analysis & planning depth"}
col_tot = defaultdict(int)
for ph in PHASES:
    cells = [phase_by_layer[l][ph] for l in ("FE", "BE", "DOM", "IOP")]
    for l, c in zip(("FE", "BE", "DOM", "IOP"), cells):
        col_tot[l] += c
    w(f"| **{ph}** | {FOCUS[ph]} | {cells[0]} | {cells[1]} | {cells[2]} | {cells[3]} | {sum(cells)} |")
w(f"| | **Totals** | **{col_tot['FE']}** | **{col_tot['BE']}** | **{col_tot['DOM']}** | **{col_tot['IOP']}** | **{sum(col_tot.values())}** |")
w()
w(f"> NFRs ({nfr_count}) are cross-cutting and phased with the areas they constrain.")
w()
# Matrix F
w("## Matrix F — Module coverage")
w()
w("Every functional requirement maps to exactly one architecture module (rule `R3`).")
w()
w("| Architecture module | Areas | Count |")
w("| --- | --- | :--: |")
MOD_ORDER = ["apps/web", "services/auth", "services/projects", "services/geospatial",
             "services/collaboration", "packages/domain", "all services"]
seen = set()
for mod in MOD_ORDER + [m for m in module_ct if m not in MOD_ORDER]:
    if mod in seen or mod not in module_ct:
        continue
    seen.add(mod)
    areas = ", ".join(sorted(module_areas[mod]))
    w(f"| `{mod}` | {areas} | {module_ct[mod]} |")
w(f"| | **Total** | **{sum(module_ct.values())}** |")
w()
# Verify summary
w("## Verification method summary")
w()
w("| Method | Count (functional) | Typical requirements |")
w("| --- | :--: | --- |")
w(f"| **T** Test | {verify_ct['T']} | Domain rules/metrics, service behavior, format round-trips |")
w(f"| **D** Demonstration | {verify_ct['D']} | Canvas/UI interactions, wizards, exhibits |")
w(f"| **I** Inspection | {verify_ct['I']} | API docs, license, config, schema mapping |")
w(f"| **A** Analysis | {verify_ct['A']} | Performance/load, audit immutability |")
w()
w("> Verification **evidence** (test-case IDs `TC-…`) attaches here once a test")
w("> suite exists; today the matrix specifies the method, per the")
w("> [conventions](../00-overview/standards-and-conventions.md#verification-methods).")
w()

with open(OUT, "w") as f:
    f.write("\n".join(L) + "\n")

# ---- summary to stdout for updating other docs ----
func_total = len(allrows)
print("=== COUNTS (for README / SRS / coverage-report) ===")
for pfx in ("FE", "BE", "DOM", "IOP"):
    print(f"{pfx}: {len(layers[pfx])}")
print(f"Functional total: {func_total}")
print(f"NFR: {nfr_count}")
print(f"Verify: {dict(verify_ct)}")
print("Module counts:", dict(module_ct))
print(f"Wrote {OUT}")
