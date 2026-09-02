---
applyTo: '**'
---

# Date & Time Rules

## Storage & Transfer

- Store all timestamps in DB as UTC
- Return date values from API exactly as stored (UTC) — no server-side timezone conversion
- Week `startDate` is always Saturday; `endDate` = start + 5 days

## Display

- Use `User.timezone` for all UI date rendering
- `dayNumber` is 0-indexed: 0 = Sunday, 5 = Thursday — **no Friday (6)**

## Utilities

- Use **only** `date.util` (Luxon-based) from `@sahibalquran/shared` for all date logic
- Use **only** `timezone.util` from `@sahibalquran/shared` for timezone operations
- Do **not** install or import any date library (`dayjs`, `date-fns`, `moment`) in `apps/client` or `apps/backend`
- create new utility functions in `@sahibalquran/shared` if needed — no local date logic in client or backend

## types

- any date type must be ISODateOnlyString or ISODateString from `@sahibalquran/shared`
