import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { queryClient, queryKeys } from '@/lib/query-client';
import { userService } from '@/modules/users/services/user.service';
import { groupService } from '../services/group.service';
import type { GroupDto, UpdateGroupDto, StaffUserDto } from '@sahibalquran/shared';

export function useGroupDetailViewModel(groupId: string) {
  const navigate = useNavigate();
  const isEditable = true;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const groupQuery = useApiQuery<GroupDto>({
    queryKey: queryKeys.groups.detail(groupId),
    queryFn: () => groupService.getGroup(groupId),
  });

  const staffQuery = useApiQuery<StaffUserDto[]>({
    queryKey: queryKeys.users.list({ scope: 'staff' }),
    queryFn: userService.getStaffUsers,
    enabled: isEditable,
  });

  const updateGroupMutation = useApiMutation<UpdateGroupDto, GroupDto>({
    mutationFn: (dto) => groupService.updateGroup(groupId, dto),
    onSuccess: async () => {
      toast.success('تم تحديث معلومات المجموعة');
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId) });
      setIsEditModalOpen(false);
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ'),
  });

  const deleteGroupMutation = useApiMutation<void, null>({
    mutationFn: () => groupService.deleteGroup(groupId),
    onSuccess: async () => {
      toast.success('تم حذف المجموعة بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      navigate('/groups');
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ أثناء حذف المجموعة'),
  });

  const group = groupQuery.data?.data;

  const handleUpdateGroup = async (dto: UpdateGroupDto) => {
    await updateGroupMutation.mutateAsync(dto);
  };

  return {
    group,
    isEditable,
    isLoading: groupQuery.isLoading,
    queryError: groupQuery.error?.message ?? null,
    // Staff
    staffUsers: staffQuery.data?.data ?? [],
    isLoadingStaff: staffQuery.isLoading,
    // Edit modal
    isEditModalOpen,
    openEditModal: () => setIsEditModalOpen(true),
    closeEditModal: () => setIsEditModalOpen(false),
    handleUpdateGroup,
    isUpdating: updateGroupMutation.isPending,
    // Schedule modal
    isScheduleModalOpen,
    openScheduleModal: () => setIsScheduleModalOpen(true),
    closeScheduleModal: () => setIsScheduleModalOpen(false),
    // Delete modal
    isDeleteModalOpen,
    openDeleteModal: () => setIsDeleteModalOpen(true),
    closeDeleteModal: () => setIsDeleteModalOpen(false),
    handleDeleteGroup: () => {
      void deleteGroupMutation.mutateAsync();
    },
    isDeleting: deleteGroupMutation.isPending,
  };
}
