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
} from '@nestjs/common';
import { UserRole } from 'generated/prisma/client';
import type { User as PrismaUser } from 'generated/prisma/client';
import { Roles } from 'src/decorators/roles.decorator';
import { User } from 'src/decorators/user.decorator';
import { ZodValidationPipe } from 'src/pipes/zod-validation.pipe';
import {
  assignLearnersToGroupSchema,
  createAndAssignLearnersSchema,
  reactivateMemberSchema,
  updateMemberMateSchema,
  type AssignLearnersToGroupDto,
  type CreateAndAssignLearnersDto,
  type ReactivateMemberDto,
  type UpdateMemberMateDto,
} from '@sahibalquran/shared';
import { GroupMemberService } from './group-member.service';

@Controller('group-member')
export class GroupMemberController {
  constructor(private readonly groupMemberService: GroupMemberService) {}

  @Get(':groupId/unassigned')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  getUnassignedLearners(@Param('groupId') groupId: string) {
    return this.groupMemberService.getUnassignedLearners(groupId);
  }

  @Get(':groupId/removed')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  getRemovedMembers(@Param('groupId') groupId: string) {
    return this.groupMemberService.getRemovedMembers(groupId);
  }

  @Post('group-learners/create')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  createAndAssignLearners(
    @Body(new ZodValidationPipe(createAndAssignLearnersSchema('en')))
    dto: CreateAndAssignLearnersDto
  ) {
    return this.groupMemberService.createAndAssignLearners(dto);
  }

  @Post('group-learners/assign')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  assignLearnersToGroup(
    @Body(new ZodValidationPipe(assignLearnersToGroupSchema('en')))
    dto: AssignLearnersToGroupDto
  ) {
    return this.groupMemberService.assignLearnersToGroup(dto);
  }

  @Patch(':id/mate')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  updateMate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMemberMateSchema()))
    dto: UpdateMemberMateDto
  ) {
    return this.groupMemberService.updateMate(id, dto);
  }

  @Patch(':groupId/reactivate')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  reactivateMember(
    @Param('groupId') groupId: string,
    @Body(new ZodValidationPipe(reactivateMemberSchema('en'))) dto: ReactivateMemberDto,
    @User() actor: PrismaUser
  ) {
    return this.groupMemberService.reactivateMember(groupId, dto, actor.id);
  }

  @Delete(':id')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(@Param('id') id: string, @User() actor: PrismaUser) {
    return this.groupMemberService.removeMember(id, actor.id);
  }
}
