import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from 'generated/prisma/client';
import { Roles } from 'src/decorators/roles.decorator';
import { User } from 'src/decorators/user.decorator';
import { ZodValidationPipe } from 'src/pipes/zod-validation.pipe';
import { FileCleanupInterceptor } from 'src/modules/file/cleanup-file.interceptor';
import { FolderInterceptor, groupFolder } from 'src/modules/file/folder.interceptor';
import type { User as PrismaUser } from 'generated/prisma/client';
import {
  createGroupSchema,
  createWeekScheduleSchema,
  updateGroupSchema,
  updateScheduleImageSchema,
  type GroupDto,
  type GroupNameDto,
  type CreateGroupDto,
  type CreateWeekScheduleDto,
  type UpdateGroupDto,
  type UpdateScheduleImageDto,
} from '@sahibalquran/shared';
import { GroupService } from './group.service';
@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  // ─── Groups CRUD ─────────────────────────────────────────────────────────

  @Get('names')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  getGroupNames(): Promise<GroupNameDto[]> {
    return this.groupService.getGroupNames();
  }

  @Get()
  @Roles([UserRole.ADMIN, UserRole.MODERATOR, UserRole.STUDENT])
  queryGroups(@User() user: PrismaUser) {
    return this.groupService.queryGroups(user);
  }

  @Get(':id')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR, UserRole.STUDENT])
  getGroup(@Param('id') id: string, @User() user: PrismaUser) {
    const studentId = user.role === UserRole.STUDENT ? user.id : undefined;
    return this.groupService.getGroupById(id, studentId);
  }

  @Post()
  @Roles([UserRole.ADMIN])
  createGroup(@Body(new ZodValidationPipe(createGroupSchema('en'))) dto: CreateGroupDto) {
    return this.groupService.createGroup(dto);
  }

  @Patch(':id/schedule-image/:imageId')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  @UseInterceptors(
    FolderInterceptor((req) => groupFolder(req.params['id'] as string)),
    FileInterceptor('image'),
    FileCleanupInterceptor
  )
  updateScheduleImage(
    @Param('imageId') imageId: string,
    @Body(new ZodValidationPipe(updateScheduleImageSchema())) dto: UpdateScheduleImageDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.groupService.updateScheduleImage(imageId, file?.url, file?.fileId, dto.name);
  }

  @Patch(':id')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  updateGroup(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateGroupSchema('en'))) dto: UpdateGroupDto
  ) {
    return this.groupService.updateGroup(id, dto);
  }

  @Delete(':id')
  @Roles([UserRole.ADMIN])
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteGroup(@Param('id') id: string): Promise<void> {
    return this.groupService.deleteGroup(id);
  }

  // ─── Weekly Schedules ─────────────────────────────────────────────────────

  @Get(':id/schedule')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  getGroupSchedules(@Param('id') id: string) {
    return this.groupService.getGroupSchedules(id);
  }

  @Post(':id/schedule')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  @UseInterceptors(
    FolderInterceptor((req) => groupFolder(req.params['id'] as string)),
    FileInterceptor('image'),
    FileCleanupInterceptor
  )
  createSchedule(
    @Param('id') groupId: string,
    @Body(new ZodValidationPipe(createWeekScheduleSchema('en')))
    dto: CreateWeekScheduleDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.groupService.createScheduleImage(
      groupId,
      dto.saturdayDate,
      file.url!,
      dto.scheduleName,
      file.fileId!
    );
  }

  // ─── Group Learners ─────────────────────────────────────────────────────────

  @Get(':id/learners')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR, UserRole.STUDENT])
  getGroupLearners(@Param('id') id: string) {
    return this.groupService.getGroupLearners(id);
  }

  @Get('student/eligible-for-activation')
  @Roles([UserRole.STUDENT])
  getEligibleActivationGroups(@User('id') studentId: string): Promise<GroupDto[]> {
    return this.groupService.getStudentInactiveGroups(studentId);
  }

  @Get('student/my-groups')
  @Roles([UserRole.STUDENT])
  getMyGroups(@User('id') studentId: string): Promise<GroupDto[]> {
    return this.groupService.getStudentActiveGroups(studentId);
  }

  @Get('student/removed-groups')
  @Roles([UserRole.STUDENT])
  async getRemovedGroups(@User('id') studentId: string): Promise<GroupDto[]> {
    return await this.groupService.getStudentRemovedGroups(studentId);
  }
}
