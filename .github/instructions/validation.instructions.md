---
applyTo: '**'
---

# Validation & Schemas

## Shared Schemas (source of truth)

- All Zod schemas live in `packages/shared/src/validation/`
- Exported as factory functions: `schema(locale?: 'ar' | 'en')` — default `'ar'`
- Import from `@sahibalquran/shared` in both client and backend

## Backend

```ts
// ✅ inline call with 'en' — no local wrapper
@Body(new ZodValidationPipe(createGroupSchema('en'))) dto: CreateGroupDto
```

## Client Extensions

-if base schema not enough Create `modules/[module]/utils/[module].validation.ts` **only** for client-only

- Extend via `.extend()` or `.merge()` — never redefine from scratch

## Rules

- No validation logic in controllers or services
- DB constraints handle remaining edge cases
- Never duplicate a schema that already exists in `@sahibalquran/shared`
- All date types must be `ISODateOnlyString` or `ISODateString` from `@sahibalquran/shared`
