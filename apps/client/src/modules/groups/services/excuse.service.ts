import { apiClient } from '@/services';
import type { CreateExcuseDto, ExcuseDto, UnifiedApiResponse } from '@sahibalquran/shared';

export const excuseService = {
  getStudentExcuses: (
    studentId: string,
    groupId: string
  ): Promise<UnifiedApiResponse<ExcuseDto[]>> =>
    apiClient.get<ExcuseDto[]>(`/excuse/${groupId}/student/${studentId}`),

  createExcuse: (dto: CreateExcuseDto): Promise<UnifiedApiResponse<ExcuseDto>> =>
    apiClient.post<ExcuseDto>('/excuse', dto),

  disableExcuse: (id: string): Promise<UnifiedApiResponse<ExcuseDto>> =>
    apiClient.patch<ExcuseDto>(`/excuse/${id}/disable`, {}),
};
