import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DateRangeQueryType,
  PaginationQueryType,
  PaginationResponseMeta,
  getStartAndEndOfDay,
} from '@sahibalquran/shared';
import { Prisma, PrismaClient } from 'generated/prisma/client';
import { createMariaDbAdapter } from './database.util';
import { EnvVariables } from 'src/types/declartion-merging';

@Injectable()
export class DatabaseService extends PrismaClient {
  constructor(configService: ConfigService<EnvVariables>) {
    super({
      adapter: createMariaDbAdapter({
        DATABASE_HOST: configService.getOrThrow('DATABASE_HOST'),
        DATABASE_USER: configService.getOrThrow('DATABASE_USER'),
        DATABASE_PASSWORD: configService.getOrThrow('DATABASE_PASSWORD'),
        DATABASE_NAME: configService.getOrThrow('DATABASE_NAME'),
        DATABASE_PORT: configService.getOrThrow('DATABASE_PORT'),
      }),
    });
  }

  handleDateRangeFilter(
    query: DateRangeQueryType,
    timezone: string
  ): Prisma.DateTimeFilter | undefined {
    if (!query.fromDate && !query.toDate) {
      return undefined;
    }

    const dateRangeFilter: Prisma.DateTimeFilter = {};

    if (query.fromDate) {
      const { startAsJSDate } = getStartAndEndOfDay(timezone, query.fromDate);
      dateRangeFilter.gte = startAsJSDate;
    }

    if (query.toDate) {
      const { endAsJSDate } = getStartAndEndOfDay(timezone, query.toDate);
      dateRangeFilter.lte = endAsJSDate;
    }

    return dateRangeFilter;
  }

  handleQueryPagination(query: PaginationQueryType) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    return { skip: (page - 1) * limit, take: limit, page };
  }

  handleSortingClause<TSortField extends string>(
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc' | undefined,
    allowedFields: TSortField[]
  ): Record<TSortField, Prisma.SortOrder> | undefined {
    if (!sortBy || !allowedFields.includes(sortBy as TSortField)) {
      return undefined;
    }

    const direction: Prisma.SortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
    return { [sortBy]: direction } as Record<TSortField, Prisma.SortOrder>;
  }

  formatPaginationResponse(args: {
    page: number;
    count: number;
    limit: number;
  }): PaginationResponseMeta {
    return {
      meta: {
        total: args.count,
        page: args.page,
        limit: args.limit,
        totalPages: Math.ceil(args.count / args.limit),
      },
    };
  }
}
