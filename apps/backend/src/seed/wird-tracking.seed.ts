import { PrismaClient, ReadSourceType, UserRole } from 'generated/prisma/client';
import {
  addDaysToDateStr,
  combineDateTime,
  dateToISODateOnly,
  type ISODateOnlyString,
  type TimeMinutes,
} from '@sahibalquran/shared';

type PhoneMap = Record<string, { id: string; role: UserRole }>;
type WeekDayNumber = 6 | 0 | 1 | 2 | 3 | 4;
type MembershipStatus = 'ACTIVE' | 'INACTIVE';
type WirdSeedStatus = 'ATTENDED' | 'MISSED';

type MembershipSeed = {
  phone: string;
  status?: MembershipStatus;
  matePhone?: string;
  joinedOffsetDays?: number;
  removed?: boolean;
};

type SeedClockPoint = {
  offsetDays: number;
  hour: number;
  minute?: number;
};

type RecordingSeed = {
  dayNumber: WeekDayNumber;
  offsetDaysFromTarget?: number;
  hour: number;
  minute?: number;
  readOnMatePhone?: string;
  readSource?: ReadSourceType;
};

type WirdEntrySeed = {
  dayNumber: WeekDayNumber;
  status: WirdSeedStatus;
  recordedAt: Date;
  readSource?: ReadSourceType;
  readOnMateId?: string;
};

type AlertEntrySeed = {
  dayNumber: WeekDayNumber;
  createdAt: Date;
};

type SimulatedWeekInput = {
  weekStartDateStr: ISODateOnlyString;
  timezone: string;
  asOf: SeedClockPoint;
  recordings?: RecordingSeed[];
  activeExcuseUntil?: SeedClockPoint;
  previousWeekAlertCountForGrace?: number;
  joinedOffsetDays?: number;
  removed?: boolean;
  initialStatus?: MembershipStatus;
};

type SimulatedWeekResult = {
  wirds: WirdEntrySeed[];
  alerts: AlertEntrySeed[];
  finalStatus: MembershipStatus;
};

const WEEK_DAY_SEQUENCE: WeekDayNumber[] = [6, 0, 1, 2, 3, 4];
const CRON_HOUR = 16;
const DAY_OFFSET_BY_NUMBER: Record<WeekDayNumber, number> = {
  6: 0,
  0: 1,
  1: 2,
  2: 3,
  3: 4,
  4: 5,
};

function toTimeMinutes(hour: number, minute = 0): TimeMinutes {
  return (hour * 60 + minute) as TimeMinutes;
}

function at(offsetDays: number, hour: number, minute = 0): SeedClockPoint {
  return { offsetDays, hour, minute };
}

function recordOn(
  dayNumber: WeekDayNumber,
  options?: {
    offsetDaysFromTarget?: number;
    hour?: number;
    minute?: number;
    readOnMatePhone?: string;
    readSource?: ReadSourceType;
  }
): RecordingSeed {
  return {
    dayNumber,
    offsetDaysFromTarget: options?.offsetDaysFromTarget,
    hour: options?.hour ?? 10,
    minute: options?.minute ?? 0,
    readOnMatePhone: options?.readOnMatePhone,
    readSource: options?.readSource,
  };
}

function getWeekAnchors() {
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  const daysToSubtract = dayOfWeek === 6 ? 0 : (dayOfWeek + 1) % 7;

  const currentSaturday = new Date(today);
  currentSaturday.setUTCDate(today.getUTCDate() - daysToSubtract);
  currentSaturday.setUTCHours(0, 0, 0, 0);

  const currentSaturdayStr = dateToISODateOnly(currentSaturday);
  const currentFridayStr = addDaysToDateStr(currentSaturdayStr, 6);

  const previousSaturday = new Date(currentSaturday);
  previousSaturday.setUTCDate(previousSaturday.getUTCDate() - 7);
  previousSaturday.setUTCHours(0, 0, 0, 0);

  const previousSaturdayStr = dateToISODateOnly(previousSaturday);
  const previousFridayStr = addDaysToDateStr(previousSaturdayStr, 6);

  return {
    currentSaturday,
    currentSaturdayStr,
    currentFridayStr,
    previousSaturday,
    previousSaturdayStr,
    previousFridayStr,
  };
}

function getDateAtPoint(
  weekStartDateStr: ISODateOnlyString,
  timezone: string,
  point: SeedClockPoint
): Date {
  const dateStr = addDaysToDateStr(weekStartDateStr, point.offsetDays);
  return new Date(combineDateTime(dateStr, toTimeMinutes(point.hour, point.minute ?? 0), timezone));
}

function getDayDateStr(
  weekStartDateStr: ISODateOnlyString,
  dayNumber: WeekDayNumber
): ISODateOnlyString {
  return addDaysToDateStr(weekStartDateStr, DAY_OFFSET_BY_NUMBER[dayNumber]);
}

function getDeadlineAt(
  weekStartDateStr: ISODateOnlyString,
  timezone: string,
  dayNumber: WeekDayNumber
): Date {
  const dayDateStr = getDayDateStr(weekStartDateStr, dayNumber);
  const deadlineDateStr = addDaysToDateStr(dayDateStr, dayNumber === 4 ? 2 : 1);
  return new Date(combineDateTime(deadlineDateStr, toTimeMinutes(CRON_HOUR), timezone));
}

function buildCronTimeline(weekStartDateStr: ISODateOnlyString, timezone: string) {
  return WEEK_DAY_SEQUENCE.map((dayNumber) => ({
    dayNumber,
    runAt: getDeadlineAt(weekStartDateStr, timezone, dayNumber),
  }));
}

function getEligibleDaySequence(joinedOffsetDays = 0): WeekDayNumber[] {
  return WEEK_DAY_SEQUENCE.filter(
    (dayNumber) => DAY_OFFSET_BY_NUMBER[dayNumber] >= joinedOffsetDays
  );
}

function canRecordDay(
  wirds: Map<WeekDayNumber, WirdEntrySeed>,
  eligibleDaySequence: WeekDayNumber[],
  dayNumber: WeekDayNumber
): boolean {
  const dayIndex = eligibleDaySequence.indexOf(dayNumber);
  if (dayIndex === -1) {
    return false;
  }

  return eligibleDaySequence
    .slice(0, dayIndex)
    .every((previousDayNumber) => wirds.get(previousDayNumber)?.status === 'ATTENDED');
}

function buildRecordingDate(
  weekStartDateStr: ISODateOnlyString,
  timezone: string,
  recording: RecordingSeed
): Date {
  const absoluteOffset =
    DAY_OFFSET_BY_NUMBER[recording.dayNumber] + (recording.offsetDaysFromTarget ?? 0);

  return getDateAtPoint(weekStartDateStr, timezone, {
    offsetDays: absoluteOffset,
    hour: recording.hour,
    minute: recording.minute,
  });
}

function simulateWeekPolicy(input: SimulatedWeekInput, users: PhoneMap): SimulatedWeekResult {
  const asOf = getDateAtPoint(input.weekStartDateStr, input.timezone, input.asOf);
  const activeExcuseUntil = input.activeExcuseUntil
    ? getDateAtPoint(input.weekStartDateStr, input.timezone, input.activeExcuseUntil)
    : null;
  const eligibleDaySequence = getEligibleDaySequence(input.joinedOffsetDays ?? 0);

  const wirds = new Map<WeekDayNumber, WirdEntrySeed>();
  const alerts = new Map<WeekDayNumber, AlertEntrySeed>();
  let finalStatus: MembershipStatus = input.initialStatus ?? 'ACTIVE';

  const recordingEvents = (input.recordings ?? [])
    .map((recording) => ({
      type: 'recording' as const,
      recording,
      at: buildRecordingDate(input.weekStartDateStr, input.timezone, recording),
    }))
    .filter((event) => event.at <= asOf);

  const cronEvents = buildCronTimeline(input.weekStartDateStr, input.timezone)
    .filter((event) => eligibleDaySequence.includes(event.dayNumber))
    .map((event) => ({ type: 'cron' as const, ...event }))
    .filter((event) => event.runAt <= asOf);

  const events = [...recordingEvents, ...cronEvents].sort((left, right) => {
    const leftAt = left.type === 'recording' ? left.at : left.runAt;
    const rightAt = right.type === 'recording' ? right.at : right.runAt;
    const timeDiff = leftAt.getTime() - rightAt.getTime();

    if (timeDiff !== 0) {
      return timeDiff;
    }

    return left.type === 'recording' ? -1 : 1;
  });

  for (const event of events) {
    if (event.type === 'recording') {
      if (input.removed || finalStatus !== 'ACTIVE') {
        continue;
      }

      const deadlineAt = getDeadlineAt(
        input.weekStartDateStr,
        input.timezone,
        event.recording.dayNumber
      );
      if (event.at > deadlineAt) {
        continue;
      }

      if (!canRecordDay(wirds, eligibleDaySequence, event.recording.dayNumber)) {
        continue;
      }

      wirds.set(event.recording.dayNumber, {
        dayNumber: event.recording.dayNumber,
        status: 'ATTENDED',
        recordedAt: event.at,
        readSource: event.recording.readSource,
        readOnMateId: event.recording.readOnMatePhone
          ? users[event.recording.readOnMatePhone]?.id
          : undefined,
      });

      continue;
    }

    if (input.removed || finalStatus !== 'ACTIVE') {
      continue;
    }

    const excuseIsActive = activeExcuseUntil ? activeExcuseUntil > event.runAt : false;

    if (!excuseIsActive && !wirds.has(event.dayNumber)) {
      wirds.set(event.dayNumber, {
        dayNumber: event.dayNumber,
        status: 'MISSED',
        recordedAt: event.runAt,
      });
      alerts.set(event.dayNumber, {
        dayNumber: event.dayNumber,
        createdAt: event.runAt,
      });

      if (alerts.size >= 3) {
        finalStatus = 'INACTIVE';
      }
    }

    if (
      event.dayNumber === 4 &&
      finalStatus === 'ACTIVE' &&
      !excuseIsActive &&
      (input.previousWeekAlertCountForGrace ?? 0) >= 1
    ) {
      finalStatus = 'INACTIVE';
    }
  }

  return {
    wirds: Array.from(wirds.values()).sort(
      (left, right) => DAY_OFFSET_BY_NUMBER[left.dayNumber] - DAY_OFFSET_BY_NUMBER[right.dayNumber]
    ),
    alerts: Array.from(alerts.values()).sort(
      (left, right) => DAY_OFFSET_BY_NUMBER[left.dayNumber] - DAY_OFFSET_BY_NUMBER[right.dayNumber]
    ),
    finalStatus,
  };
}

async function loadScenarioUsers(prisma: PrismaClient): Promise<PhoneMap> {
  const scenarioPhones = [
    '+966500000001',
    '+966500000002',
    '+966500000003',
    ...Array.from({ length: 25 }, (_, i) => `+9665${String(i + 1).padStart(8, '0')}`),
  ];

  const users = await prisma.user.findMany({
    where: { phone: { in: scenarioPhones } },
    select: { id: true, phone: true, role: true },
  });

  const byPhone: PhoneMap = {};
  for (const user of users) {
    byPhone[user.phone] = { id: user.id, role: user.role };
  }

  const missing = scenarioPhones.filter((phone) => !byPhone[phone]);
  if (missing.length > 0) {
    throw new Error(`Missing users for wird tracking seed: ${missing.join(', ')}`);
  }

  return byPhone;
}

async function createWeek(
  prisma: PrismaClient,
  input: {
    groupId: string;
    weekNumber: number;
    startDate: Date;
    endDateStr: string;
    scheduleName: string;
    imageUrl: string;
    imagekitFileId: string;
  }
) {
  return prisma.week.create({
    data: {
      groupId: input.groupId,
      weekNumber: input.weekNumber,
      startDate: input.startDate,
      endDate: new Date(input.endDateStr),
      scheduleImage: {
        create: {
          name: input.scheduleName,
          imageUrl: input.imageUrl,
          imagekitFileId: input.imagekitFileId,
        },
      },
    },
  });
}

async function createMemberships(
  prisma: PrismaClient,
  input: {
    groupId: string;
    members: MembershipSeed[];
    users: PhoneMap;
    joinedBaseDate: Date;
    actorId: string;
  }
) {
  for (const member of input.members) {
    const user = input.users[member.phone];
    const mate = member.matePhone ? input.users[member.matePhone] : null;

    const joinedAt = new Date(input.joinedBaseDate);
    if (member.joinedOffsetDays) {
      joinedAt.setUTCDate(joinedAt.getUTCDate() + member.joinedOffsetDays);
    }

    await prisma.groupMember.create({
      data: {
        groupId: input.groupId,
        studentId: user.id,
        mateId: mate?.id ?? null,
        status: member.status ?? 'ACTIVE',
        joinedAt,
        removedAt: member.removed ? new Date() : null,
        removedBy: member.removed ? input.actorId : null,
      },
    });
  }
}

async function addWirds(
  prisma: PrismaClient,
  input: {
    weekId: string;
    userId: string;
    entries: WirdEntrySeed[];
  }
) {
  if (input.entries.length === 0) return;

  await prisma.studentWird.createMany({
    data: input.entries.map((entry) => ({
      studentId: input.userId,
      weekId: input.weekId,
      dayNumber: entry.dayNumber,
      status: entry.status,
      readSource: entry.readSource ?? 'DEFAULT_GROUP_MATE',
      readOnMateId: entry.readOnMateId,
      recordedAt: entry.recordedAt,
    })),
  });
}

async function addAlerts(
  prisma: PrismaClient,
  input: {
    groupId: string;
    weekId: string;
    userId: string;
    entries: AlertEntrySeed[];
  }
) {
  if (input.entries.length === 0) return;

  await prisma.alert.createMany({
    data: input.entries.map((entry) => ({
      studentId: input.userId,
      groupId: input.groupId,
      weekId: input.weekId,
      dayNumber: entry.dayNumber,
      createdAt: entry.createdAt,
    })),
  });
}

async function applyWeekSimulation(
  prisma: PrismaClient,
  input: {
    groupId: string;
    weekId: string;
    userId: string;
    users: PhoneMap;
    weekStartDateStr: ISODateOnlyString;
    timezone: string;
    asOf: SeedClockPoint;
    recordings?: RecordingSeed[];
    activeExcuseUntil?: SeedClockPoint;
    previousWeekAlertCountForGrace?: number;
    joinedOffsetDays?: number;
    removed?: boolean;
    initialStatus?: MembershipStatus;
  }
) {
  const simulation = simulateWeekPolicy(
    {
      weekStartDateStr: input.weekStartDateStr,
      timezone: input.timezone,
      asOf: input.asOf,
      recordings: input.recordings,
      activeExcuseUntil: input.activeExcuseUntil,
      previousWeekAlertCountForGrace: input.previousWeekAlertCountForGrace,
      joinedOffsetDays: input.joinedOffsetDays,
      removed: input.removed,
      initialStatus: input.initialStatus,
    },
    input.users
  );

  await addWirds(prisma, {
    weekId: input.weekId,
    userId: input.userId,
    entries: simulation.wirds,
  });

  await addAlerts(prisma, {
    groupId: input.groupId,
    weekId: input.weekId,
    userId: input.userId,
    entries: simulation.alerts,
  });

  if (simulation.finalStatus === 'INACTIVE') {
    await prisma.groupMember.update({
      where: {
        groupId_studentId: {
          groupId: input.groupId,
          studentId: input.userId,
        },
      },
      data: { status: 'INACTIVE' },
    });
  }
}

function createAttendedEntries(
  weekStartDateStr: ISODateOnlyString,
  timezone: string,
  days: WeekDayNumber[],
  readSource?: ReadSourceType
): WirdEntrySeed[] {
  return days.map((dayNumber) => ({
    dayNumber,
    status: 'ATTENDED',
    recordedAt: getDateAtPoint(weekStartDateStr, timezone, {
      offsetDays: DAY_OFFSET_BY_NUMBER[dayNumber],
      hour: 10,
    }),
    readSource,
  }));
}

export async function seedWirdTracking(prisma: PrismaClient) {
  console.log('🌱 Seeding wird tracking scenarios...');

  const users = await loadScenarioUsers(prisma);
  const adminId = users['+966500000001'].id;
  const moderatorId = users['+966500000002'].id;
  const anchors = getWeekAnchors();
  const groupTimezone = 'Asia/Riyadh';

  const mainGroup = await prisma.group.create({
    data: {
      name: 'حلقة الاختبار',
      timezone: groupTimezone,
      moderatorId,
      status: 'ACTIVE',
      awrad: ['حفظ', 'المراجعة (القريبة والبعيدة)', 'الاستماع (مرتين للمشايخ المتفق عليها)'],
      description: 'حلقة لاختبار سياسات التتبع',
    },
  });

  const historicalGroup = await prisma.group.create({
    data: {
      name: 'حلقة سابقة',
      timezone: groupTimezone,
      moderatorId,
      status: 'ACTIVE',
      awrad: ['حفظ', 'المراجعة (القريبة والبعيدة)', 'الاستماع (مرتين للمشايخ المتفق عليها)'],
      description: 'مجموعة لاختبار عرض المجموعات السابقة',
    },
  });

  const currentWeek = await createWeek(prisma, {
    groupId: mainGroup.id,
    weekNumber: 1,
    startDate: anchors.currentSaturday,
    endDateStr: anchors.currentFridayStr,
    scheduleName: 'جدول الأسبوع الحالي',
    imageUrl: 'https://example.com/schedule-current.jpg',
    imagekitFileId: 'schedule-current',
  });

  const previousWeek = await createWeek(prisma, {
    groupId: mainGroup.id,
    weekNumber: 0,
    startDate: anchors.previousSaturday,
    endDateStr: anchors.previousFridayStr,
    scheduleName: 'جدول الأسبوع السابق',
    imageUrl: 'https://example.com/schedule-previous.jpg',
    imagekitFileId: 'schedule-previous',
  });

  const historicalWeek = await createWeek(prisma, {
    groupId: historicalGroup.id,
    weekNumber: 1,
    startDate: anchors.currentSaturday,
    endDateStr: anchors.currentFridayStr,
    scheduleName: 'جدول مجموعة سابقة',
    imageUrl: 'https://example.com/schedule-history.jpg',
    imagekitFileId: 'schedule-history',
  });

  await createMemberships(prisma, {
    groupId: mainGroup.id,
    users,
    joinedBaseDate: anchors.currentSaturday,
    actorId: adminId,
    members: [
      { phone: '+966500000001', matePhone: '+966500000002' },
      { phone: '+966500000002', matePhone: '+966500000001' },
      { phone: '+966500000003' },
      { phone: '+966500000004' },
      { phone: '+966500000005' },
      { phone: '+966500000006' },
      { phone: '+966500000007', joinedOffsetDays: 2 },
      { phone: '+966500000008', matePhone: '+966500000009' },
      { phone: '+966500000009' },
      { phone: '+966500000010', status: 'INACTIVE' },
      { phone: '+966500000015' },
      { phone: '+966500000016' },
      { phone: '+966500000017' },
      { phone: '+966500000018', removed: true, matePhone: '+966500000008' },
      { phone: '+966500000019', status: 'INACTIVE' },
      { phone: '+966500000020', removed: true },
      { phone: '+966500000021', removed: true },
      { phone: '+966500000022' },
      { phone: '+966500000023', removed: true },
      { phone: '+966500000024', status: 'INACTIVE' },
      { phone: '+966500000025' },
      { phone: '+966500000014', removed: true },
    ],
  });

  await createMemberships(prisma, {
    groupId: historicalGroup.id,
    users,
    joinedBaseDate: anchors.currentSaturday,
    actorId: adminId,
    members: [
      { phone: '+966500000025', removed: true },
      { phone: '+966500000014', removed: true },
      { phone: '+966500000011' },
      { phone: '+966500000012' },
      { phone: '+966500000013' },
    ],
  });

  await prisma.excuse.create({
    data: {
      studentId: users['+966500000004'].id,
      groupId: mainGroup.id,
      createdBy: adminId,
      expiresAt: getDateAtPoint(anchors.currentSaturdayStr, groupTimezone, at(7, 0)),
    },
  });

  await prisma.excuse.create({
    data: {
      studentId: users['+966500000010'].id,
      groupId: mainGroup.id,
      createdBy: adminId,
      expiresAt: getDateAtPoint(anchors.currentSaturdayStr, groupTimezone, at(3, 23)),
    },
  });

  await prisma.excuse.create({
    data: {
      studentId: users['+966500000020'].id,
      groupId: mainGroup.id,
      createdBy: adminId,
      expiresAt: getDateAtPoint(anchors.currentSaturdayStr, groupTimezone, at(10, 0)),
    },
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: currentWeek.id,
    userId: users['+966500000001'].id,
    users,
    weekStartDateStr: anchors.currentSaturdayStr,
    timezone: groupTimezone,
    asOf: at(5, 12),
    recordings: [recordOn(6), recordOn(0), recordOn(1), recordOn(2)],
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: currentWeek.id,
    userId: users['+966500000002'].id,
    users,
    weekStartDateStr: anchors.currentSaturdayStr,
    timezone: groupTimezone,
    asOf: at(3, 12),
    recordings: [recordOn(6)],
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: currentWeek.id,
    userId: users['+966500000003'].id,
    users,
    weekStartDateStr: anchors.currentSaturdayStr,
    timezone: groupTimezone,
    asOf: at(3, 17),
    recordings: [recordOn(6)],
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: currentWeek.id,
    userId: users['+966500000004'].id,
    users,
    weekStartDateStr: anchors.currentSaturdayStr,
    timezone: groupTimezone,
    asOf: at(4, 17),
    recordings: [recordOn(6)],
    activeExcuseUntil: at(7, 0),
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: currentWeek.id,
    userId: users['+966500000005'].id,
    users,
    weekStartDateStr: anchors.currentSaturdayStr,
    timezone: groupTimezone,
    asOf: at(4, 17),
    recordings: [recordOn(6)],
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: previousWeek.id,
    userId: users['+966500000006'].id,
    users,
    weekStartDateStr: anchors.previousSaturdayStr,
    timezone: groupTimezone,
    asOf: at(2, 17),
    recordings: [recordOn(6)],
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: currentWeek.id,
    userId: users['+966500000006'].id,
    users,
    weekStartDateStr: anchors.currentSaturdayStr,
    timezone: groupTimezone,
    asOf: at(7, 17),
    recordings: [recordOn(6), recordOn(0), recordOn(1), recordOn(2), recordOn(3), recordOn(4)],
    previousWeekAlertCountForGrace: 1,
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: currentWeek.id,
    userId: users['+966500000007'].id,
    users,
    weekStartDateStr: anchors.currentSaturdayStr,
    timezone: groupTimezone,
    asOf: at(4, 12),
    joinedOffsetDays: 2,
    recordings: [recordOn(1), recordOn(2)],
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: currentWeek.id,
    userId: users['+966500000008'].id,
    users,
    weekStartDateStr: anchors.currentSaturdayStr,
    timezone: groupTimezone,
    asOf: at(3, 12),
    recordings: [
      recordOn(6, { readOnMatePhone: '+966500000009', readSource: 'DIFFERENT_GROUP_MATE' }),
    ],
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: currentWeek.id,
    userId: users['+966500000009'].id,
    users,
    weekStartDateStr: anchors.currentSaturdayStr,
    timezone: groupTimezone,
    asOf: at(6, 12),
    recordings: [recordOn(6), recordOn(0), recordOn(1), recordOn(2), recordOn(3)],
  });

  await addWirds(prisma, {
    weekId: currentWeek.id,
    userId: users['+966500000010'].id,
    entries: createAttendedEntries(anchors.currentSaturdayStr, groupTimezone, [6, 0], 'MANUAL'),
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: currentWeek.id,
    userId: users['+966500000015'].id,
    users,
    weekStartDateStr: anchors.currentSaturdayStr,
    timezone: groupTimezone,
    asOf: at(1, 17),
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: currentWeek.id,
    userId: users['+966500000016'].id,
    users,
    weekStartDateStr: anchors.currentSaturdayStr,
    timezone: groupTimezone,
    asOf: at(0, 12),
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: currentWeek.id,
    userId: users['+966500000017'].id,
    users,
    weekStartDateStr: anchors.currentSaturdayStr,
    timezone: groupTimezone,
    asOf: at(6, 12),
    recordings: [recordOn(6), recordOn(0), recordOn(1), recordOn(2), recordOn(3)],
  });

  await addWirds(prisma, {
    weekId: currentWeek.id,
    userId: users['+966500000014'].id,
    entries: createAttendedEntries(anchors.currentSaturdayStr, groupTimezone, [6, 0]),
  });

  await addWirds(prisma, {
    weekId: currentWeek.id,
    userId: users['+966500000020'].id,
    entries: createAttendedEntries(anchors.currentSaturdayStr, groupTimezone, [6]),
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: currentWeek.id,
    userId: users['+966500000021'].id,
    users,
    weekStartDateStr: anchors.currentSaturdayStr,
    timezone: groupTimezone,
    asOf: at(4, 17),
    removed: true,
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: currentWeek.id,
    userId: users['+966500000022'].id,
    users,
    weekStartDateStr: anchors.currentSaturdayStr,
    timezone: groupTimezone,
    asOf: at(3, 17),
    recordings: [recordOn(6)],
  });

  await addWirds(prisma, {
    weekId: currentWeek.id,
    userId: users['+966500000023'].id,
    entries: createAttendedEntries(anchors.currentSaturdayStr, groupTimezone, [6]),
  });

  await addWirds(prisma, {
    weekId: currentWeek.id,
    userId: users['+966500000024'].id,
    entries: createAttendedEntries(anchors.currentSaturdayStr, groupTimezone, [6]),
  });

  await applyWeekSimulation(prisma, {
    groupId: mainGroup.id,
    weekId: currentWeek.id,
    userId: users['+966500000025'].id,
    users,
    weekStartDateStr: anchors.currentSaturdayStr,
    timezone: groupTimezone,
    asOf: at(2, 12),
    recordings: [recordOn(6), recordOn(0)],
  });

  await addWirds(prisma, {
    weekId: historicalWeek.id,
    userId: users['+966500000025'].id,
    entries: createAttendedEntries(anchors.currentSaturdayStr, groupTimezone, [6]),
  });

  await addWirds(prisma, {
    weekId: historicalWeek.id,
    userId: users['+966500000014'].id,
    entries: createAttendedEntries(anchors.currentSaturdayStr, groupTimezone, [6]),
  });

  console.log('✅ Wird tracking scenarios seeded');
  console.log(`📊 Main group: ${mainGroup.name}`);
  console.log(`📊 Historical group: ${historicalGroup.name}`);
  console.log(`📅 Current week: ${anchors.currentSaturdayStr} -> ${anchors.currentFridayStr}`);
  console.log('🧪 Covered users: admin, moderator, student1 .. student25');
}
