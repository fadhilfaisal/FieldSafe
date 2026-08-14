# FieldSafe

FieldSafe is a static React prototype foundation for field inspection and equipment safety experiences.

## Current scope

This increment contains application shells, routing, design tokens, and shared UI primitives only. It intentionally contains no authentication, operational data, persistence, domain logic, repository implementation, scanning, inspection workflow, analytics, or API integration.

## Architecture direction

Future application behavior should follow this dependency direction:

```text
UI → service/domain logic → repository contracts → browser-storage adapters
```

- Pages and UI components should call services or hooks, never browser storage directly.
- Domain types and rules should remain independent of React and storage details.
- Repository contracts should live separately from their browser-storage implementations.
- Seed/demo data, if introduced later, should enter through repository boundaries rather than component imports.
- New layer directories should be created when they gain real implementation; empty placeholder files are intentionally omitted.

## Scripts

- `npm run dev` — start the Vite development server
- `npm run lint` — run ESLint
- `npm run build` — type-check and create the production build
- `npm run preview` — preview the production build
