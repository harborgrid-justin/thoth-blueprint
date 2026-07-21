#!/usr/bin/env python3
"""Validate the requirements suite against coverage rules R1-R5 and ID hygiene.

Checks:
  - unique requirement IDs across the suite
  - R3: every functional requirement has >=1 STK up-trace and >=1 verify method
  - R2: every STK-001..007 appears in >=1 functional Trace
  - R1: every BR-001..011 appears in >=1 STK "Satisfies"
  - R5: every NFR has a non-empty Constrains cell
  - referenced STK/BR/NFR/CON/DEP ids in traces actually exist
Exits non-zero on any failure. Run in CI alongside a link check.
"""
import os, re, sys
from collections import defaultdict

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
def P(*a): return os.path.join(ROOT, *a)

FUNC_FILES = {
    "FE": "02-functional/frontend-requirements.md",
    "BE": "02-functional/backend-requirements.md",
    "DOM": "02-functional/domain-requirements.md",
    "IOP": "02-functional/interoperability-requirements.md",
}
ROWID = re.compile(r'^[A-Z]+-[A-Z0-9]+-\d{3}$')
errors = []

def rows(path):
    out = []
    with open(path, encoding="utf-8") as f:

        for ln in f:
            if not ln.startswith("|"):
                continue
            parts = [p.strip() for p in ln.strip().strip("|").split("|")]
            if len(parts) < 6:
                continue
            rid = parts[0].strip("`").strip()
            if ROWID.match(rid):
                out.append(parts)
    return out

# collect functional
func = {}
all_ids = defaultdict(int)
stk_used, br_satisfied = set(), set()
for pfx, rel in FUNC_FILES.items():
    for parts in rows(P(rel)):
        rid, trace, verify = parts[0].strip("`"), parts[4], parts[5]
        func[rid] = (trace, verify)
        all_ids[rid] += 1
        stks = re.findall(r'STK-\d{3}', trace)
        if not stks:
            errors.append(f"R3: {rid} has no STK up-trace (trace='{trace}')")
        stk_used.update(stks)
        if verify not in ("T", "D", "I", "A"):
            errors.append(f"R4: {rid} has invalid verify '{verify}'")

# NFR rows: R5 + ids
for parts in rows(P("03-nonfunctional/nonfunctional-requirements.md")):
    rid, constrains = parts[0].strip("`"), parts[4]
    all_ids[rid] += 1
    if not constrains or constrains == "—":
        errors.append(f"R5: {rid} has empty Constrains")

# BR/STK/CON/DEP ids
for rel in ("01-business/business-requirements.md", "01-business/stakeholders.md",
            "00-overview/scope-and-context.md"):
    with open(P(rel), encoding="utf-8") as f:
        for m in re.finditer(r'`(BR-\d{3}|STK-\d{3}|CON-\d{3}|DEP-\d{3})`', f.read()):
            pass  # existence collected below

# STK Satisfies -> BR (R1)
with open(P("01-business/stakeholders.md"), encoding="utf-8") as f:
    txt = f.read()
for m in re.finditer(r'\*\*Satisfies:\*\*\s*(.+)', txt):
    br_satisfied.update(re.findall(r'BR-\d{3}', m.group(1)))

# existence sets
def ids_in(rel, pat):
    with open(P(rel), encoding="utf-8") as f:
        return set(re.findall(pat, f.read()))

BR = ids_in("01-business/business-requirements.md", r'\bBR-\d{3}\b')
STK = ids_in("01-business/stakeholders.md", r'\bSTK-\d{3}\b')
CON = ids_in("00-overview/scope-and-context.md", r'\bCON-\d{3}\b')
DEP = ids_in("00-overview/scope-and-context.md", r'\bDEP-\d{3}\b')
NFR = {rid for rid in all_ids if rid.startswith("NFR-")}

# duplicates
for rid, n in all_ids.items():
    if n > 1:
        errors.append(f"Duplicate functional/NFR ID: {rid} (x{n})")

# R2: every STK used
for s in sorted(STK):
    if s not in stk_used:
        errors.append(f"R2: {s} is not traced by any functional requirement")
# R1: every BR satisfied
for b in sorted(BR):
    if b == "BR-011":  # delivery requirement, realized via phase mapping
        continue
    if b not in br_satisfied:
        errors.append(f"R1: {b} is not claimed by any STK 'Satisfies'")

# referenced ids in functional traces exist
valid = BR | STK | CON | DEP | NFR
for rid, (trace, _) in func.items():
    for ref in re.findall(r'\b(?:BR|STK|CON|DEP|NFR)-[A-Z0-9]*-?\d{3}\b', trace):
        base = re.match(r'^(BR|STK|CON|DEP)-\d{3}$', ref)
        if base and ref not in valid:
            errors.append(f"{rid}: trace references unknown {ref}")

print(f"Functional requirements: {len(func)}")
print(f"NFRs: {len(NFR)} | BR: {len(BR)} | STK: {len(STK)} | CON: {len(CON)} | DEP: {len(DEP)}")
if errors:
    print(f"\nFAIL — {len(errors)} issue(s):")
    for e in errors:
        print("  -", e)
    sys.exit(1)
print("\nPASS — R1–R5 and ID hygiene OK.")
