import { apiClient } from '@/services';
import {
  CreateLearnerDto,
  LearnerDto,
  QueryLearnersDto,
  UnifiedApiResponse,
  UpdateLearnerDto,
} from '@sahibalquran/shared';

export const learnerService = {
  queryLearners: async (query: QueryLearnersDto): Promise<UnifiedApiResponse<LearnerDto[]>> => {
    const params = new URLSearchParams();
    params.set('page', String(query.page ?? 1));
    params.set('limit', String(query.limit ?? 10));
    if (query.search?.trim()) {
      params.set('search', query.search.trim());
    }
    if (query.sortBy) {
      params.set('sortBy', query.sortBy);
    }
    if (query.sortOrder) {
      params.set('sortOrder', query.sortOrder);
    }
    if (query.timezone) {
      params.set('timezone', query.timezone);
    }
    if (query.recitation) {
      params.set('recitation', query.recitation);
    }
    if (query.platform) {
      params.set('platform', query.platform);
    }
    if (query.groupId) {
      params.set('groupId', query.groupId);
    }

    return apiClient.get<LearnerDto[]>(`/user/learner?${params.toString()}`);
  },

  exportLearnersData: async (): Promise<LearnerDto[]> => {
    const response = await apiClient.get<LearnerDto[]>('/user/learner/export');
    return response.data;
  },

  createLearner: async (data: CreateLearnerDto): Promise<UnifiedApiResponse<LearnerDto>> => {
    return apiClient.post<LearnerDto>('/user/learner', data);
  },

  updateLearner: async (
    id: string,
    data: UpdateLearnerDto
  ): Promise<UnifiedApiResponse<LearnerDto>> => {
    return apiClient.patch<LearnerDto>(`/user/learner/${id}`, data);
  },

  deleteLearner: async (id: string): Promise<UnifiedApiResponse<null>> => {
    await apiClient.delete<void>(`/user/learner/${id}`);
    return {
      success: true,
      data: null,
    };
  },
};
