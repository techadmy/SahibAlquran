import { Injectable } from '@nestjs/common';
import argon from 'argon2';
import { DatabaseService } from '../database/database.service';
import { TypedEventEmitter } from '../notification/typed-event-emitter.service';
import {
  AssignLearnersToGroupDto,
  CreateAndAssignLearnersDto,
  GroupMemberDto,
  LearnerDto,
  PlatformType,
  ReactivateMemberDto,
  RecitationType,
  UpdateMemberMateDto,
  TimeZoneType,
  normalizeArabic,
} from '@wirdi/shared';
import { UserRole } from 'generated/prisma/client';

@Injectable()
export class GroupMemberService {
  constructor(
    private readonly db: DatabaseService,
    private readonly typedEmitter: TypedEventEmitter
  ) {}

  /**
   * Create multiple new learners and assign them all to a group in one transaction.
   */
  async createAndAssignLearners(dto: CreateAndAssignLearnersDto): Promise<GroupMemberDto[]> {
    const defaultPasswordHash = await argon.hash('12345678');

    const members = await this.db.$transaction(async (tx) => {
      const created: GroupMemberDto[] = [];

      for (const learnerData of dto.learners) {
        const student = await tx.user.create({
          data: {
            name: learnerData.name,
            nameNormalized: normalizeArabic(learnerData.name),
            phone: learnerData.phone,
            password: defaultPasswordHash,
            timezone: learnerData.timezone,
            role: UserRole.STUDENT,
            notes: learnerData.notes,
            age: learnerData.age,
            platform: learnerData.platform,
            schedule: learnerData.schedule,
            recitation: learnerData.recitation,
          },
        });

        const member = await tx.groupMember.create({
          data: { groupId: dto.groupId, studentId: student.id },
          include: {
            student: {
              select: {
                name: true,
                phone: true,
                timezone: true,
                notes: true,
                age: true,
                platform: true,
                schedule: true,
                recitation: true,
              },
            },
            mate: { select: { name: true } },
          },
        });

        created.push({
          id: member.id,
          groupId: member.groupId,
          studentId: member.studentId,
          studentName: member.student.name,
          studentPhone: member.student.phone,
          studentTimezone: member.student.timezone as TimeZoneType,
          mateId: member.mateId ?? undefined,
          mateName: member.mate?.name ?? undefined,
          notes: member.student.notes ?? undefined,
          age: member.student.age ?? undefined,
          platform: (member.student.platform ?? undefined) as PlatformType | undefined,
          schedule: member.student.schedule ?? undefined,
          recitation: (member.student.recitation ?? undefined) as RecitationType | undefined,
          joinedAt: member.joinedAt.toISOString() as GroupMemberDto['joinedAt'],
          status: member.status,
          activeExcuseExpiresAt: undefined,
        });
      }

      return created;
    });

    return members;
  }

  /**
   * Assign existing learners to a group in one transaction.
   * If a learner was previously soft-deleted from this group, restore their membership.
   */
  async assignLearnersToGroup(dto: AssignLearnersToGroupDto): Promise<GroupMemberDto[]> {
    const members = await this.db.$transaction(
      dto.studentIds.map((studentId) =>
        this.db.groupMember.upsert({
          where: { groupId_studentId: { groupId: dto.groupId, studentId } },
          create: { groupId: dto.groupId, studentId },
          update: {
            removedAt: null,
            removedBy: null,
            status: 'ACTIVE',
            joinedAt: new Date(),
          },
          include: {
            student: {
              select: {
                name: true,
                phone: true,
                timezone: true,
                notes: true,
                age: true,
                platform: true,
                schedule: true,
                recitation: true,
              },
            },
            mate: { select: { name: true } },
          },
        })
      )
    );

    return members.map((m) => ({
      id: m.id,
      groupId: m.groupId,
      studentId: m.studentId,
      studentName: m.student.name,
      studentPhone: m.student.phone,
      studentTimezone: m.student.timezone as TimeZoneType,
      mateId: m.mateId ?? undefined,
      mateName: m.mate?.name ?? undefined,
      notes: m.student.notes ?? undefined,
      age: m.student.age ?? undefined,
      platform: (m.student.platform ?? undefined) as PlatformType | undefined,
      schedule: m.student.schedule ?? undefined,
      recitation: (m.student.recitation ?? undefined) as RecitationType | undefined,
      joinedAt: m.joinedAt.toISOString() as GroupMemberDto['joinedAt'],
      status: m.status,
      activeExcuseExpiresAt: undefined,
    }));
  }

  /**
   * Update the mate (زميل) for a group member.
   */
  async updateMate(memberId: string, dto: UpdateMemberMateDto): Promise<GroupMemberDto> {
    const updated = await this.db.groupMember.update({
      where: { id: memberId },
      data: { mateId: dto.mateId },
      include: {
        student: {
          select: {
            name: true,
            phone: true,
            timezone: true,
            notes: true,
            age: true,
            platform: true,
            schedule: true,
            recitation: true,
          },
        },
        mate: { select: { name: true } },
      },
    });

    return {
      id: updated.id,
      groupId: updated.groupId,
      studentId: updated.studentId,
      studentName: updated.student.name,
      studentPhone: updated.student.phone,
      studentTimezone: updated.student.timezone as TimeZoneType,
      mateId: updated.mateId ?? undefined,
      mateName: updated.mate?.name ?? undefined,
      notes: updated.student.notes ?? undefined,
      age: updated.student.age ?? undefined,
      platform: (updated.student.platform ?? undefined) as PlatformType | undefined,
      schedule: updated.student.schedule ?? undefined,
      recitation: (updated.student.recitation ?? undefined) as RecitationType | undefined,
      joinedAt: updated.joinedAt.toISOString() as GroupMemberDto['joinedAt'],
      status: updated.status,
      activeExcuseExpiresAt: undefined,
    };
  }

  /**
   * Remove a learner from a group (soft delete on GroupMember row).
   * Also clears mateId for any member in the same group who had this learner as their mate.
   */
  async removeMember(memberId: string, actorId: string): Promise<void> {
    const result = await this.db.$transaction(async (tx) => {
      const member = await tx.groupMember.findUniqueOrThrow({
        where: { id: memberId },
        select: { id: true, groupId: true, studentId: true, removedAt: true },
      });

      if (member.removedAt) {
        return null;
      }

      await tx.groupMember.updateMany({
        where: { groupId: member.groupId, mateId: member.studentId, removedAt: null },
        data: { mateId: null },
      });

      await tx.groupMember.update({
        where: { id: memberId },
        data: {
          removedAt: new Date(),
          removedBy: actorId,
          status: 'INACTIVE',
        },
      });

      const student = await tx.user.findUnique({
        where: { id: member.studentId },
        select: { id: true, name: true },
      });

      const group = await tx.group.findUnique({
        where: { id: member.groupId },
        select: { id: true, name: true, moderatorId: true },
      });

      const admins = await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });

      if (!student || !group) {
        return null;
      }

      return {
        studentId: student.id,
        studentName: student.name,
        groupId: group.id,
        groupName: group.name,
        moderatorId: group.moderatorId,
        adminIds: admins.map((admin) => admin.id),
      };
    });

    if (!result) {
      return;
    }

    const recipients = new Set<string>([result.studentId, ...result.adminIds]);
    if (result.moderatorId) {
      recipients.add(result.moderatorId);
    }

    for (const recipientId of recipients) {
      this.typedEmitter.emit('notification.send', {
        type: 'LEARNER_REMOVED',
        recipientId,
        payload: {
          studentId: result.studentId,
          studentName: result.studentName,
          groupId: result.groupId,
          groupName: result.groupName,
        },
      });
    }
  }

  /**
   * Reactivate an INACTIVE group member by setting their status back to ACTIVE.
   * If a pending ACTIVATION request exists for this learner, auto-approve it.
   * Validates that the member belongs to the specified group.
   */
  async reactivateMember(
    groupId: string,
    dto: ReactivateMemberDto,
    actorId: string
  ): Promise<void> {
    let autoApprovedRequestId: string | undefined;

    await this.db.$transaction(async (tx) => {
      // Check for pending ACTIVATION request
      const pendingRequest = await tx.request.findFirst({
        where: {
          studentId: dto.studentId,
          groupId,
          type: 'ACTIVATION',
          status: 'PENDING',
        },
      });

      // If pending request exists, auto-approve it
      if (pendingRequest) {
        await tx.request.update({
          where: { id: pendingRequest.id },
          data: {
            status: 'ACCEPTED',
            reviewedBy: actorId,
            reviewedAt: new Date(),
          },
        });
        autoApprovedRequestId = pendingRequest.id;
      }

      // Update member status to ACTIVE
      await tx.groupMember.update({
        where: { groupId_studentId: { groupId, studentId: dto.studentId } },
        data: { status: 'ACTIVE' },
      });
    });

    const group = await this.db.group.findUniqueOrThrow({
      where: { id: groupId },
      select: { name: true },
    });

    // Send appropriate notification based on scenario
    if (autoApprovedRequestId) {
      // If request was auto-approved, send REQUEST_UPDATED (consistent with manual approval)
      this.typedEmitter.emit('notification.send', {
        type: 'REQUEST_UPDATED',
        recipientId: dto.studentId,
        payload: {
          requestId: autoApprovedRequestId,
          requestType: 'ACTIVATION',
          groupName: group.name,
          groupId,
          status: 'ACCEPTED',
        },
      });
    } else {
      // If no request exists, send LEARNER_REACTIVATED
      this.typedEmitter.emit('notification.send', {
        type: 'LEARNER_REACTIVATED',
        recipientId: dto.studentId,
        payload: { groupId, groupName: group.name },
      });
    }
  }

  /**
   * Get all users who are NOT members of the given group.
   */
  async getUnassignedLearners(groupId: string): Promise<LearnerDto[]> {
    await this.db.group.findUniqueOrThrow({ where: { id: groupId }, select: { id: true } });

    const assigned = await this.db.groupMember.findMany({
      where: { groupId, removedAt: null },
      select: { studentId: true },
    });
    const assignedIds = assigned.map((m) => m.studentId);

    const learners = await this.db.user.findMany({
      where: { id: { notIn: assignedIds } },
      orderBy: { name: 'asc' },
    });

    return learners.map((u) => ({
      id: u.id,
      phone: u.phone,
      name: u.name,
      role: u.role,
      timezone: u.timezone as TimeZoneType,
      contact: {
        notes: u.notes ?? undefined,
        age: u.age ?? undefined,
        platform: (u.platform ?? undefined) as PlatformType | undefined,
        schedule: u.schedule ?? undefined,
        recitation: (u.recitation ?? undefined) as RecitationType | undefined,
      },
      createdAt: u.createdAt.toISOString() as LearnerDto['createdAt'],
      updatedAt: u.updatedAt.toISOString() as LearnerDto['updatedAt'],
    }));
  }

  async getRemovedMembers(groupId: string): Promise<GroupMemberDto[]> {
    const members = await this.db.groupMember.findMany({
      where: { groupId, removedAt: { not: null } },
      orderBy: { removedAt: 'desc' },
      include: {
        student: {
          select: {
            name: true,
            phone: true,
            timezone: true,
            notes: true,
            age: true,
            platform: true,
            schedule: true,
            recitation: true,
          },
        },
        mate: { select: { name: true } },
      },
    });

    return members.map((member) => ({
      id: member.id,
      groupId: member.groupId,
      studentId: member.studentId,
      studentName: member.student.name,
      studentPhone: member.student.phone,
      studentTimezone: member.student.timezone as TimeZoneType,
      mateId: member.mateId ?? undefined,
      mateName: member.mate?.name ?? undefined,
      notes: member.student.notes ?? undefined,
      age: member.student.age ?? undefined,
      platform: (member.student.platform ?? undefined) as PlatformType | undefined,
      schedule: member.student.schedule ?? undefined,
      recitation: (member.student.recitation ?? undefined) as RecitationType | undefined,
      joinedAt: member.joinedAt.toISOString() as GroupMemberDto['joinedAt'],
      status: member.status,
      removedAt: member.removedAt
        ? (member.removedAt.toISOString() as GroupMemberDto['removedAt'])
        : undefined,
      removedById: member.removedBy ?? undefined,
      activeExcuseExpiresAt: undefined,
    }));
  }
}
