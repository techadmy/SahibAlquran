import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TypedEventEmitter } from '../notification/typed-event-emitter.service';
import type { Prisma } from 'generated/prisma/client';

// Week runs Sat(6) -> Sun(0) -> Mon(1) -> Tue(2) -> Wed(3) -> Thu(4); no Friday.
const WEEK_DAY_ORDER: readonly number[] = [6, 0, 1, 2, 3, 4];

@Injectable()
export class AlertService {
  constructor(
    private readonly db: DatabaseService,
    private readonly typedEmitter: TypedEventEmitter
  ) {}

  /**
   * Creates an alert for a missed day. Unique constraint on (studentId, weekId, dayNumber)
   * prevents duplicate alerts. Queues ALERT_ASSIGNED notification to learner.
   */
  async createAlert(
    tx: Prisma.TransactionClient,
    studentId: string,
    groupId: string,
    weekId: string,
    dayNumber: number
  ): Promise<void> {
    await tx.alert.create({
      data: { studentId, groupId, weekId, dayNumber },
    });

    // Fetch group and week details for notification payload
    const group = await tx.group.findUnique({ where: { id: groupId }, select: { name: true } });
    const week = await tx.week.findUnique({ where: { id: weekId }, select: { weekNumber: true } });

    if (group && week) {
      this.typedEmitter.emit('notification.send', {
        type: 'ALERT_ASSIGNED',
        recipientId: studentId,
        payload: {
          groupId,
          groupName: group.name,
          weekId,
          weekNumber: week.weekNumber,
          dayNumber,
        },
      });
    }
  }

  /**
   * Count alerts for a specific student in a specific week.
   */
  async getWeekAlertCount(studentId: string, weekId: string): Promise<number> {
    return this.db.alert.count({
      where: { studentId, weekId },
    });
  }

  /**
   * Count the number of distinct weeks where the student has at least one alert.
   */
  async countWeeksWithAlerts(studentId: string, groupId: string): Promise<number> {
    const result = await this.db.alert.groupBy({
      by: ['weekId'],
      where: { studentId, groupId },
      _count: { weekId: true },
    });
    return result.length;
  }

  /**
   * Delete a specific alert when a late record is submitted (yellow cancels red).
   */
  async deleteWeekDayAlert(studentId: string, weekId: string, dayNumber: number): Promise<void> {
    await this.db.alert.deleteMany({
      where: { studentId, weekId, dayNumber },
    });
  }

  /**
   * Check for immediate deactivation threshold:
   * 3 consecutive missed days (sequential dayNumbers) in the same week.
   * Called after every alert creation.
   * Returns true if deactivation occurred.
   */
  async checkImmediateDeactivation(
    tx: Prisma.TransactionClient,
    studentId: string,
    groupId: string,
    weekId: string
  ): Promise<boolean> {
    const now = new Date();
    const activeExcuse = await tx.excuse.findFirst({
      where: { studentId, groupId, expiresAt: { gt: now } },
      select: { id: true },
    });
    if (activeExcuse) return false;

    const weekAlerts = await tx.alert.findMany({
      where: { studentId, weekId },
      select: { dayNumber: true },
    });

    // Map dayNumber (0=Sun..4=Thu, 6=Sat) to its position in the week order
    // (Sat, Sun, Mon, Tue, Wed, Thu) so consecutiveness accounts for the
    // Sat(6) -> Sun(0) wraparound at the start of the week.
    const positions = weekAlerts
      .map((a) => WEEK_DAY_ORDER.indexOf(a.dayNumber))
      .sort((a, b) => a - b);

    const hasThreeConsecutive = positions.some(
      (pos, i) => positions[i + 1] === pos + 1 && positions[i + 2] === pos + 2
    );

    if (hasThreeConsecutive) {
      await tx.groupMember.update({
        where: { groupId_studentId: { groupId, studentId } },
        data: { status: 'INACTIVE' },
      });

      await this.emitDeactivationNotifications(studentId, groupId, tx);
      return true;
    }

    return false;
  }

  /**
   * Check for grace period deactivation (>= 1 alert in immediately previous week).
   * Called only on Saturday, checks the week that just ended.
   * Returns true if deactivation occurred.
   */
  async checkGracePeriodDeactivation(
    tx: Prisma.TransactionClient,
    studentId: string,
    groupId: string,
    previousWeekId: string
  ): Promise<boolean> {
    const now = new Date();
    const activeExcuse = await tx.excuse.findFirst({
      where: { studentId, groupId, expiresAt: { gt: now } },
      select: { id: true },
    });
    if (activeExcuse) return false;

    const prevWeekAlertCount = await tx.alert.count({
      where: { studentId, weekId: previousWeekId },
    });

    if (prevWeekAlertCount >= 1) {
      await tx.groupMember.update({
        where: { groupId_studentId: { groupId, studentId } },
        data: { status: 'INACTIVE' },
      });

      await this.emitDeactivationNotifications(studentId, groupId, tx);
      return true;
    }

    return false;
  }

  /**
   * Queue deactivation notifications to all admins and the group moderator.
   */
  private async emitDeactivationNotifications(
    studentId: string,
    groupId: string,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    const student = await tx.user.findUnique({ where: { id: studentId }, select: { name: true } });
    const group = await tx.group.findUnique({
      where: { id: groupId },
      select: { name: true, moderatorId: true },
    });
    const admins = await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });

    if (!student || !group) return;

    const recipientIds = new Set<string>(admins.map((a) => a.id));
    if (group.moderatorId) recipientIds.add(group.moderatorId);

    // Only send notifications if there are recipients
    if (recipientIds.size === 0) return;

    const payload = { studentId, studentName: student.name, groupId, groupName: group.name };

    for (const recipientId of recipientIds) {
      this.typedEmitter.emit('notification.send', {
        type: 'LEARNER_DEACTIVATED',
        recipientId,
        payload,
      });
    }
  }
}
