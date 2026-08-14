# FieldSafe

FieldSafe is a static React prototype foundation for field inspection and equipment safety experiences.

## Current scope

The application currently includes its visual foundation, typed operational domain data, deterministic demo records, repository contracts, device-local browser persistence, and simulated role-based authentication. It intentionally contains no production authentication, product workflows, scanning, offline synchronization, analytics, or API integration.

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

## Demo authentication

Interactive seeded users can sign in from `/login` with the shared password `demo123`. The two Inspectors, Supervisor, and Manager are available in the on-screen Demo Accounts list. The seeded Technician remains a supporting data actor and cannot sign in to an application workspace.

Logout clears only `fieldsafe:session:v1`; operational data is preserved. Resetting operational demo data does not clear a valid session because deterministic user IDs remain stable.

## Scripts

- `npm run dev` — start the Vite development server
- `npm run lint` — run ESLint
- `npm test` — validate seed consistency and persistence behavior
- `npm run build` — type-check and create the production build
- `npm run preview` — preview the production build
