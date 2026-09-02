import { Injectable } from '@nestjs/common';
import { NotificationType, SendNotificationDto } from '@sahibalquran/shared';
import { INotificationChannel } from '../notification-channel.interface';
import { DatabaseService } from '../../database/database.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class InAppNotificationChannel implements INotificationChannel {
  constructor(private db: DatabaseService) {}

  async send<T extends NotificationType>(dto: SendNotificationDto<T>): Promise<void> {
    await this.db.notification.create({
      data: {
        recipientId: dto.recipientId,
        type: dto.type,
        payload: dto.payload as Prisma.InputJsonValue,
      },
    });
  }
}
