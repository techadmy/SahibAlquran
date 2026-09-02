---
applyTo: 'apps/backend/**'
---

# Database Conventions

- All DB column names use **snake_case** via `@map("column_name")` — model field names stay camelCase
- All table names use **snake_case plural** via `@@map("table_name")`
- **Arabic text fields** that are searchable must have a companion `nameNormalized` / `*Normalized` field storing the output of `normalizeArabic()` from `@sahibalquran/shared`
- Normalize at **write time** (create + update) using `normalizeArabic()` — never normalize in migrations or raw SQL
- Search queries must run against the normalized field using `contains` — never against the raw display field
- The `normalizeArabic` utility lives in `packages/shared/src/utils/arabic.util.ts` — import only from `@sahibalquran/shared`
- Add `@@index([*Normalized])` for every normalized field used in `contains` queries
