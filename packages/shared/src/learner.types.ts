import {
  ISODateString,
  PaginationQueryType,
  PaginationResponseMeta,
  TimeZoneType,
} from './types/api.types';
import type { UserRole } from './user.types';
import type { PlatformType, RecitationType } from './learner-details.constants';

export interface LearnerContactDto {
  notes?: string;
  age?: number;
  platform?: PlatformType;
  schedule?: number;
  recitation?: RecitationType;
}

export interface LearnerGroupSummaryDto {
  id: string;
  name: string;
  removedAt?: ISODateString;
}

export interface LearnerDto {
  id: string;
  phone: string | null;
  name: string;
  role: UserRole;
  timezone: TimeZoneType;
  contact: LearnerContactDto;
  groupCount?: number;
  groups?: LearnerGroupSummaryDto[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateLearnerDto {
  name: string;
  phone: string;
  timezone: TimeZoneType;
  contact?: LearnerContactDto;
}

export interface UpdateLearnerDto {
  name?: string;
  phone?: string;
  timezone?: TimeZoneType;
  contact?: LearnerContactDto;
  password?: string;
}

export type QueryLearnersDto = PaginationQueryType & {
  search?: string;
  sortBy?:
    | 'name'
    | 'timezone'
    | 'notes'
    | 'groupCount'
    | 'groups'
    | 'createdAt'
    | 'age'
    | 'schedule'
    | 'recitation'
    | 'platform';
  sortOrder?: 'asc' | 'desc';
  timezone?: TimeZoneType;
  recitation?: RecitationType;
  platform?: PlatformType;
  groupId?: string;
};

export type QueryLearnersResponseDto = {
  data: LearnerDto[];
} & PaginationResponseMeta;
