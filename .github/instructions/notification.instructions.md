---
applyTo: '**'
---

# Notification System

## Architecture

- **Event-driven** — services emit typed events via `TypedEventEmitter` (global wrapper service); `NotificationService` listens with `@OnEvent`
- **Type-safe events** — `EventsModule` provides `TypedEventEmitter` globally (wraps `EventEmitter2` with compile-time type checking)
- **Pluggable channels** (IN_APP, PUSH, EMAIL) — channel routing declared in `NOTIFICATION_CHANNEL_CONFIG` from `@sahibalquran/shared`
- **Type-safe payloads** via `NotificationPayloadMap` — each notification type defines its own shape
- **SSE real-time push** — `@Sse` endpoint uses `TypedEventEmitter.onUserStream()` per-user events

## Sending Notifications

Services never call `NotificationService` directly. Instead, they inject `TypedEventEmitter` and emit typed events:

```ts
// In any service — inject TypedEventEmitter (globally available from NotificationModule)
import { TypedEventEmitter } from '../notification/typed-event-emitter.service';

export class AlertService {
  constructor(private readonly typedEmitter: TypedEventEmitter) {}

  async createAlert(...) {
    // Type-safe emit — event name + payload both type-checked
    this.typedEmitter.emit('notification.send', {
      type: 'ALERT_ASSIGNED',
      recipientId: userId,
      payload: { groupId, groupName, weekId, weekNumber, dayNumber },
    });
  }
}
```

`NotificationService` handles the event via `@OnEvent('notification.send', { async: true })`:

1. Writes to DB via channel routing (IN_APP channel)
2. Pushes to user's SSE stream via `typedEmitter.emitToUser(userId, dto)`
3. Client SSE invalidates type-specific queries via `NOTIFICATION_QUERY_INVALIDATION_MAP`

## SSE Endpoint

- `@Sse('stream')` + `@IsPublic()` — bypasses global `AuthGuard`
- Auth via `?token=` query param — manual `JwtService.verify()` since `EventSource` doesn't support headers
- Per-user streaming: uses `typedEmitter.onUserStream(userId, handler)` which returns cleanup function
- Client SSE invalidates type-specific queries via `NOTIFICATION_QUERY_INVALIDATION_MAP`:
  - `REQUEST_CREATED` → invalidates `queryKeys.requests.all`
  - `REQUEST_UPDATED` → invalidates `queryKeys.requests.all` + `queryKeys.requests.myList()`
  - `ALERT_ASSIGNED` → invalidates `queryKeys.wirds.all`
  - `LEARNER_DEACTIVATED` → invalidates `queryKeys.groups.all`

## Adding a New Type

1. **Define payload** in `@sahibalquran/shared/notification.types.ts`:

   ```ts
   export type NotificationPayloadMap = {
     NEW_TYPE: { field1: string; field2: number };
     // ...existing types
   };
   ```

2. **Add to channel config**:

   ```ts
   export const NOTIFICATION_CHANNEL_CONFIG = {
     NEW_TYPE: ['IN_APP'],
     // ...existing types
   };
   ```

3. **Add enum** to `prisma/schema.prisma`:

   ```prisma
   enum NotificationType {
     NEW_TYPE
     // ...existing values
   }
   ```

4. Run migration: `pnpm prisma migrate dev`

5. **Emit from service** using `TypedEventEmitter`:

   ```ts
   this.typedEmitter.emit('notification.send', {
     type: 'NEW_TYPE',
     recipientId: userId,
     payload: { field1: 'value', field2: 42 },
   });
   ```

6. **Client**: Add type to `NOTIFICATION_QUERY_INVALIDATION_MAP` in `notification.util.ts`
7. **Client**: Add message, icon, and path cases in `getNotificationMessage`, `getNotificationIcon`, and `getNotificationPath` in `notification.util.ts`
8. **Client**: Add color scheme entry for the new type in the `colorScheme` map inside `NotificationItem.tsx`

## Adding a New Channel

1. **Create channel** in `modules/notification/channels/`:

   ```ts
   export class PushNotificationChannel implements INotificationChannel {
     async send<T extends NotificationType>(dto: SendNotificationDto<T>) {
       // implementation
     }
   }
   ```

2. **Register** in `notification.module.ts`:
   - Add to `providers` array
   - Add to registry `Map`: `['PUSH', channels[1]]`
   - Add to `inject` array

Zero changes needed in `NotificationService` or any caller.

## NotificationModule (Type-Safe Event System)

`NotificationModule` is a **global module** imported once in `AppModule`. It provides:

- `EventEmitterModule.forRoot()` — NestJS event emitter configuration
- `TypedEventEmitter` — wrapper service with compile-time type safety (exported globally)
- `NotificationService` — handles notification persistence and SSE push
- Channel registry and in-app notification channel

**Usage**: Inject `TypedEventEmitter` anywhere, call `.emit()` / `.emitToUser()` / `.on()` / `.onUserStream()` with full type inference.

## Rules

- **Never inject `NotificationService` in other services** — use `TypedEventEmitter` + `.emit('notification.send', ...)`
- **Never inject raw `EventEmitter2`** — always use `TypedEventEmitter` for type safety
- All notification types in `@sahibalquran/shared` — never define locally
- Channel config is the single source of truth for routing
- Each event always includes `recipientId` + type-specific `payload`
- No business logic in channels — they only handle delivery
- Always use `TypedEventEmitter` — never raw `eventEmitter.emit()` for notifications

## Recipient Rules

- **`REQUEST_CREATED`** → group's moderator + all admins (when learner creates request)
- **`REQUEST_UPDATED`** → learner (when moderator/admin accepts/rejects)
- **`ALERT_ASSIGNED`** → learner (when alert created by cron)
- **`LEARNER_DEACTIVATED`** → group's moderator + all admins (when learner deactivated)

## Client Behavior

- **Auto mark-as-read**: When bell icon clicked with unread notifications, all are auto-marked as read
- **Navigation**: Click notification → navigate to relevant page (`REQUEST_*` → `/requests`, `ALERT_*`/`LEARNER_*` → `/groups/:id`)
- **Always show all**: Both read and unread notifications displayed (Facebook-style)
- **Cursor pagination**: Load more button at bottom when `hasMore`
- **Luxon time**: Relative time formatting via `DateTime.utc().diff()` (e.g., "منذ 5 د")
- **SSE invalidation**: Type-specific query key invalidation via `NOTIFICATION_QUERY_INVALIDATION_MAP`
