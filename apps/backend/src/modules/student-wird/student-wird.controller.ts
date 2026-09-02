import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from 'generated/prisma/client';
import type { User as PrismaUser } from 'generated/prisma/client';
import { Roles } from 'src/decorators/roles.decorator';
import { User } from 'src/decorators/user.decorator';
import { ZodValidationPipe } from 'src/pipes/zod-validation.pipe';
import {
  updateStudentWirdsSchema,
  recordLearnerWirdSchema,
  type GroupWirdTrackingDto,
  type LearnerGroupOverviewDto,
  type WeekWithCurrentFlagDto,
  type StudentWeekWirdsDto,
  type UpdateStudentWirdsDto,
  type RecordLearnerWirdDto,
} from '@sahibalquran/shared';
import { StudentWirdService } from './student-wird.service';

@Controller('student-wird')
export class StudentWirdController {
  constructor(private readonly studentWirdService: StudentWirdService) {}

  // ─── Admin / Moderator ───────────────────────────────────────────────────────

  @Get('group/:groupId/weeks')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  getGroupWeeks(@Param('groupId') groupId: string): Promise<WeekWithCurrentFlagDto[]> {
    return this.studentWirdService.getGroupWeeks(groupId);
  }

  @Get('group/:groupId/week/:weekId')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  getWeekTracking(
    @Param('groupId') groupId: string,
    @Param('weekId') weekId: string
  ): Promise<GroupWirdTrackingDto> {
    return this.studentWirdService.getWeekTracking(groupId, weekId);
  }

  @Get('student/:studentId/week/:weekId')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  getStudentWeekWirds(
    @Param('studentId') studentId: string,
    @Param('weekId') weekId: string
  ): Promise<StudentWeekWirdsDto> {
    return this.studentWirdService.getStudentWeekWirds(studentId, weekId);
  }

  @Patch('student/:studentId/week/:weekId')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  updateStudentWeekWirds(
    @Param('studentId') studentId: string,
    @Param('weekId') weekId: string,
    @Body(new ZodValidationPipe(updateStudentWirdsSchema('en'))) dto: UpdateStudentWirdsDto
  ): Promise<void> {
    return this.studentWirdService.updateStudentWeekWirds(studentId, weekId, dto);
  }

  // ─── Learner Self-Recording ──────────────────────────────────────────────────

  @Get('my-group/:groupId/overview')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR, UserRole.STUDENT])
  getLearnerGroupOverview(
    @Param('groupId') groupId: string,
    @User() user: PrismaUser
  ): Promise<LearnerGroupOverviewDto> {
    return this.studentWirdService.getLearnerGroupOverview(groupId, user.id);
  }

  @Post('my-wird')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR, UserRole.STUDENT])
  recordLearnerWird(
    @Body(new ZodValidationPipe(recordLearnerWirdSchema('en'))) dto: RecordLearnerWirdDto,
    @User() user: PrismaUser
  ): Promise<void> {
    return this.studentWirdService.recordLearnerWird(user.id, dto);
  }
}
