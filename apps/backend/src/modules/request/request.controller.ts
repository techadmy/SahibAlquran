import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserRole } from 'generated/prisma/client';
import { Roles } from '../../decorators/roles.decorator';
import { User } from '../../decorators/user.decorator';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { RequestService } from './request.service';
import { RequestOrchestrator } from './request.orchestrator';
import {
  createExcuseRequestSchema,
  createActivationRequestSchema,
  reviewRequestSchema,
  type CreateRequestDto,
  type RequestDto,
  type ReviewRequestDto,
  type RequestStatus,
  type RequestStatsDto,
  type UserRole as UserRoleType,
  type PaginationQueryType,
} from '@sahibalquran/shared';

@Controller('request')
export class RequestController {
  constructor(
    private readonly requestService: RequestService,
    private readonly orchestrator: RequestOrchestrator
  ) {}

  @Post('excuse')
  @Roles([UserRole.STUDENT])
  createExcuseRequest(
    @Body(new ZodValidationPipe(createExcuseRequestSchema('en')))
    dto: CreateRequestDto<'EXCUSE'>,
    @User('id') studentId: string
  ): Promise<RequestDto<'EXCUSE'>> {
    return this.requestService.createRequest(dto, studentId);
  }

  @Post('activation')
  @Roles([UserRole.STUDENT])
  createActivationRequest(
    @Body(new ZodValidationPipe(createActivationRequestSchema('en')))
    dto: CreateRequestDto<'ACTIVATION'>,
    @User('id') studentId: string
  ): Promise<RequestDto<'ACTIVATION'>> {
    return this.requestService.createRequest(dto, studentId);
  }

  @Get('my')
  @Roles([UserRole.STUDENT])
  getMyRequests(@User('id') studentId: string): Promise<RequestDto[]> {
    return this.requestService.getMyRequests(studentId);
  }

  @Get()
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  getRequests(
    @User() actor: { id: string; role: UserRoleType },
    @Query('status') status?: RequestStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const query: PaginationQueryType & { status?: RequestStatus } = {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      status,
    };
    return this.requestService.getRoleFilteredRequests(actor, query);
  }

  @Get('stats')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  getStats(@User() actor: { id: string; role: UserRoleType }): Promise<RequestStatsDto> {
    return this.requestService.getStats(actor);
  }

  @Patch(':id/review')
  @Roles([UserRole.ADMIN, UserRole.MODERATOR])
  @HttpCode(HttpStatus.OK)
  async reviewRequest(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reviewRequestSchema('en'))) dto: ReviewRequestDto,
    @User('id') reviewerId: string
  ): Promise<RequestDto> {
    if (dto.action === 'ACCEPT') {
      return this.orchestrator.acceptRequest(id, reviewerId);
    } else {
      return this.orchestrator.rejectRequest(id, reviewerId);
    }
  }
}
