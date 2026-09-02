import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from 'generated/prisma/client';
import { Roles } from 'src/decorators/roles.decorator';
import { User } from 'src/decorators/user.decorator';
import { ZodValidationPipe } from 'src/pipes/zod-validation.pipe';
import { createExcuseSchema, type CreateExcuseDto, type ExcuseDto } from '@sahibalquran/shared';
import { ExcuseService } from './excuse.service';

@Controller('excuse')
export class ExcuseController {
  constructor(private readonly excuseService: ExcuseService) {}

  @Get(':groupId/student/:studentId')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  getStudentExcuses(
    @Param('groupId') groupId: string,
    @Param('studentId') studentId: string
  ): Promise<ExcuseDto[]> {
    return this.excuseService.getStudentExcuses(studentId, groupId);
  }

  @Post()
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  createExcuse(
    @Body(new ZodValidationPipe(createExcuseSchema('en'))) dto: CreateExcuseDto,
    @User('id') userId: string
  ): Promise<ExcuseDto> {
    return this.excuseService.createExcuse(dto, userId);
  }

  @Patch(':id/disable')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  @HttpCode(HttpStatus.OK)
  disableExcuse(@Param('id') id: string): Promise<ExcuseDto> {
    return this.excuseService.disableExcuse(id);
  }
}
