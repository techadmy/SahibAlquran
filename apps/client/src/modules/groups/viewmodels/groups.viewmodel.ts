import { useState } from 'react';
import { toast } from 'sonner';
import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { queryClient, queryKeys } from '@/lib/query-client';
import { useApp } from '@/contexts/AppContext';
import { userService } from '@/modules/users/services/user.service';
import { groupService } from '../services/group.service';
import type { CreateGroupDto, GroupDto, GroupStatsDto, StaffUserDto } from '@sahibalquran/shared';

export function useGroupsViewModel() {
  const { user } = useApp();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const isStudent = user?.role === 'STUDENT';

  const statsQuery = useApiQuery<GroupStatsDto>({
    queryKey: queryKeys.groups.stats('groups-count'),
    queryFn: groupService.getStats,
    enabled: !isStudent,
  });

  const groupsQuery = useApiQuery<GroupDto[]>({
    queryKey: queryKeys.groups.list(),
    queryFn: groupService.queryGroups,
  });

  const removedGroupsQuery = useApiQuery<GroupDto[]>({
    queryKey: queryKeys.groups.removedGroups(),
    queryFn: groupService.getRemovedGroups,
    enabled: isStudent,
  });

  const staffQuery = useApiQuery<StaffUserDto[]>({
    queryKey: queryKeys.users.list({ scope: 'staff' }),
    queryFn: userService.getStaffUsers,
    enabled: isCreateModalOpen && !isStudent,
  });

  const createGroupMutation = useApiMutation<CreateGroupDto, GroupDto>({
    mutationFn: groupService.createGroup,
    onSuccess: async () => {
      toast.success('تم إنشاء المجموعة بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      setIsCreateModalOpen(false);
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ أثناء إنشاء المجموعة'),
  });

  const stats = statsQuery.data?.data;

  return {
    // Groups list
    groups: groupsQuery.data?.data ?? [],
    removedGroups: removedGroupsQuery.data?.data ?? [],
    isLoadingGroups: groupsQuery.isLoading,
    groupsError: groupsQuery.error?.message,

    // Stats
    groupsCount: stats?.groupsCount ?? 0,
    learnersCount: stats?.learnersCount ?? 0,
    moderatorsCount: stats?.moderatorsCount ?? 0,
    isLoadingStats: statsQuery.isLoading,

    // Staff for moderator select
    staffUsers: staffQuery.data?.data ?? [],
    isLoadingStaff: staffQuery.isLoading,

    canManageGroups: user?.role === 'ADMIN' || user?.role === 'MODERATOR',
    isAdmin: user?.role === 'ADMIN',
    isStudent,

    // Modal
    isCreateModalOpen,
    setIsCreateModalOpen,

    createGroup: async (dto: CreateGroupDto): Promise<void> => {
      await createGroupMutation.mutateAsync(dto);
    },
    isCreating: createGroupMutation.isPending,
  };
}
