# FieldSafe

FieldSafe is a role-based equipment inspection and safety operations prototype covering inspection capture, supervisory review, corrective-action tracking, management visibility, and public equipment safety status.

## What the prototype demonstrates

### Inspector

- A user-scoped queue of assigned inspections with overdue and upcoming work.
- Simulated equipment identification followed by an equipment-specific checklist.
- Pass/Fail responses with defect description, Minor/Major/Critical severity, and simulated photo evidence.
- Browser-persisted drafts, review and signature acknowledgement, online submission, and simulated offline submission/sync.
- Inspection history with read-only completed records.
- Persistent assignment, sync-completion, and revision notifications plus transient action feedback.
- A revision workflow when a Supervisor returns a submitted inspection with a reason.

### Supervisor

- Prioritized pending reviews backed by the same submitted inspection records used by Inspectors.
- Explicit Approve or Return for Revision decisions, including a mandatory reason and preserved revision audit history.
- Corrective-action creation, Technician assignment, due dates, and Open/In Progress/Done tracking.
- Simulated closure evidence required for new transitions to Done.
- A separate Verify & Resolve safety-control step after corrective work is complete.
- Actionable notifications for newly submitted failed inspections.

### Manager

- A read-only operational overview and fleet status board.
- Compliance visibility based on inspection pass rate, trend, volume, and equipment-type performance.
- Defect analytics covering volume, severity, lifecycle, and common categories.
- URL-backed 30D, 90D, 6M, and All date-range presets.
- Safety-state and unresolved-severity drill-throughs into filtered equipment views.
- Equipment-level inspection history and current risk/remediation context.

### Gate

- A public, authentication-free equipment safety lookup.
- Simulated equipment selection with an Allowed, Restricted, or Denied decision derived from the shared canonical equipment state.

## Core lifecycle

The submitted inspection review path is:

```text
Assigned → Draft / In Progress → Submitted → Pending Review → Approved
```

The revision path is:

```text
Pending Review → Revision Required → Inspector Revision
               → Resubmitted → Pending Review → Approved
```

Resubmission continues the **same inspection lifecycle**. It updates the existing inspection and associated defect records rather than creating another inspection or duplicating defects. Clean all-pass inspections are completed and visible to the Supervisor without entering the failed-inspection review queue.

Corrective actions and defects deliberately use separate lifecycles:

```text
Corrective Action: Open → In Progress → Done
Defect:             Unresolved → Resolved
```

Corrective Action **Done** means the assigned work is complete. It does **not** automatically mean the defect is **Resolved** or the equipment is safe to return to service. A Supervisor must separately use **Verify & Resolve** after confirming the remediation.

## Safety-state derivation

Equipment safety state is calculated from unresolved defects rather than manually assigned by a screen:

| Highest unresolved severity | Equipment state | Gate decision |
| --- | --- | --- |
| None or Minor only | Fit | Allowed |
| Major | Restricted | Restricted |
| Critical | Out of Service | Denied |

If several unresolved defects exist, the most severe unresolved defect determines the equipment state. Manager and Gate views consume this same derived state.

## Demo data

Demo Reset installs a deterministic operational baseline containing:

- Two Inspector personas with six actionable assignments each.
- A mix of overdue, due-soon, and future assignments.
- Approximately 80 completed inspections distributed across six months, with varied Pass/Fail outcomes.
- Minor, Major, and Critical defects in resolved and unresolved states.
- Corrective actions across Open, In Progress, and Done states, with varied due dates.
- Fit, Restricted, and Out-of-Service equipment for all Gate decisions and Manager filters.

Operational dates are generated relative to a single demo reference time. This keeps the baseline reproducible for that reference while preventing active work from permanently aging into an all-overdue dataset.

**Reset Demo Data** is available from the Inspector Profile demo controls. It replaces operational changes, drafts, sync state, and notification state with the deterministic baseline while retaining the current authenticated session.

## Architecture

FieldSafe uses React, TypeScript, Vite, React Router, Tailwind CSS, and Lucide React.

```text
UI
↓
services / domain logic
↓
repository abstraction
↓
browser-backed persistence
```

React pages and components do not directly access browser storage. They call services and repository contracts, while storage adapters own serialization and persistence. The assignment permits mocked persistence; keeping this boundary explicit makes the browser repository replaceable with an API/backend implementation without embedding storage behavior throughout the UI.

Operational state and authentication session state are stored separately:

- `fieldsafe:operational-data:v1` — equipment, inspections, drafts, responses, defects, corrective actions, connectivity, and notifications.
- `fieldsafe:session:v1` — the active deterministic demo-user session.

## Persistence & offline simulation

Operational changes persist in browser `localStorage` through the repository/storage abstraction. Refreshing or signing out and back in reconstructs the stored application state for that browser and origin.

The Inspector can toggle deterministic simulated connectivity between Online and Offline. While Offline, drafts, defect data, evidence references, signatures, and completed submissions continue to use the browser repository. An offline submission is marked pending sync; returning Online simulates syncing, persists the Synced state, and creates the accepted sync feedback/notification.

This demonstrates the offline product workflow. It is not production distributed synchronization: there is no service worker, background sync, multi-device conflict resolution, or server acknowledgement.

## Assumptions and deliberate constraints

- Persistence is intentionally browser-local for this prototype.
- QR scanning and equipment identification are simulated; no camera or QR library is used.
- Evidence capture uses bundled local demo references rather than uploads or production object storage.
- Authentication uses deterministic demo identities and role guards rather than a production identity provider.
- The Manager persona is intentionally read-only.
- Manager notifications were deliberately omitted because the implemented prototype has no sufficiently interrupt-worthy Manager event; Manager awareness remains dashboard-driven.
- Rich activity feeds, pagination, copy/permalink controls, equipment/checklist versioning, and advanced rejection/revision analytics remain future-scope enhancements.
- Offline behavior demonstrates continuity of the inspection workflow, not production conflict resolution across devices.
- The seeded Technician is an assignable corrective-action owner, not an interactive application persona.

## Running locally

Prerequisite: a current Node.js/npm environment.

```bash
npm install
npm run dev
```

Available repository commands:

```bash
npm test          # run the Vitest suite
npm run lint      # run ESLint
npm run build     # run the TypeScript build and create the Vite production bundle
npm run preview   # preview the production bundle after building
```

## Demo accounts

Interactive accounts use the shared password `demo123`.

| Name | Role | Email | Interactive workspace |
| --- | --- | --- | --- |
| Arjun Nair | Inspector | `arjun.nair@fieldsafe.demo` | Yes |
| Neha Patel | Inspector | `neha.patel@fieldsafe.demo` | Yes |
| Priya Sharma | Supervisor | `priya.sharma@fieldsafe.demo` | Yes |
| Varun Mehta | Manager | `varun.mehta@fieldsafe.demo` | Yes |
| Ravi Kumar | Technician | `ravi.kumar@fieldsafe.demo` | No — assignment owner only |

The public Gate Check at `/gate` requires no account.

## Validation

The repository includes quality gates for:

- Automated domain, service, repository, routing, UI, persistence, and cross-persona workflows with Vitest and Testing Library.
- TypeScript project compilation as part of the production build.
- ESLint validation.
- Vite production bundling.
- A storage-boundary test that prevents React pages and components from directly accessing `localStorage`, `sessionStorage`, or IndexedDB.

## Future production considerations

- Backend/API persistence and durable audit storage.
- Production authentication, authorization, and identity lifecycle management.
- Real QR scanning, camera capture, and durable evidence/object storage.
- Conflict-aware, multi-device offline synchronization.
- Configurable and versioned checklists and equipment records.
- Richer operational analytics and rejection/revision reporting.
- Pagination and server-side querying for larger datasets.
- Audit export, formal reports, and integration interfaces.

## Design principles

- Derive safety state; do not manually override it in persona screens.
- Preserve inspection, review, defect, and remediation auditability.
- Separate corrective-work completion from verified safety resolution.
- Prioritize field usability and safe failure behavior.
- Surface actionable information according to persona responsibilities.
- Keep mocked infrastructure behind replaceable architectural boundaries.
