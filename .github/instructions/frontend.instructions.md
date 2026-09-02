---
applyTo: 'apps/client/**'
---

# Frontend Rules

## Module Structure

```
src/modules/[module]/
├── index.ts              # public barrel — only export what other modules need
├── components/           # module-specific UI
├── hooks/                # ViewModels
├── services/             # API functions (no hooks)
└── utils/                # keys, validation helpers
```

- `src/components/ui` — app-wide primitives only, no business logic
- Cross-module imports only via `src/modules/[module]/index.ts` — never deep-import

## MVVM

- **View** — JSX only, no logic, no state, no side effects
- **ViewModel** (`hooks/`) — all logic, state, handlers; pass prepared values + callbacks to view
- Keep components small; split early
- **Multiple VMs allowed** — large child components get their own ViewModel; don't funnel all state through the parent VM
- A child VM receives only what it needs (e.g. `groupId`, `isOpen`) — never a fat props list of handlers

## Components

- No native HTML elements — shadcn or reusable components only
- No inline styles, no excessive wrapper divs
- No `useEffect` unless truly no safer alternative

## Forms

- `react-hook-form` for every form — no exceptions
- Zod resolver using schemas from `@sahibalquran/shared`
- always Use `FormField` (`src/components/forms/form-field.tsx`) for all fields and create only if absolutely necessary

## Routing

- React Router v7
- Protect routes with `ProtectedLayout` / `withRole` HOC

## Types

- always use types from `@sahibalquran/shared` for DTOs
- if you must create a new type, also import from `@sahibalquran/shared` and use utility types to create the new type (e.g. `Pick`, `Omit`, etc.) — never duplicate properties
