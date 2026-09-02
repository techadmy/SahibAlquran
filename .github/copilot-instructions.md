# SahibAlquran

Arabic web app for tracking daily Quran recitation (wird) in study groups. Learners record حفظ / مراجعة / تلاوة with their assigned mate, Saturday → Thursday.

## Monorepo

| Path              | Purpose                                                 |
| ----------------- | ------------------------------------------------------- |
| `apps/client`     | React 19, Vite, Tailwind v4, shadcn/ui, React Router v7 |
| `apps/backend`    | NestJS                                                  |
| `packages/shared` | Single source of truth — DTOs, schemas, utils           |

## Domain

- **Roles:** `ADMIN` / `MODERATOR` / `STUDENT`
- **Week:** Saturday → Thursday (`dayNumber` 0–5, 0 = Sunday, no Friday)
- **StudentWird:** one record per student/day/week — `ATTENDED` / `MISSED` / `LATE`
- **GroupMember:** student + optional mate (الزميل)
- **Request:** `EXCUSE` or `ACTIVATION`, reviewed by moderator

## Global Rules

- `packages/shared` is the single source of truth — no DTO duplication
- Customize types via `Pick` / `Omit` / `Partial` only
- No READMEs, no inline styles, no native HTML elements
- Modular, DRY, strict separation — Consistency > creativity

## Checklist

- [ ] Module structure respected
- [ ] No duplicated types
- [ ] MVVM respected
- [ ] shadcn + CVA only
- [ ] Semantic tokens + minimal Tailwind
- [ ] `useApiQuery` / `useApiMutation` only
- [ ] Cache invalidated after mutations
- [ ] `ConfirmDialog` + `toast` on every mutation
- [ ] Validation via Zod schemas from `@sahibalquran/shared` only
- [ ] No validation logic in controllers or services — schemas + DB constraints only
- [ ] always go with the simplest solution, and readable code and reusable functions, even if it means more lines of code with typesafety and maintainability benefits
  > Detailed rules per domain: see `.github/instructions/`
