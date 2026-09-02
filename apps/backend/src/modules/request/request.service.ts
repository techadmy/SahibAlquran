import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TypedEventEmitter } from '../notification/typed-event-emitter.service';
import type {
  CreateRequestDto,
  RequestDto,
  RequestType,
  RequestStatus,
  RequestStatsDto,
  PaginationQueryType,
  PaginationResponseMeta,
  RequestPayloadMap,
} from '@sahibalquran/shared';
import type { ISODateString } from '@sahibalquran/shared';
import type { Prisma } from 'generated/prisma/client';

@Injectable()
export class RequestService {
  constructor(
    private readonly db: DatabaseService,
    private readonly typedEmitter: TypedEventEmitter
  ) {}

  async createRequest<T extends RequestType>(
    dto: CreateRequestDto<T>,
    studentId: string
  ): Promise<RequestDto<T>> {
    const { type, payload } = dto;
    // All request payloads have groupId
    const groupId = payload.groupId;

    // Verify student is member of group
    const membership = await this.db.groupMember.findUnique({
      where: { groupId_studentId: { groupId, studentId } },
    });

    if (!membership) {
      throw new ForbiddenException('أنت لست عضواً في هذه المجموعة');
    }

    if (membership.removedAt) {
      throw new ForbiddenException('تمت إزالتك من هذه المجموعة');
    }

    // Check for existing pending ACTIVATION request (EXCUSE is checked separately)
    if (type === 'ACTIVATION') {
      const existingPending = await this.db.request.findFirst({
        where: { studentId, groupId, type, status: 'PENDING' },
      });
      if (existingPending) {
        throw new BadRequestException('لديك طلب تفعيل قيد المراجعة بالفعل لهذه المجموعة');
      }
    }

    // Additional validation for ACTIVATION
    if (type === 'ACTIVATION' && membership.status === 'ACTIVE') {
      throw new BadRequestException('أنت نشط بالفعل في هذه المجموعة');
    }

    // For EXCUSE: check no active excuse and no pending excuse request
    if (type === 'EXCUSE') {
      const now = new Date();
      const activeExcuse = await this.db.excuse.findFirst({
        where: { studentId, groupId, expiresAt: { gt: now } },
      });
      const pendingExcuseRequest = await this.db.request.findFirst({
        where: { studentId, groupId, type: 'EXCUSE', status: 'PENDING' },
      });

      if (activeExcuse) {
        throw new BadRequestException('لديك عذر نشط بالفعل لهذه المجموعة');
      }
      if (pendingExcuseRequest) {
        throw new BadRequestException('لديك طلب عذر قيد المراجعة بالفعل لهذه المجموعة');
      }
    }

    const created = await this.db.request.create({
      data: {
        studentId,
        groupId,
        type,
        payload: payload as Prisma.InputJsonValue,
        status: 'PENDING',
      },
      include: {
        student: { select: { name: true } },
        group: { select: { name: true, moderatorId: true } },
      },
    });

    // Notify group moderator and all admins about the new request
    const recipients: string[] = [];

    // Add group moderator
    if (created.group.moderatorId) {
      recipients.push(created.group.moderatorId);
    }

    // Add all admins
    const admins = await this.db.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    recipients.push(...admins.map((admin) => admin.id));

    // Send notification to each recipient
    for (const recipientId of recipients) {
      this.typedEmitter.emit('notification.send', {
        type: 'REQUEST_CREATED',
        recipientId,
        payload: {
          requestId: created.id,
          requestType: type,
          studentName: created.student.name,
          groupName: created.group.name,
          groupId,
        },
      });
    }

    return this.toDto(created) as RequestDto<T>;
  }

  async getRequestById(id: string): Promise<RequestDto> {
    const request = await this.db.request.findUniqueOrThrow({
      where: { id },
      include: {
        student: { select: { name: true } },
        group: { select: { name: true } },
        reviewer: { select: { name: true } },
      },
    });

    return this.toDto(request);
  }

  async getMyRequests(studentId: string): Promise<RequestDto[]> {
    const requests = await this.db.request.findMany({
      where: { studentId },
      include: {
        student: { select: { name: true } },
        group: { select: { name: true } },
        reviewer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((r) => this.toDto(r));
  }

  async getRoleFilteredRequests(
    actor: { id: string; role: string },
    query: PaginationQueryType & { status?: RequestStatus }
  ): Promise<{ data: RequestDto[]; meta: PaginationResponseMeta['meta'] }> {
    const where: Prisma.RequestWhereInput = query.status ? { status: query.status } : {};

    if (actor.role === 'MODERATOR') {
      where.group = { moderatorId: actor.id };
    }

    const { skip, take, page } = this.db.handleQueryPagination(query);
    const limit = take;

    const requests = await this.db.request.findMany({
      where,
      include: {
        student: { select: { name: true } },
        group: { select: { name: true } },
        reviewer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    const count = await this.db.request.count({ where });

    const { meta } = this.db.formatPaginationResponse({ page, count, limit });
    return { data: requests.map((r) => this.toDto(r)), meta };
  }

  async getStats(actor: { id: string; role: string }): Promise<RequestStatsDto> {
    const where: Prisma.RequestWhereInput =
      actor.role === 'MODERATOR' ? { group: { moderatorId: actor.id } } : {};

    const pending = await this.db.request.count({ where: { ...where, status: 'PENDING' } });
    const accepted = await this.db.request.count({ where: { ...where, status: 'ACCEPTED' } });
    const rejected = await this.db.request.count({ where: { ...where, status: 'REJECTED' } });
    const total = await this.db.request.count({ where });

    return { pending, accepted, rejected, total };
  }

  private toDto(r: {
    id: string;
    studentId: string;
    groupId: string;
    type: string;
    payload: Prisma.JsonValue;
    status: string;
    reviewedBy: string | null;
    createdAt: Date;
    reviewedAt: Date | null;
    student: { name: string };
    group: { name: string };
    reviewer?: { name: string } | null;
  }): RequestDto {
    return {
      id: r.id,
      studentId: r.studentId,
      studentName: r.student.name,
      groupId: r.groupId,
      groupName: r.group.name,
      type: r.type as RequestType,
      payload: r.payload as RequestPayloadMap[RequestType],
      status: r.status as RequestDto['status'],
      reviewedBy: r.reviewedBy ?? undefined,
      reviewerName: r.reviewer?.name,
      createdAt: r.createdAt.toISOString() as ISODateString,
      reviewedAt: r.reviewedAt ? (r.reviewedAt.toISOString() as ISODateString) : undefined,
    };
  }
}
