import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type {
  ChangeOwnPasswordDto,
  CreateStaffUserDto,
  CreateLearnerDto,
  LearnerDto,
  PromoteLearnersToModeratorDto,
  StaffUserDto,
  StaffUsersResponseDto,
  QueryLearnersDto,
  QueryLearnersResponseDto,
  UpdateOwnProfileDto,
  UpdateStaffUserDto,
  UpdateLearnerDto,
  UserAuthType,
} from '@sahibalquran/shared';

import { UserRole } from 'generated/prisma/client';
import type { User as UserEntity } from 'generated/prisma/client';
import { Roles } from 'src/decorators/roles.decorator';
import { User } from 'src/decorators/user.decorator';
import { ZodValidationPipe } from 'src/pipes/zod-validation.pipe';
import {
  createLearnerSchema,
  queryLearnersSchema,
  updateLearnerSchema,
  createStaffSchema,
  updateStaffSchema,
  changeOwnPasswordSchema,
  updateOwnProfileSchema,
  promoteLearnersToModeratorSchema,
} from '@sahibalquran/shared';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('learner')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  createLearner(
    @Body(new ZodValidationPipe(createLearnerSchema('en')))
    dto: CreateLearnerDto
  ): Promise<LearnerDto> {
    return this.userService.createLearner(dto);
  }

  @Get('learner')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  queryLearners(
    @Query(new ZodValidationPipe(queryLearnersSchema('en')))
    query: QueryLearnersDto
  ): Promise<QueryLearnersResponseDto> {
    return this.userService.queryLearners(query);
  }

  @Get('learner/export')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  exportLearners(): Promise<LearnerDto[]> {
    return this.userService.exportLearners();
  }

  @Patch('learner/:id')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  updateLearner(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateLearnerSchema('en')))
    dto: UpdateLearnerDto
  ): Promise<LearnerDto> {
    return this.userService.updateLearner(id, dto);
  }

  @Delete('learner/:id')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  async deleteLearner(@Param('id') id: string): Promise<void> {
    await this.userService.deleteLearner(id);
  }

  @Post('learner/promote')
  @Roles([UserRole.ADMIN])
  async promoteLearnersToModerator(
    @Body(new ZodValidationPipe(promoteLearnersToModeratorSchema('en')))
    dto: PromoteLearnersToModeratorDto
  ): Promise<void> {
    await this.userService.promoteLearnersToModerator(dto.studentIds);
  }

  @Get('staff')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  getStaffUsers(@User() actor: UserEntity): Promise<StaffUsersResponseDto> {
    return this.userService.getStaffUsers(actor);
  }

  @Post('staff')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  createStaffUser(
    @User() actor: UserEntity,
    @Body(new ZodValidationPipe(createStaffSchema('en')))
    dto: CreateStaffUserDto
  ): Promise<StaffUserDto> {
    return this.userService.createStaffUser(actor, dto);
  }

  @Patch('staff/:id')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  updateStaffUser(
    @Param('id') id: string,
    @User() actor: UserEntity,
    @Body(new ZodValidationPipe(updateStaffSchema('en')))
    dto: UpdateStaffUserDto
  ): Promise<StaffUserDto> {
    return this.userService.updateStaffUser(id, actor, dto);
  }

  @Delete('staff/:id')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  async deleteStaffUser(@Param('id') id: string, @User() actor: UserEntity): Promise<void> {
    await this.userService.deleteStaffUser(id, actor);
  }

  @Get('me')
  getMe(@User() user: UserEntity): Promise<UserAuthType> {
    return this.userService.getMe(user.id);
  }

  @Patch('me/profile')
  updateOwnProfile(
    @User() user: UserEntity,
    @Body(new ZodValidationPipe(updateOwnProfileSchema('en')))
    dto: UpdateOwnProfileDto
  ): Promise<UserAuthType> {
    return this.userService.updateOwnProfile(user.id, dto);
  }

  @Post('me/change-password')
  async changeOwnPassword(
    @User() user: UserEntity,
    @Body(new ZodValidationPipe(changeOwnPasswordSchema('en')))
    dto: ChangeOwnPasswordDto
  ): Promise<void> {
    await this.userService.changeOwnPassword(user.id, dto);
  }
}
