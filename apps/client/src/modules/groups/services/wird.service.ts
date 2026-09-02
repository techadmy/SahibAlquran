import { apiClient } from '@/services';
import type {
  GroupWirdTrackingDto,
  WeekWithCurrentFlagDto,
  UnifiedApiResponse,
  StudentWeekWirdsDto,
  UpdateStudentWirdsDto,
} from '@sahibalquran/shared';

export const wirdService = {
  getGroupWeeks: (groupId: string): Promise<UnifiedApiResponse<WeekWithCurrentFlagDto[]>> =>
    apiClient.get<WeekWithCurrentFlagDto[]>(`/student-wird/group/${groupId}/weeks`),

  getWeekTracking: (
    groupId: string,
    weekId: string
  ): Promise<UnifiedApiResponse<GroupWirdTrackingDto>> =>
    apiClient.get<GroupWirdTrackingDto>(`/student-wird/group/${groupId}/week/${weekId}`),

  getStudentWeekWirds: (
    studentId: string,
    weekId: string
  ): Promise<UnifiedApiResponse<StudentWeekWirdsDto>> =>
    apiClient.get<StudentWeekWirdsDto>(`/student-wird/student/${studentId}/week/${weekId}`),

  updateStudentWeekWirds: (
    studentId: string,
    weekId: string,
    dto: UpdateStudentWirdsDto
  ): Promise<UnifiedApiResponse<void>> =>
    apiClient.patch<void>(`/student-wird/student/${studentId}/week/${weekId}`, dto),
};
