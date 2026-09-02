import { Controller, Get, Patch, Query, Sse, UnauthorizedException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { TypedEventEmitter } from './typed-event-emitter.service';
import { JwtService } from '@nestjs/jwt';
import type { NotificationDto, UnreadCountDto, CursorPaginatedResult } from '@sahibalquran/shared';
import { User } from '../../decorators/user.decorator';
import { IsPublic } from '../../decorators/public.decorator';
import type { JWT_PAYLOAD } from '../auth/types/user-auth.type';
import { Observable } from 'rxjs';

interface MessageEvent {
  data: string;
}

@Controller('notifications')
export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private typedEmitter: TypedEventEmitter,
    private jwtService: JwtService
  ) {}

  @Get()
  getNotifications(
    @User('id') userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string
  ): Promise<CursorPaginatedResult<NotificationDto[]>> {
    return this.notificationService.getNotificationsForUser(userId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('unread-count')
  getUnreadCount(@User('id') userId: string): Promise<UnreadCountDto> {
    return this.notificationService.getUnreadCount(userId);
  }

  @Sse('stream')
  @IsPublic()
  stream(@Query('token') token: string): Observable<MessageEvent> {
    if (!token) {
      throw new UnauthorizedException();
    }

    let userId: string;
    try {
      const payload = this.jwtService.verify<JWT_PAYLOAD>(token);
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException();
    }

    return new Observable<MessageEvent>((subscriber) => {
      const handler = (notification: NotificationDto) => {
        subscriber.next({ data: JSON.stringify(notification) });
      };

      const cleanup = this.typedEmitter.onUserStream(userId, handler);

      return cleanup;
    });
  }

  @Patch('read-all')
  markAllAsRead(@User('id') userId: string): Promise<void> {
    return this.notificationService.markAllAsRead(userId);
  }
}
