import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateExcuseDto, ExcuseDto } from '@sahibalquran/shared';

@Injectable()
export class ExcuseService {
  constructor(private readonly db: DatabaseService) {}

  async getStudentExcuses(studentId: string, groupId: string): Promise<ExcuseDto[]> {
    const excuses = await this.db.excuse.findMany({
      where: { studentId, groupId },
      orderBy: { createdAt: 'desc' },
    });
    return excuses.map((e) => this.toDto(e));
  }

  hasActiveExcuse(studentId: string, groupId: string): Promise<boolean> {
    const now = new Date();
    return this.db.excuse
      .findFirst({ where: { studentId, groupId, expiresAt: { gt: now } } })
      .then((e) => e !== null);
  }

  async createExcuse(dto: CreateExcuseDto, createdBy: string): Promise<ExcuseDto> {
    const alreadyActive = await this.hasActiveExcuse(dto.studentId, dto.groupId);
    if (alreadyActive) throw new BadRequestException('يوجد عذر نشط بالفعل لهذا الطالب');

    const excuse = await this.db.excuse.create({
      data: {
        studentId: dto.studentId,
        groupId: dto.groupId,
        createdBy,
        requestId: dto.requestId ?? null,
        expiresAt: new Date(dto.expiresAt),
      },
    });
    return this.toDto(excuse);
  }

  async disableExcuse(id: string): Promise<ExcuseDto> {
    const excuse = await this.db.excuse.findUniqueOrThrow({ where: { id } });

    const now = new Date();
    if (excuse.expiresAt <= now) {
      throw new ForbiddenException('العذر منتهي الصلاحية بالفعل');
    }

    const updated = await this.db.excuse.update({
      where: { id },
      data: { expiresAt: now },
    });
    return this.toDto(updated);
  }

  private toDto(e: {
    id: string;
    studentId: string;
    groupId: string;
    createdBy: string;
    requestId: string | null;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): ExcuseDto {
    return {
      id: e.id,
      studentId: e.studentId,
      groupId: e.groupId,
      createdBy: e.createdBy,
      requestId: e.requestId ?? undefined,
      expiresAt: e.expiresAt.toISOString() as ExcuseDto['expiresAt'],
      createdAt: e.createdAt.toISOString() as ExcuseDto['createdAt'],
      updatedAt: e.updatedAt.toISOString() as ExcuseDto['updatedAt'],
    };
  }
}
