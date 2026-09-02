import { apiClient } from '@/services';
import type {
  CreateRequestDto,
  RequestDto,
  ReviewRequestDto,
  RequestStatsDto,
  UnifiedApiResponse,
} from '@sahibalquran/shared';

export const requestService = {
  createExcuseRequest: (
    dto: CreateRequestDto<'EXCUSE'>
  ): Promise<UnifiedApiResponse<RequestDto<'EXCUSE'>>> =>
    apiClient.post<RequestDto<'EXCUSE'>>('/request/excuse', dto),

  createActivationRequest: (
    dto: CreateRequestDto<'ACTIVATION'>
  ): Promise<UnifiedApiResponse<RequestDto<'ACTIVATION'>>> =>
    apiClient.post<RequestDto<'ACTIVATION'>>('/request/activation', dto),

  getMyRequests: (): Promise<UnifiedApiResponse<RequestDto[]>> =>
    apiClient.get<RequestDto[]>('/request/my'),

  getRequests: (
    status?: string,
    page = 1,
    limit = 10
  ): Promise<UnifiedApiResponse<RequestDto[]>> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return apiClient.get<RequestDto[]>(`/request?${params}`);
  },

  getStats: (): Promise<UnifiedApiResponse<RequestStatsDto>> =>
    apiClient.get<RequestStatsDto>('/request/stats'),

  reviewRequest: (id: string, dto: ReviewRequestDto): Promise<UnifiedApiResponse<RequestDto>> =>
    apiClient.patch<RequestDto>(`/request/${id}/review`, dto),
};
