import { NotificationType, SendNotificationDto } from '@sahibalquran/shared';

export const NOTIFICATION_CHANNEL_REGISTRY = Symbol('NOTIFICATION_CHANNEL_REGISTRY');

export type NotificationChannelRegistry = Map<string, INotificationChannel>;

export interface INotificationChannel {
  send<T extends NotificationType>(dto: SendNotificationDto<T>): Promise<void>;
}
