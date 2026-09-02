import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type {
  GroupMemberDto,
  GroupWirdTrackingDto,
  GroupWirdTrackingRowDto,
  DayWirdDto,
  LearnerGroupOverviewDto,
  RecordableDayStatus,
  RecordLearnerWirdDto,
  RecordedWirdStatus,
  WeekStatusFlagsDto,
  WeekWithCurrentFlagDto,
  ISODateOnlyString,
  ISODateString,
  StudentWeekWirdsDto,
  StudentDayWird,
  UpdateStudentWirdsDto,
  TimeMinutes,
  TimeZoneType,
} from '@sahibalquran/shared';
import {
  getNowAsUTC,
  addDaysToDateStr,
  dateToISODateOnly,
  combineDateTime,
  getStartAndEndOfDay,
  isSaturday,
} from '@sahibalquran/shared';
import { DatabaseService } from '../database/database.service';
import { AlertService } from '../alert/alert.service';

/** Arabic display order: Sat(6) → Sun(0) → Mon(1) → Tue(2) → Wed(3) → Thu(4) */
const DISPLAY_DAY_ORDER = [6, 0, 1, 2, 3, 4] as const;

/** 4:00 PM as minutes from midnight */
const FOUR_PM: TimeMinutes = (16 * 60) as TimeMinutes;

type LocalReadSourceType =
  | 'DEFAULT_GROUP_MATE'
  | 'DIFFERENT_GROUP_MATE'
  | 'OUTSIDE_GROUP'
  | 'MANUAL';

type WirdRecord = {
  dayNumber: number;
  status: string;
  readSource: string;
  readOnMateId: string | null;
  readOnMate: { name: string } | null;
  recordedAt: Date;
};

function toRecordedStatus(status: string): RecordedWirdStatus | null {
  if (status === 'ATTENDED' || status === 'MISSED' || status === 'LATE') return status;
  return null;
}

function normalizeReadSource(value: string): LocalReadSourceType {
  if (
    value === 'DEFAULT_GROUP_MATE' ||
    value === 'DIFFERENT_GROUP_MATE' ||
    value === 'OUTSIDE_GROUP' ||
    value === 'MANUAL'
  ) {
    return value;
  }

  return 'DEFAULT_GROUP_MATE';
}

function isPendingWirdStatus(status: DayWirdDto['wirdStatus']): boolean {
  return status === 'EMPTY' || status === 'MISSED';
}

@Injectable()
export class StudentWirdService {
  constructor(
    private readonly db: DatabaseService,
    private readonly alertService: AlertService
  ) {}

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Builds the 6-day display array for one student.
   * Extracted so both getWeekTracking and getLearnerGroupOverview share the same logic.
   */
  private buildStudentDays(
    wirds: WirdRecord[],
    startStr: ISODateOnlyString,
    todayUTC: ISODateOnlyString
  ): DayWirdDto[] {
    return DISPLAY_DAY_ORDER.map((dayNum) => {
      const record = wirds.find((w) => w.dayNumber === dayNum);
      const offset = (dayNum + 1) % 7;
      const dayDate = addDaysToDateStr(startStr, offset);
      const wirdStatus = record
        ? (toRecordedStatus(record.status) ?? 'EMPTY')
        : dayDate > todayUTC
          ? 'FUTURE'
          : 'EMPTY';

      if (!record) return { dayNumber: dayNum, wirdStatus };

      return {
        dayNumber: record.dayNumber,
        wirdStatus,
        readSource: normalizeReadSource(String(record.readSource)),
        readOnMateId: record.readOnMateId ?? undefined,
        readOnMateName: record.readOnMate?.name ?? undefined,
        recordedAt: record.recordedAt.toISOString() as ISODateString,
      };
    });
  }

  /**
   * Selects which week to display for the learner overview.
   *
   * On Saturday the new week just started, but the learner may still have an
   * unrecorded Thursday from the previous week (window extends to Sat 4 PM).
   * In that case we keep showing the previous week until every applicable day
   * has a DB record (ATTENDED, LATE, or MISSED).  Only then do we advance to
   * the newly-started week.
   *
   * Any other day: return the most recent started week as before.
   */
  private async selectLearnerWeek(
    groupId: string,
    studentId: string,
    memberJoinedAt: Date,
    now: Date
  ) {
    const todayUTC = dateToISODateOnly(now);

    if (!isSaturday(todayUTC)) {
      return this.db.week.findFirst({
        where: { groupId, startDate: { lte: now } },
        include: { scheduleImage: true },
        orderBy: { weekNumber: 'desc' },
      });
    }

    // Saturday: fetch the two most recent started weeks
    const recentWeeks = await this.db.week.findMany({
      where: { groupId, startDate: { lte: now } },
      include: { scheduleImage: true },
      orderBy: { weekNumber: 'desc' },
      take: 2,
    });

    const weeksWithImage = recentWeeks.filter((w) => w.scheduleImage);
    const [currentWeek, prevWeek] = weeksWithImage;

    // Only one week exists (first-ever Saturday of the group) — nothing to compare
    if (!prevWeek) return currentWeek ?? null;

    // Check if the previous week has any day with no DB record for this student
    const prevWirds = await this.db.studentWird.findMany({
      where: { weekId: prevWeek.id, studentId },
      select: { dayNumber: true },
    });

    const recordedDays = new Set(prevWirds.map((w) => w.dayNumber));
    const joinedAtStr = dateToISODateOnly(memberJoinedAt);
    const prevStartStr = dateToISODateOnly(prevWeek.startDate);

    const hasMissingRecord = DISPLAY_DAY_ORDER.some((dayNum) => {
      const dayDate = addDaysToDateStr(prevStartStr, (dayNum + 1) % 7);
      // Only days the student was already a member for
      return dayDate >= joinedAtStr && !recordedDays.has(dayNum);
    });

    return hasMissingRecord ? prevWeek : (currentWeek ?? prevWeek);
  }

  /** Finds the oldest EMPTY day still recordable within the allowed window. */
  private computeRecordableDay(
    days: DayWirdDto[],
    startStr: ISODateOnlyString,
    groupTimezone: string,
    now: Date,
    joinedAt: Date
  ): RecordableDayStatus {
    const joinedAtStr = dateToISODateOnly(joinedAt);
    const allowedDays = days.filter((day) => {
      const dayDate = addDaysToDateStr(startStr, (day.dayNumber + 1) % 7);
      return dayDate >= joinedAtStr;
    });

    for (const day of allowedDays) {
      if (!isPendingWirdStatus(day.wirdStatus)) continue;

      const dayDate = addDaysToDateStr(startStr, (day.dayNumber + 1) % 7);
      const nextDayOffset = day.dayNumber === 4 ? 2 : 1; // Thu → Sat (+2), others → next day (+1)
      const deadline = combineDateTime(
        addDaysToDateStr(dayDate, nextDayOffset),
        FOUR_PM,
        groupTimezone
      );

      return {
        status: 'available',
        dayNumber: day.dayNumber,
        isLate: day.wirdStatus === 'MISSED' || now.toISOString() > deadline,
      };
    }

    return {
      status: 'none',
      reason: allowedDays.every((d) => d.wirdStatus === 'FUTURE') ? 'upcoming' : 'all_recorded',
    };
  }

  // ─── Admin / Moderator Methods ───────────────────────────────────────────────

  async getGroupWeeks(groupId: string): Promise<WeekWithCurrentFlagDto[]> {
    const weeks = await this.db.week.findMany({
      where: { groupId },
      include: { scheduleImage: true },
      orderBy: { weekNumber: 'asc' },
    });

    const todayUTC = getNowAsUTC().split('T')[0] as ISODateOnlyString;

    const mapped = weeks
      .filter((week) => week.scheduleImage)
      .map((week): WeekWithCurrentFlagDto => {
        const img = week.scheduleImage!;
        const startStr = dateToISODateOnly(week.startDate);
        const endStr = dateToISODateOnly(week.endDate);
        const isCurrent = todayUTC >= startStr && todayUTC <= endStr;
        const isUpcoming = startStr > todayUTC;

        return {
          id: week.id,
          groupId: week.groupId,
          weekNumber: week.weekNumber,
          startDate: startStr,
          endDate: endStr,
          createdAt: week.createdAt.toISOString() as ISODateString,
          scheduleImage: {
            id: img.id,
            weekId: img.weekId,
            name: img.name,
            imageUrl: img.imageUrl,
            createdAt: img.createdAt.toISOString() as ISODateString,
          },
          isCurrent,
          isUpcoming,
          isDefault: false,
        };
      });

    // On Saturday (new week just started) and Friday (between weeks), the last
    // completed week is always the most useful default — not the brand-new or
    // upcoming one.  All other days use the current week as normal.
    const isTodaySaturday = isSaturday(todayUTC);
    const tomorrowUTC = addDaysToDateStr(todayUTC, 1);
    const isTodayFriday = mapped.some((w) => w.startDate === tomorrowUTC);
    const lastCompletedWeek = [...mapped].reverse().find((w) => w.endDate < todayUTC);

    const defaultWeek =
      isTodaySaturday || isTodayFriday
        ? (lastCompletedWeek ?? mapped.find((w) => w.isCurrent) ?? mapped[mapped.length - 1])
        : (mapped.find((w) => w.isCurrent) ?? lastCompletedWeek ?? mapped[mapped.length - 1]);
    if (defaultWeek) defaultWeek.isDefault = true;

    return mapped;
  }

  async getWeekTracking(groupId: string, weekId: string): Promise<GroupWirdTrackingDto> {
    const now = new Date();
    const week = await this.db.week.findUniqueOrThrow({ where: { id: weekId } });

    const members = await this.db.groupMember.findMany({
      where: { groupId, removedAt: null },
      include: { student: true, mate: true },
      orderBy: { joinedAt: 'asc' },
    });

    const wirds = await this.db.studentWird.findMany({
      where: { weekId, week: { groupId } },
      include: { readOnMate: true },
    });

    const weekAlertCounts = await this.db.alert.findMany({
      where: { weekId },
      select: { studentId: true },
    });

    const totalAlertCounts = await this.db.alert.findMany({
      where: { groupId },
      select: { studentId: true },
    });

    const activeExcuses = await this.db.excuse.findMany({
      where: { groupId, expiresAt: { gt: now } },
    });

    const startStr = dateToISODateOnly(week.startDate);
    const todayUTC = getNowAsUTC().split('T')[0] as ISODateOnlyString;

    const wirdMap = new Map<string, typeof wirds>();
    for (const wird of wirds) {
      if (!wirdMap.has(wird.studentId)) wirdMap.set(wird.studentId, []);
      wirdMap.get(wird.studentId)!.push(wird);
    }

    const weekAlertMap = new Map<string, number>();
    for (const entry of weekAlertCounts) {
      weekAlertMap.set(entry.studentId, (weekAlertMap.get(entry.studentId) ?? 0) + 1);
    }

    const totalAlertMap = new Map<string, number>();
    for (const entry of totalAlertCounts) {
      totalAlertMap.set(entry.studentId, (totalAlertMap.get(entry.studentId) ?? 0) + 1);
    }

    const activeExcuseMap = new Map<string, ISODateString>();
    for (const excuse of activeExcuses) {
      activeExcuseMap.set(excuse.studentId, excuse.expiresAt.toISOString() as ISODateString);
    }

    const typedMembers = members as Array<{
      id: string;
      studentId: string;
      mateId: string | null;
      status: 'ACTIVE' | 'INACTIVE';
      student: { name: string; notes: string | null };
      mate: { name: string } | null;
    }>;

    const rows: GroupWirdTrackingRowDto[] = typedMembers.map((member) => {
      const days = this.buildStudentDays(wirdMap.get(member.studentId) ?? [], startStr, todayUTC);

      return {
        memberId: member.id,
        studentId: member.studentId,
        studentName: member.student.name,
        studentStatus: member.status,
        mateId: member.mateId ?? undefined,
        mateName: member.mate?.name ?? undefined,
        studentNotes: member.student.notes ?? undefined,
        days,
        weekAlertCount: weekAlertMap.get(member.studentId) ?? 0,
        totalAlertCount: totalAlertMap.get(member.studentId) ?? 0,
        activeExcuseExpiresAt: activeExcuseMap.get(member.studentId),
      };
    });

    return { weekId, rows };
  }

  async getStudentWeekWirds(studentId: string, weekId: string): Promise<StudentWeekWirdsDto> {
    const [week, studentWirds] = await this.db.$transaction([
      this.db.week.findUniqueOrThrow({ where: { id: weekId } }),
      this.db.studentWird.findMany({ where: { studentId, weekId } }),
    ]);

    const todayUTC = getNowAsUTC().split('T')[0] as ISODateOnlyString;
    const startStr = dateToISODateOnly(week.startDate);
    const wirdByDay = new Map(studentWirds.map((w) => [w.dayNumber, w]));

    const days: StudentDayWird[] = DISPLAY_DAY_ORDER.map((dayNum) => {
      const offset = (dayNum + 1) % 7;
      const dayDate = addDaysToDateStr(startStr, offset);
      const record = wirdByDay.get(dayNum);
      return {
        dayNumber: dayNum,
        recordedStatus: record ? toRecordedStatus(record.status) : null,
        isBlocked: dayDate > todayUTC,
      };
    });

    return { studentId, weekId, days };
  }

  async updateStudentWeekWirds(
    studentId: string,
    weekId: string,
    dto: UpdateStudentWirdsDto
  ): Promise<void> {
    const now = new Date();
    await this.db.$transaction(
      dto.updates.map((update) =>
        this.db.studentWird.upsert({
          where: { studentId_weekId_dayNumber: { studentId, weekId, dayNumber: update.dayNumber } },
          create: {
            studentId,
            weekId,
            dayNumber: update.dayNumber,
            status: update.status,
            readSource: 'MANUAL',
            readOnMateId: null,
            recordedAt: now,
          },
          update: {
            status: update.status,
            readSource: 'MANUAL',
            readOnMateId: null,
            recordedAt: now,
          },
        })
      )
    );
  }

  // ─── Learner Self-Recording Methods ─────────────────────────────────────────

  async getLearnerGroupOverview(
    groupId: string,
    studentId: string
  ): Promise<LearnerGroupOverviewDto> {
    const now = new Date();
    const todayUTC = dateToISODateOnly(now);

    const group = await this.db.group.findUniqueOrThrow({
      where: { id: groupId },
      select: { id: true, status: true, timezone: true, awrad: true },
    });

    const member = await this.db.groupMember.findFirst({
      where: { groupId, studentId },
      include: { student: true, mate: true },
    });

    if (!member) {
      return { type: 'nothing', reason: 'not_member' };
    }

    if (member.removedAt) {
      return { type: 'nothing', reason: 'removed' };
    }

    const membership = member as {
      id: string;
      groupId: string;
      studentId: string;
      mateId: string | null;
      status: 'ACTIVE' | 'INACTIVE';
      joinedAt: Date;
      removedAt: Date | null;
      removedBy: string | null;
      student: { name: string; phone: string; timezone: string; notes: string | null };
      mate: { name: string } | null;
    };

    // Select the correct week for the learner.
    // On Saturday, we prefer the previous week when it still has unrecorded days.
    const week = await this.selectLearnerWeek(groupId, studentId, membership.joinedAt, now);

    if (!week?.scheduleImage) {
      return { type: 'nothing', reason: 'no_week' };
    }

    const members = await this.db.groupMember.findMany({
      where: { groupId, removedAt: null },
      include: { student: true, mate: true },
      orderBy: { joinedAt: 'asc' },
    });

    const allWirds = await this.db.studentWird.findMany({
      where: { weekId: week.id },
      include: { readOnMate: true },
    });

    const weekAlertCounts = await this.db.alert.findMany({
      where: { weekId: week.id },
      select: { studentId: true },
    });

    const totalAlertCounts = await this.db.alert.findMany({
      where: { groupId },
      select: { studentId: true },
    });

    const activeExcuses = await this.db.excuse.findMany({
      where: { groupId, expiresAt: { gt: now } },
      orderBy: { expiresAt: 'desc' },
      select: { studentId: true, expiresAt: true },
    });

    const typedMembers = members as Array<{
      id: string;
      groupId: string;
      studentId: string;
      mateId: string | null;
      status: 'ACTIVE' | 'INACTIVE';
      joinedAt: Date;
      removedAt: Date | null;
      removedBy: string | null;
      student: { name: string; phone: string; timezone: string; notes: string | null };
      mate: { name: string } | null;
    }>;

    const trackedMember = typedMembers.find((m) => m.studentId === studentId) ?? {
      id: membership.id,
      groupId: membership.groupId,
      studentId: membership.studentId,
      mateId: membership.mateId,
      status: membership.status,
      joinedAt: membership.joinedAt,
      removedAt: membership.removedAt,
      removedBy: membership.removedBy,
      student: {
        name: membership.student.name,
        phone: membership.student.phone,
        timezone: membership.student.timezone,
        notes: membership.student.notes,
      },
      mate: membership.mate ? { name: membership.mate.name } : null,
    };

    const startStr = dateToISODateOnly(week.startDate);
    const endStr = dateToISODateOnly(week.endDate);

    const wirdMap = new Map<string, typeof allWirds>();
    for (const wird of allWirds) {
      if (!wirdMap.has(wird.studentId)) wirdMap.set(wird.studentId, []);
      wirdMap.get(wird.studentId)!.push(wird);
    }

    const weekAlertMap = new Map<string, number>();
    for (const entry of weekAlertCounts) {
      weekAlertMap.set(entry.studentId, (weekAlertMap.get(entry.studentId) ?? 0) + 1);
    }

    const totalAlertMap = new Map<string, number>();
    for (const entry of totalAlertCounts) {
      totalAlertMap.set(entry.studentId, (totalAlertMap.get(entry.studentId) ?? 0) + 1);
    }

    const activeExcuseMap = new Map<string, ISODateString>();
    for (const excuse of activeExcuses) {
      if (!activeExcuseMap.has(excuse.studentId)) {
        activeExcuseMap.set(excuse.studentId, excuse.expiresAt.toISOString() as ISODateString);
      }
    }

    const rows: GroupWirdTrackingRowDto[] = typedMembers.map((groupMember) => ({
      memberId: groupMember.id,
      studentId: groupMember.studentId,
      studentName: groupMember.student.name,
      studentStatus: groupMember.status,
      mateId: groupMember.mateId ?? undefined,
      mateName: groupMember.mate?.name ?? undefined,
      studentNotes: groupMember.student.notes ?? undefined,
      days: this.buildStudentDays(wirdMap.get(groupMember.studentId) ?? [], startStr, todayUTC),
      weekAlertCount: weekAlertMap.get(groupMember.studentId) ?? 0,
      totalAlertCount: totalAlertMap.get(groupMember.studentId) ?? 0,
      activeExcuseExpiresAt: activeExcuseMap.get(groupMember.studentId),
    }));

    const fallbackMyRow: GroupWirdTrackingRowDto = {
      memberId: trackedMember.id,
      studentId: trackedMember.studentId,
      studentName: trackedMember.student.name,
      studentStatus: trackedMember.status,
      mateId: trackedMember.mateId ?? undefined,
      mateName: trackedMember.mate?.name ?? undefined,
      studentNotes: trackedMember.student.notes ?? undefined,
      days: this.buildStudentDays(wirdMap.get(trackedMember.studentId) ?? [], startStr, todayUTC),
      weekAlertCount: weekAlertMap.get(trackedMember.studentId) ?? 0,
      totalAlertCount: totalAlertMap.get(trackedMember.studentId) ?? 0,
      activeExcuseExpiresAt: activeExcuseMap.get(trackedMember.studentId),
    };
    const myRow = rows.find((row) => row.studentId === studentId) ?? fallbackMyRow;
    const orderedRows = [myRow, ...rows.filter((row) => row.studentId !== studentId)];

    const myMembership: GroupMemberDto = {
      id: trackedMember.id,
      groupId: trackedMember.groupId,
      studentId: trackedMember.studentId,
      studentName: trackedMember.student.name,
      studentPhone: trackedMember.student.phone,
      studentTimezone: trackedMember.student.timezone as TimeZoneType,
      mateId: trackedMember.mateId ?? undefined,
      mateName: trackedMember.mate?.name ?? undefined,
      notes: trackedMember.student.notes ?? undefined,
      joinedAt: trackedMember.joinedAt.toISOString() as ISODateString,
      status: trackedMember.status,
      removedAt: trackedMember.removedAt
        ? (trackedMember.removedAt.toISOString() as ISODateString)
        : undefined,
      removedById: trackedMember.removedBy ?? undefined,
      activeExcuseExpiresAt: activeExcuseMap.get(trackedMember.studentId),
    };

    const isCurrent = todayUTC >= startStr && todayUTC <= endStr;
    const isUpcoming = startStr > todayUTC;

    const weekDto: WeekStatusFlagsDto = {
      id: week.id,
      groupId: week.groupId,
      weekNumber: week.weekNumber,
      startDate: startStr,
      endDate: endStr,
      createdAt: week.createdAt.toISOString() as ISODateString,
      scheduleImage: {
        id: week.scheduleImage.id,
        weekId: week.scheduleImage.weekId,
        name: week.scheduleImage.name,
        imageUrl: week.scheduleImage.imageUrl,
        createdAt: week.scheduleImage.createdAt.toISOString() as ISODateString,
      },
      isCurrent,
      isUpcoming,
    };

    const recordableDay = this.computeRecordableDay(
      myRow.days,
      startStr,
      group.timezone,
      now,
      trackedMember.joinedAt
    );

    return {
      type: 'overview',
      week: weekDto,
      groupStatus: group.status,
      awrad: (group.awrad as string[]) ?? [],
      myRow,
      rows: orderedRows,
      myMembership,
      recordableDay,
    };
  }

  async recordLearnerWird(studentId: string, dto: RecordLearnerWirdDto): Promise<void> {
    let shouldDeleteAlert = false;
    let alertWeekId = '';
    let alertDayNumber = 0;

    await this.db.$transaction(async (tx) => {
      // Sequential reads instead of Promise.all to comply with transaction best practices
      const member = await tx.groupMember.findFirst({
        where: { groupId: dto.groupId, studentId, removedAt: null },
        select: { id: true, joinedAt: true, mateId: true },
      });
      if (!member) throw new ForbiddenException('لست عضواً في هذه الحلقة');

      const membershipStatus = await tx.groupMember.findUniqueOrThrow({
        where: { groupId_studentId: { groupId: dto.groupId, studentId } },
        select: { status: true, removedAt: true },
      });

      if (membershipStatus.removedAt) {
        throw new ForbiddenException('تمت إزالتك من هذه الحلقة');
      }

      if (membershipStatus.status !== 'ACTIVE') {
        throw new ForbiddenException('يجب أن تكون عضواً نشطاً للتسجيل');
      }

      const group = await tx.group.findUniqueOrThrow({
        where: { id: dto.groupId },
        select: { timezone: true, status: true },
      });

      if (group.status !== 'ACTIVE') {
        throw new ForbiddenException('هذه الحلقة غير نشطة حالياً');
      }

      const week = await tx.week.findUniqueOrThrow({ where: { id: dto.weekId } });

      const startStr = dateToISODateOnly(week.startDate);
      const joinedAtStr = dateToISODateOnly(member.joinedAt);

      // Validate previous days are completed in order (ATTENDED/LATE).
      const existingWirds = await tx.studentWird.findMany({
        where: { studentId, weekId: dto.weekId },
        select: { dayNumber: true, status: true },
      });
      const recordedDayStatusMap = new Map(existingWirds.map((w) => [w.dayNumber, w.status]));

      const orderedDays = [6, 0, 1, 2, 3, 4] as const;
      const targetIndex = orderedDays.indexOf(dto.dayNumber as (typeof orderedDays)[number]);

      for (const dayNum of orderedDays.slice(0, Math.max(targetIndex, 0))) {
        const dayDate = addDaysToDateStr(startStr, (dayNum + 1) % 7);
        if (dayDate < joinedAtStr) continue;

        const previousStatus = recordedDayStatusMap.get(dayNum);
        if (previousStatus === 'ATTENDED' || previousStatus === 'LATE') {
          continue;
        }

        throw new BadRequestException('يجب تسجيل الأيام السابقة أولاً');
      }

      // Validate target day has started and determine final status.
      const dayDate = addDaysToDateStr(startStr, (dto.dayNumber + 1) % 7);
      const now = new Date();
      const { startAsJSDate } = getStartAndEndOfDay(group.timezone, dayDate);
      if (now < startAsJSDate) {
        throw new BadRequestException('لا يمكن تسجيل يوم لم يبدأ بعد');
      }

      const nextDayOffset = dto.dayNumber === 4 ? 2 : 1;
      const deadline = combineDateTime(
        addDaysToDateStr(dayDate, nextDayOffset),
        FOUR_PM,
        group.timezone
      );
      const status = now.toISOString() > deadline ? 'LATE' : 'ATTENDED';
      const readSource = normalizeReadSource(String(dto.readSource));
      const readOnMateId =
        readSource === 'OUTSIDE_GROUP'
          ? null
          : readSource === 'DEFAULT_GROUP_MATE'
            ? (member.mateId ?? null)
            : (dto.mateId ?? null);

      await tx.studentWird.upsert({
        where: {
          studentId_weekId_dayNumber: { studentId, weekId: dto.weekId, dayNumber: dto.dayNumber },
        },
        create: {
          studentId,
          weekId: dto.weekId,
          dayNumber: dto.dayNumber,
          status,
          readSource,
          readOnMateId,
          recordedAt: now,
        },
        update: { status, readSource, readOnMateId, recordedAt: now },
      });

      // Policy: LATE recording cancels the specific day's alert (yellow cancels red)
      if (status === 'LATE') {
        shouldDeleteAlert = true;
        alertWeekId = dto.weekId;
        alertDayNumber = dto.dayNumber;
      }
    });

    if (shouldDeleteAlert) {
      await this.alertService.deleteWeekDayAlert(studentId, alertWeekId, alertDayNumber);
    }
  }
}
