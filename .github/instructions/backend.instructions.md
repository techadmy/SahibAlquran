---
applyTo: 'apps/backend/**'
---

# Backend Rules

## Module Setup

- Reuse existing modules when possible
- Generate new: `nest g res modules/[name] --no-spec`
- Multi-domain workflows → dedicated Orchestrator module
- Don`t import database module in any other module because its already global and shared

## Orchestrator Modules

**When two services need cross-domain coordination, ALWAYS use a dedicated Orchestrator module.**

### Rules

1. **Never query another domain's tables directly** — Service B must never query tables owned by Service A
   - Each service owns its domain's database tables
   - Cross-domain reads go through the owning service or orchestrator
2. **Always create an Orchestrator for cross-domain workflows**:
   - Create dedicated `[DomainA]-[DomainB].orchestrator.ts` module
   - Orchestrator imports both services
   - Orchestrator coordinates cross-domain logic and transactions
   - Both domains remain independent and testable

## Guards & Decorators

- `AuthGuard` + `RolesGuard` are applied globally
- `@Public()` — bypass auth; `@Roles(...)` — restrict by role
- `@User()` — extract request user in controllers; never access `req.user` directly

## Validation

- `ZodValidationPipe` on route parameters only (`@Body(...)`, `@Param(...)`, `@Query(...)`)
- Import schemas from `@sahibalquran/shared`, call inline with `'en'` locale
- No validation logic in controllers or services — schemas + DB constraints only

## DTOs & Types

- All DTOs from `@sahibalquran/shared` — no local DTO files
- `DatesAsObjects` is backend-only — never import on client
- Customize via `Pick` / `Omit` / `Partial` only
- Every controller and service method must have an explicit return type

## File Uploads

**Required interceptor order:**

1. `FolderInterceptor(folder)` — sets `req.folder` for storage + you must use groupFolder helper to generate the folder name
2. `FileInterceptor('field')` — handles upload via `imageKitMulterStorage` it registerd automatically no need to pass option
3. Cleanup interceptor — removes file on error

Never set folder names inside `FileService` — folder belongs at the route level.
Read the uploaded URL from `file.url` — never construct it manually.

```ts
// ✅ correct order
@Post('cover')
@UseInterceptors(
  FolderInterceptor('groups'),
  FileInterceptor('image'),
  CleanupInterceptor,
)
async uploadCover(
  @UploadedFile() file: Express.Multer.File,
): Promise<GroupDto> {
  return this.service.updateCover(file.url); // use file.url directly
}
```

## Database

- Always use 1 round trip per query — use Prisma `include` / `select` relations instead of separate follow-up queries
- Prisma transactions for any DB multi-step / For Loop / multi-table write don`t use Promise.all
- Orchestrator modules wrap all related writes in a single `$transaction`
- No raw SQL unless Prisma cannot express the query
- **Never create `findXOrThrow` helpers** — let Prisma and the DB throw naturally (`update`/`delete` throw P2025 when record not found; use `findUniqueOrThrow` for explicit reads that require existence)
- **Side effects (notifications)** — use `EventEmitter2` from `@nestjs/event-emitter` to emit events (e.g., `NOTIFICATION_EVENTS.SEND`) after DB writes
- Emit events directly after the write — `NotificationService` handles them via `@OnEvent` decorator (saves to DB + pushes to SSE)
