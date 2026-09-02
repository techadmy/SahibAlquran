import { apiClient } from '@/services';
import type {
  CreateGroupDto,
  CreateWeekScheduleDto,
  GroupDto,
  GroupNameDto,
  GroupStatsDto,
  LearnerDto,
  QueryGroupsResponseDto,
  ReactivateMemberDto,
  UpdateGroupDto,
  WeekDto,
  GroupMemberDto,
  CreateAndAssignLearnersDto,
  AssignLearnersToGroupDto,
  ScheduleImageDto,
  UnifiedApiResponse,
  UpdateMemberMateDto,
} from '@sahibalquran/shared';

export const groupService = {
  getStats: async (): Promise<UnifiedApiResponse<GroupStatsDto>> =>
    apiClient.get<GroupStatsDto>('/stats'),

  queryGroups: async (): Promise<UnifiedApiResponse<QueryGroupsResponseDto>> => {
    return apiClient.get<QueryGroupsResponseDto>('/group');
  },

  getGroupNames: async (): Promise<UnifiedApiResponse<GroupNameDto[]>> => {
    return apiClient.get<GroupNameDto[]>('/group/names');
  },

  getGroup: async (id: string): Promise<UnifiedApiResponse<GroupDto>> => {
    return apiClient.get<GroupDto>(`/group/${id}`);
  },

  createGroup: async (dto: CreateGroupDto): Promise<UnifiedApiResponse<GroupDto>> => {
    return apiClient.post<GroupDto>('/group', dto);
  },

  updateGroup: async (id: string, dto: UpdateGroupDto): Promise<UnifiedApiResponse<GroupDto>> => {
    return apiClient.patch<GroupDto>(`/group/${id}`, dto);
  },

  deleteGroup: async (id: string): Promise<UnifiedApiResponse<null>> => {
    await apiClient.delete<void>(`/group/${id}`);
    return { success: true, data: null };
  },

  // Schedule
  getGroupSchedules: async (groupId: string): Promise<UnifiedApiResponse<WeekDto[]>> => {
    return apiClient.get<WeekDto[]>(`/group/${groupId}/schedule`);
  },

  createScheduleImage: async (
    groupId: string,
    dto: CreateWeekScheduleDto,
    file: File
  ): Promise<UnifiedApiResponse<WeekDto>> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('scheduleName', dto.scheduleName);
    if (dto.saturdayDate) formData.append('saturdayDate', dto.saturdayDate);
    return apiClient.post<WeekDto>(`/group/${groupId}/schedule`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateScheduleImage: async (
    groupId: string,
    imageId: string,
    file: File | null,
    name?: string
  ): Promise<UnifiedApiResponse<ScheduleImageDto>> => {
    const formData = new FormData();
    if (file) formData.append('image', file);
    if (name) formData.append('name', name);
    return apiClient.patch<ScheduleImageDto>(
      `/group/${groupId}/schedule-image/${imageId}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
  },

  // Learners
  getGroupLearners: async (groupId: string): Promise<UnifiedApiResponse<GroupMemberDto[]>> => {
    return apiClient.get<GroupMemberDto[]>(`/group/${groupId}/learners`);
  },

  getRemovedGroupLearners: async (
    groupId: string
  ): Promise<UnifiedApiResponse<GroupMemberDto[]>> => {
    return apiClient.get<GroupMemberDto[]>(`/group-member/${groupId}/removed`);
  },

  createAndAssignLearners: async (
    dto: CreateAndAssignLearnersDto
  ): Promise<UnifiedApiResponse<GroupMemberDto[]>> => {
    return apiClient.post<GroupMemberDto[]>('/group-member/group-learners/create', dto);
  },

  getUnassignedLearners: async (groupId: string): Promise<UnifiedApiResponse<LearnerDto[]>> => {
    return apiClient.get<LearnerDto[]>(`/group-member/${groupId}/unassigned`);
  },

  assignLearnersToGroup: async (
    dto: AssignLearnersToGroupDto
  ): Promise<UnifiedApiResponse<GroupMemberDto[]>> => {
    return apiClient.post<GroupMemberDto[]>('/group-member/group-learners/assign', dto);
  },

  updateMemberMate: async (
    memberId: string,
    dto: UpdateMemberMateDto
  ): Promise<UnifiedApiResponse<GroupMemberDto>> => {
    return apiClient.patch<GroupMemberDto>(`/group-member/${memberId}/mate`, dto);
  },

  removeMember: async (memberId: string): Promise<UnifiedApiResponse<null>> => {
    await apiClient.delete<void>(`/group-member/${memberId}`);
    return { success: true, data: null };
  },

  reactivateMember: async (
    groupId: string,
    dto: ReactivateMemberDto
  ): Promise<UnifiedApiResponse<null>> => {
    await apiClient.patch<void>(`/group-member/${groupId}/reactivate`, dto);
    return { success: true, data: null };
  },

  getEligibleActivationGroups: (): Promise<UnifiedApiResponse<GroupDto[]>> =>
    apiClient.get<GroupDto[]>('/group/student/eligible-for-activation'),

  getMyGroups: (): Promise<UnifiedApiResponse<GroupDto[]>> =>
    apiClient.get<GroupDto[]>('/group/student/my-groups'),

  getRemovedGroups: (): Promise<UnifiedApiResponse<GroupDto[]>> =>
    apiClient.get<GroupDto[]>('/group/student/removed-groups'),
};
