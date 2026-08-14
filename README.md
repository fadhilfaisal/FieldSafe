# FieldSafe

FieldSafe is a static React prototype foundation for field inspection and equipment safety experiences.

## Current scope

The application currently includes its visual foundation, typed operational domain data, deterministic demo records, repository contracts, device-local browser persistence, simulated role-based authentication, the end-to-end Inspector inspection workflow, simulated offline submission and synchronization, Supervisor review and corrective-action workflows, read-only Manager visibility, and the public Gate Check experience. It intentionally contains no production authentication, production scanning or camera capture, production offline infrastructure, backend/API integration, Technician application, or return-to-service workflow.

## Architecture direction

Future application behavior should follow this dependency direction:

```text
UI → service/domain logic → repository contracts → browser-storage adapters
```

- Pages and UI components call services or repository contracts, never browser storage directly.
- Domain types and rules should remain independent of React and storage details.
- Repository contracts live separately from their browser-storage implementation.
- Deterministic seed data enters through the repository boundary rather than component imports.
- Operational data is stored under the versioned `fieldsafe:operational-data:v1` key. Reset replaces only that dataset.
- Session data is stored independently under `fieldsafe:session:v1` and contains only the active seeded user ID.
- Central route guards redirect an unauthorized authenticated user to their own role landing page.

## Data locations

- `src/domain` — framework-independent models and safety-state helpers
- `src/data/seed` — deterministic demo dataset factory
- `src/repositories` — asynchronous repository contract and browser implementation
- `src/storage` — JSON browser-storage adapter and storage-driver boundary
- `src/services` — application initialization and demo reset entry points
- `src/auth` — demo credentials, authentication service, session store, context, and route guards
- `src/services/inspectionService.ts` — Inspector queue, draft validation, domain orchestration, and atomic submission
- `src/components/inspection` — reusable work-card, checklist, defect, evidence, progress, and signature components

## Demo authentication

Interactive seeded users can sign in from `/login` with the shared password `demo123`. The two Inspectors, Supervisor, and Manager are available in the on-screen Demo Accounts list. The seeded Technician remains a supporting data actor and cannot sign in to an application workspace.

Logout clears only `fieldsafe:session:v1`; operational data is preserved. Resetting operational demo data does not clear a valid session because deterministic user IDs remain stable.

## Inspector workflow

Each Inspector has two deterministic assigned inspections. Starting an assignment proceeds through simulated scan, repository-resolved equipment confirmation, its equipment-specific checklist, progressive defect capture, review, signature, submission, and a persisted result. Inspector History shows completed records for the active Inspector.

In-progress responses, defect details, evidence references, and normalized signature strokes are persisted as operational inspection drafts. Submission validates the draft, calculates PASS/FAIL, creates relational checklist responses and defects, derives equipment state through the canonical safety helper, and commits the records in one repository write. The operational storage schema migrates existing version-one data in place while retaining the established `fieldsafe:operational-data:v1` storage key.

Photo evidence is simulated with the project-local `/evidence/hydraulic-hose-damage.png` asset. Operational storage contains only its small reference object, never image bytes.

## Simulated offline behavior

The Inspector header provides a deterministic Online/Offline demo toggle. Drafts and completed inspections continue to use the existing browser repository while Offline. An offline submission is persisted as `PENDING_SYNC`; returning Online presents a simulated syncing transition and persists the inspection as `SYNCED`. This prototype behavior does not use network detection, a service worker, IndexedDB, background sync, or a backend.

## Scripts

- `npm run dev` — start the Vite development server
- `npm run lint` — run ESLint
- `npm test` — validate seed consistency and persistence behavior
- `npm run build` — type-check and create the production build
- `npm run preview` — preview the production build

## Netlify deployment

FieldSafe deploys as a static Vite single-page application. The repository-level `netlify.toml` defines the complete Netlify configuration:

- Build command: `npm run build`
- Publish directory: `dist`
- SPA fallback: all unmatched paths rewrite to `/index.html` with a `200` response

The fallback allows BrowserRouter routes such as `/login`, `/inspector/profile`, `/supervisor/reviews`, `/manager/equipment/:id`, and `/gate` to load or refresh directly without returning a Netlify 404. Files in `public`, including `/evidence/hydraulic-hose-damage.png`, are copied into the production output by Vite.

No deployment environment variables, backend services, or Netlify Functions are required. Operational data and the active demo session remain in browser `localStorage`; they are specific to the deployed origin and browser, so local development data does not transfer to a Netlify deployment.
