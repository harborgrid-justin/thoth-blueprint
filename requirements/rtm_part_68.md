# Requirements Traceability Matrix - Part 68
**Subject:** Annotation and Keynoting Tools (Chapter 47)
**Coverage:** Keynote Database Integration, Associative Keynote Tags, Keynote Legends, Sheet Linkage, Specific Filters, Tag Bubble Shapes, Legends Builder, Out-of-Sync Audits, Classification Divisions, Leader Landings, Custom Sequencing, Central Sync, Value Overrides, Missing Tag Audits, PDF Vectors Print

| Req ID | Tutorial Section / Reference | Requirement Description | Traceability | Code Mapping |
|---|---|---|---|---|
| REQ-68-001 | Chapter 47 > Keynotes > Database | The system shall support loading and parsing keynote databases detailing item codes and descriptions. | Trace-to-Spec-v1 | Pay items parser logic implemented in [qto.ts](../packages/domain/src/qto.ts#L80) |
| REQ-68-002 | Chapter 47 > Keynotes > Tags | The system shall support placing associative keynote tags linked to specific element categories. | Trace-to-Spec-v1 | Category styles metadata mapped in [elementMeta.ts](../apps/web/src/lib/elementMeta.ts) |
| REQ-68-003 | Chapter 47 > Keynotes > Legends | The system shall compile a Keynote Legend table summarizing all notes placed in the current layout. | Trace-to-Spec-v1 | Quantity takeout list summarized in cost schedules inside [QtoPanel.tsx](../apps/web/src/features/workspace/QtoPanel.tsx) |
| REQ-68-004 | Chapter 47 > Keynotes > Sheets | The system shall link keynote references to sheet indexing databases. | Trace-to-Spec-v1 | Cost item quantities compiled across sheet layouts inside [QtoPanel.tsx](../apps/web/src/features/workspace/QtoPanel.tsx) |
| REQ-68-005 | Chapter 47 > Keynotes > Filtering | The system shall filter legends and takeoffs to display only components present on the active sheet layout. | Trace-to-Spec-v1 | Mapped to sheet-specific cost takeoffs inside [QtoPanel.tsx](../apps/web/src/features/workspace/QtoPanel.tsx) |
| REQ-68-006 | Chapter 47 > Keynotes > Bubble Shapes | The system shall support customizable keynote tag shapes including hexagons, circles, boxes, and diamonds. | Trace-to-Spec-v1 | Not implemented |
| REQ-68-007 | Chapter 47 > Keynotes > Legends Builder | The system shall support automated generation and placement of visual keynote legend tables directly on sheet layouts. | Trace-to-Spec-v1 | Not implemented |
| REQ-68-008 | Chapter 47 > Keynotes > Out-of-Sync Audits | The system shall flag out-of-sync keynote symbols and highlight orphan tags when parent elements are deleted. | Trace-to-Spec-v1 | Not implemented |
| REQ-68-009 | Chapter 47 > Keynotes > Classifications | The system shall support filtering loaded keynotes list based on standard construction divisions (e.g. CSI MasterFormat). | Trace-to-Spec-v1 | Not implemented |
| REQ-68-010 | Chapter 47 > Keynotes > Leader Landings | The system shall support keynote leader lines with adjustable landing offsets and pointer arrowheads styles. | Trace-to-Spec-v1 | Not implemented |
| REQ-68-011 | Chapter 47 > Keynotes > Custom Sequencing | The system shall support custom hierarchy sequencing rules for sorting notes (e.g., matching drawing details sorting). | Trace-to-Spec-v1 | Not implemented |
| REQ-68-012 | Chapter 47 > Keynotes > Central Sync | The system shall support pulling and synchronizing keynote database overrides from central template files automatically. | Trace-to-Spec-v1 | Not implemented |
| REQ-68-013 | Chapter 47 > Keynotes > Value Overrides | The system shall support manually overriding keynote values, allowing users to input custom text bypassing the database lookup. | Trace-to-Spec-v1 | Not implemented |
| REQ-68-014 | Chapter 47 > Keynotes > Missing Tag Audits | The system shall validate drawings and identify elements missing mandatory keynote tags based on design rules. | Trace-to-Spec-v1 | Not implemented |
| REQ-68-015 | Chapter 47 > Keynotes > PDF Print | The system shall support exporting drawings with keynotes to vector-sharp PDF files with embedded hypertext links. | Trace-to-Spec-v1 | Not implemented |

