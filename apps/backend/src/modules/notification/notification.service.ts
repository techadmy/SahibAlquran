import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  NotificationType,
  SendNotificationDto,
  NOTIFICATION_CHANNEL_CONFIG,
  NotificationDto,
  UnreadCountDto,
  CursorPaginationQuery,
  CursorPaginatedResult,
  NotificationPayloadMap,
} from '@sahibalquran/shared';
import {
  NOTIFICATION_CHANNEL_REGISTRY,
  type NotificationChannelRegistry,
} from './notification-channel.interface';
import { DatabaseService } from '../database/database.service';
import { OnEvent } from '@nestjs/event-emitter';
import { TypedEventEmitter } from './typed-event-emitter.service';
import { NOTIFICATION_EVENTS, type NotificationEvent } from './notification.events';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(NOTIFICATION_CHANNEL_REGISTRY)
    private registry: NotificationChannelRegistry,
    private db: DatabaseService,
    private typedEmitter: TypedEventEmitter
  ) {}

  @OnEvent(NOTIFICATION_EVENTS.SEND, { async: true })
  async handleNotificationEvent(event: NotificationEvent): Promise<void> {
    try {
      await this.send(event);

      const notification = await this.db.notification.findFirst({
        where: { recipientId: event.recipientId, type: event.type },
        orderBy: { createdAt: 'desc' },
      });

      if (notification) {
        const dto: NotificationDto = {
          id: notification.id,
          recipientId: notification.recipientId,
          type: notification.type as NotificationType,
          payload: notification.payload as NotificationDto['payload'],
          readAt: notification.readAt ? notification.readAt.toISOString() : null,
          createdAt: notification.createdAt.toISOString(),
        };
        this.typedEmitter.emitToUser(event.recipientId, dto);
      }
    } catch (error) {
      this.logger.error(`Failed to handle notification event for ${event.recipientId}:`, error);
    }
  }

  async send<T extends NotificationType>(dto: SendNotificationDto<T>): Promise<void> {
    const channelKeys = NOTIFICATION_CHANNEL_CONFIG[dto.type] as readonly string[];

    await Promise.allSettled(
      channelKeys.map((key) => {
        const channel = this.registry.get(key);
        if (!channel) {
          this.logger.warn(`Channel "${key}" not registered — skipped for type "${dto.type}"`);
          return Promise.resolve();
        }
        return channel.send(dto);
      })
    );
  }

  async getNotificationsForUser(
    userId: string,
    query: CursorPaginationQuery
  ): Promise<CursorPaginatedResult<NotificationDto[]>> {
    const limit = Number(query.limit ?? 20);

    try {
      const notifications = await this.db.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      });

      const hasMore = notifications.length > limit;
      const items = hasMore ? notifications.slice(0, limit) : notifications;

      return {
        data: items.map((n) => ({
          id: n.id,
          recipientId: n.recipientId,
          type: n.type as NotificationType,
          payload: n.payload as NotificationPayloadMap[NotificationType],
          readAt: n.readAt ? n.readAt.toISOString() : null,
          createdAt: n.createdAt.toISOString(),
        })),
        meta: {
          nextCursor: hasMore ? items[items.length - 1].id : null,
          hasMore,
        },
      };
    } catch (error) {
      // Invalid cursor - return empty result
      this.logger.warn(`Invalid cursor for user ${userId}:`, error);
      return {
        data: [],
        meta: { nextCursor: null, hasMore: false },
      };
    }
  }

  async getUnreadCount(userId: string): Promise<UnreadCountDto> {
    const count = await this.db.notification.count({
      where: {
        recipientId: userId,
        readAt: null,
      },
    });

    return { count };
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.db.notification.updateMany({
      where: {
        recipientId: userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }
}
