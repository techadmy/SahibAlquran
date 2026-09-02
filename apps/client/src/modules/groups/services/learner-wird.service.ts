import { apiClient } from '@/services';
import type {
  LearnerGroupOverviewDto,
  RecordLearnerWirdDto,
  UnifiedApiResponse,
} from '@sahibalquran/shared';

export const learnerWirdService = {
  getLearnerGroupOverview: (
    groupId: string
  ): Promise<UnifiedApiResponse<LearnerGroupOverviewDto>> =>
    apiClient.get<LearnerGroupOverviewDto>(`/student-wird/my-group/${groupId}/overview`),

  recordLearnerWird: (dto: RecordLearnerWirdDto): Promise<UnifiedApiResponse<void>> =>
    apiClient.post<void>('/student-wird/my-wird', dto),
};
