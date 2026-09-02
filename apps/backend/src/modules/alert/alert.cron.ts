import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AlertService } from './alert.service';
import { DatabaseService } from '../database/database.service';
import { dateToISODateOnly, addDaysToDateStr } from '@sahibalquran/shared';
import type { ISODateOnlyString } from '@sahibalquran/shared';
import type { Prisma } from 'generated/prisma/client';

@Injectable()
export class AlertCron {
  private readonly logger = new Logger(AlertCron.name);

  constructor(
    private readonly alertService: AlertService,
    private readonly db: DatabaseService
  ) {}

  /**
   * Alert cron job runs daily at 4:00 PM Asia/Riyadh timezone.
   * Cron expression: '0 16 * * 0-4,6' (Sun-Thu + Sat, skips Friday)
   *
   * Server must be set to Asia/Riyadh timezone (TZ=Asia/Riyadh env var).
   */
  @Cron('0 16 * * 0-4,6', {
    name: 'alert-processing',
    timeZone: 'Asia/Riyadh',
  })
  async processAlerts(): Promise<void> {
    this.logger.log('Starting alert processing cron job');

    try {
      await this.db.$transaction(async (tx) => {
        const now = new Date();
        const todayDateStr = dateToISODateOnly(now);

        // Determine which day to check based on current day
        const { checkDateStr, checkDayNumber, isSaturday } = this.calculateCheckDay(todayDateStr);

        this.logger.log(
          `Processing alerts for ${checkDateStr} (dayNumber: ${checkDayNumber}, isSaturday: ${isSaturday})`
        );

        // Get all ACTIVE groups (timezone already defaulted to Asia/Riyadh in DB)
        const groups = await tx.group.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true, name: true },
        });

        this.logger.log(`Found ${groups.length} active groups`);

        for (const group of groups) {
          await this.processGroupAlerts(
            tx,
            group.id,
            group.name,
            checkDateStr,
            checkDayNumber,
            isSaturday
          );
        }
      });

      this.logger.log('Alert processing completed successfully');
    } catch (error) {
      this.logger.error('Alert processing failed', error);
    }
  }

  /**
   * Calculate which day to check based on today:
   * - Saturday (6): Check Thursday (4) of previous week
   * - Other days: Check yesterday
   */
  private calculateCheckDay(todayStr: ISODateOnlyString): {
    checkDateStr: ISODateOnlyString;
    checkDayNumber: number;
    isSaturday: boolean;
  } {
    const today = new Date(todayStr + 'T00:00:00Z');
    const todayDayOfWeek = today.getUTCDay(); // 0=Sun, 6=Sat

    if (todayDayOfWeek === 6) {
      // Today is Saturday → check previous week's Thursday
      // Thursday was 2 days ago (Sat → Fri → Thu)
      const thursdayDateStr = addDaysToDateStr(todayStr, -2);
      return {
        checkDateStr: thursdayDateStr,
        checkDayNumber: 4, // Thursday
        isSaturday: true,
      };
    } else {
      // Other days → check yesterday
      const yesterdayDateStr = addDaysToDateStr(todayStr, -1);
      const yesterday = new Date(yesterdayDateStr + 'T00:00:00Z');
      const yesterdayDayOfWeek = yesterday.getUTCDay();

      // Map dayOfWeek to dayNumber (0=Sun, 1=Mon, ..., 4=Thu, 6=Sat)
      // No Friday (5) since we don't work Fridays
      return {
        checkDateStr: yesterdayDateStr,
        checkDayNumber: yesterdayDayOfWeek,
        isSaturday: false,
      };
    }
  }

  /**
   * Process alerts for a single group.
   */
  private async processGroupAlerts(
    tx: Prisma.TransactionClient,
    groupId: string,
    groupName: string,
    checkDateStr: ISODateOnlyString,
    checkDayNumber: number,
    isSaturday: boolean
  ): Promise<void> {
    // Find the week that contains checkDate
    const week = await tx.week.findFirst({
      where: {
        groupId,
        startDate: { lte: new Date(checkDateStr) },
        endDate: { gte: new Date(checkDateStr) },
      },
      select: {
        id: true,
        weekNumber: true,
        startDate: true,
      },
    });

    if (!week) {
      this.logger.debug(`No week found for group ${groupId} containing ${checkDateStr}`);
      return;
    }

    // Get all ACTIVE group members
    const members = await tx.groupMember.findMany({
      where: { groupId, status: 'ACTIVE', removedAt: null },
      select: { studentId: true },
    });

    this.logger.debug(
      `Processing ${members.length} active members for group ${groupName}, week ${week.weekNumber}`
    );

    const now = new Date();

    // Process attendance for the checkDay (e.g., Thursday on Saturday)
    for (const member of members) {
      await this.processMemberAlert(
        tx,
        member.studentId,
        groupId,
        groupName,
        week.id,
        week.weekNumber,
        checkDayNumber,
        now
      );
    }

    // If Saturday, check grace period deactivations for the week that just ended
    // On Saturday, 'week' is the previous week (contains Thursday we just checked)
    // Policy: 1+ alert in immediately previous week → deactivate on next Saturday
    if (isSaturday) {
      await this.processGracePeriodDeactivations(tx, groupId, week.id, week.weekNumber);
    }
  }

  /**
   * Process alert logic for a single member on a specific day.
   * Creates MISSED record and alert if no attendance record exists.
   * Checks for immediate deactivation (3 consecutive alerts in same week).
   */
  private async processMemberAlert(
    tx: Prisma.TransactionClient,
    studentId: string,
    groupId: string,
    groupName: string,
    weekId: string,
    weekNumber: number,
    dayNumber: number,
    now: Date
  ): Promise<void> {
    try {
      // Check if student has active excuse - skip if yes
      const activeExcuse = await tx.excuse.findFirst({
        where: { studentId, groupId, expiresAt: { gt: now } },
        select: { id: true },
      });
      if (activeExcuse) return;

      // Check if wird record exists for this day - skip if yes
      const wirdRecord = await tx.studentWird.findUnique({
        where: { studentId_weekId_dayNumber: { studentId, weekId, dayNumber } },
        select: { id: true },
      });
      if (wirdRecord) return;

      // No record found — create MISSED wird record and alert
      this.logger.log(
        `Creating MISSED record and alert for student ${studentId} in week ${weekNumber}, day ${dayNumber}`
      );

      // Create the MISSED wird record
      await tx.studentWird.create({
        data: {
          studentId,
          weekId,
          dayNumber,
          status: 'MISSED',
          recordedAt: now,
        },
      });

      // Create alert and send notification
      await this.alertService.createAlert(tx, studentId, groupId, weekId, dayNumber);

      // Check immediate deactivation threshold (3 consecutive alerts in same week)
      const wasDeactivated = await this.alertService.checkImmediateDeactivation(
        tx,
        studentId,
        groupId,
        weekId
      );

      if (wasDeactivated) {
        this.logger.warn(
          `Student ${studentId} deactivated immediately (3 consecutive alerts in week ${weekNumber})`
        );
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        this.logger.debug(`Alert already exists for student ${studentId}, day ${dayNumber}`);
      } else {
        this.logger.error(`Failed to process member ${studentId}`, error);
      }
    }
  }

  /**
   * On Saturday, check grace period deactivations for the week that just ended.
   * Policy: If a learner has 1+ alert in the immediately previous week (the week that
   * just ended), they should be deactivated on this Saturday (after one-week grace period).
   *
   * @param previousWeekId - The ID of the week that just ended (contains Thursday we just checked)
   */
  private async processGracePeriodDeactivations(
    tx: Prisma.TransactionClient,
    groupId: string,
    previousWeekId: string,
    previousWeekNumber: number
  ): Promise<void> {
    // Get all ACTIVE members in the group
    const members = await tx.groupMember.findMany({
      where: { groupId, status: 'ACTIVE', removedAt: null },
      select: { studentId: true },
    });

    this.logger.debug(
      `Checking grace period for ${members.length} members in week ${previousWeekNumber} (weekId: ${previousWeekId})`
    );

    // Check each member for deactivation based on alerts in the previous week
    for (const member of members) {
      const wasDeactivated = await this.alertService.checkGracePeriodDeactivation(
        tx,
        member.studentId,
        groupId,
        previousWeekId
      );

      if (wasDeactivated) {
        this.logger.warn(
          `Student ${member.studentId} deactivated after grace period (1+ alerts in week ${previousWeekNumber})`
        );
      }
    }
  }
}
