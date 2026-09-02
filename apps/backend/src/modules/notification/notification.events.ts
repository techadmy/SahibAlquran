import type { SendNotificationDto, NotificationType, NotificationDto } from '@sahibalquran/shared';

/**
 * Discriminated union of all notification event payloads
 */
export type NotificationEvent = {
  [K in NotificationType]: SendNotificationDto<K>;
}[NotificationType];

/**
 * Events map for type-safe event emitter
 * Maps: event name → payload type
 */
export interface NotificationEventsMap {
  'notification.send': NotificationEvent;
  // Dynamic per-user streams not included (handled separately in TypedEventEmitter)
}

/**
 * Event name constants
 */
export const NOTIFICATION_EVENTS = {
  SEND: 'notification.send' as const,
  userStream: (userId: string) => `notification.user.${userId}` as const,
} as const;

export type { NotificationDto };
