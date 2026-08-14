# FieldSafe

FieldSafe is a static React prototype foundation for field inspection and equipment safety experiences.

## Current scope

The application currently includes its visual foundation plus typed operational domain data, deterministic demo records, repository contracts, and device-local browser persistence. It intentionally contains no authentication, session state, product workflows, scanning, offline synchronization, analytics, or API integration.

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

## Data locations

- `src/domain` — framework-independent models and safety-state helpers
- `src/data/seed` — deterministic demo dataset factory
- `src/repositories` — asynchronous repository contract and browser implementation
- `src/storage` — JSON browser-storage adapter and storage-driver boundary
- `src/services` — application initialization and demo reset entry points

## Scripts

- `npm run dev` — start the Vite development server
- `npm run lint` — run ESLint
- `npm test` — validate seed consistency and persistence behavior
- `npm run build` — type-check and create the production build
- `npm run preview` — preview the production build
