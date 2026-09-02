---
applyTo: '**'
---

# Pagination Rules

## Shared Types (`@sahibalquran/shared`)

- `PaginationQueryType` — input: `{ page: number; limit: number }` (defaults: `page=1`, `limit=10`)
- `PaginationResponseMeta` — response meta: `{ totalItems, totalPages, currentPage, itemsPerPage }`
- All paginated endpoints return `{ data: T[], meta: PaginationResponseMeta['meta'] }`

## Backend

- Controller: Accept `@Query('page')` and `@Query('limit')` as optional strings, cast to number with defaults
- Service: Use `DatabaseService.handleQueryPagination(query)` → returns `{ skip, take, page }` for Prisma
- Service: Use `DatabaseService.formatPaginationResponse({ page, count, limit })` → returns `{ data, meta }`
- Always run `count` query in parallel with `findMany` via `Promise.all` for performance

## Frontend

- ViewModel: Store `page` state; include `page` in `queryKey`; extract `totalPages` from `response.meta`
- Service: Build `URLSearchParams` with `page` and `limit`; append to GET endpoint query string
- View: Use `PaginationControls` component; pass `value={page}`, `totalPages`, `onValueChange={setPage}`, `disabled={isLoading}`
- Reset `page` to 1 when filters/tabs/search change (use `useEffect` or event handlers)
