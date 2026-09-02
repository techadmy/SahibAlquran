import { useState } from 'react';
import { toast } from 'sonner';
import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { queryClient, queryKeys } from '@/lib/query-client';
import { groupService } from '../services/group.service';
import { learnerService } from '@/modules/learners/services/learner.service';
import type {
  CreateAndAssignLearnersDto,
  GroupMemberDto,
  LearnerDto,
  UpdateLearnerDto,
  UpdateMemberMateDto,
} from '@sahibalquran/shared';

export function useGroupLearnersViewModel(groupId: string) {
  const [page, setPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Mate edit state (still managed at view level because it needs the members list)
  const [memberPendingMateEdit, setMemberPendingMateEdit] = useState<GroupMemberDto | null>(null);

  const learnersQuery = useApiQuery<GroupMemberDto[]>({
    queryKey: queryKeys.groups.learners(groupId),
    queryFn: () => groupService.getGroupLearners(groupId),
    placeholderData: (prev) => prev,
  });

  const removedLearnersQuery = useApiQuery<GroupMemberDto[]>({
    queryKey: queryKeys.groups.removedLearners(groupId),
    queryFn: () => groupService.getRemovedGroupLearners(groupId),
    placeholderData: (prev) => prev,
  });

  const createLearnersMutation = useApiMutation<CreateAndAssignLearnersDto, GroupMemberDto[]>({
    mutationFn: (dto) => groupService.createAndAssignLearners(dto),
    onSuccess: async () => {
      toast.success('تمت إضافة الطلاب بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.removedLearners(groupId) });
      await queryClient.invalidateQueries({ queryKey: ['wirds', 'tracking', groupId] });
      setIsAddModalOpen(false);
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ'),
  });

  const updateLearnerMutation = useApiMutation<{ id: string; data: UpdateLearnerDto }, LearnerDto>({
    mutationFn: ({ id, data }) => learnerService.updateLearner(id, data),
    onSuccess: async () => {
      toast.success('تم تعديل بيانات الطالب بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.learners(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.learners.all });
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ'),
  });

  const removeMemberMutation = useApiMutation<string, null>({
    mutationFn: (memberId) => groupService.removeMember(memberId),
    onSuccess: async () => {
      toast.success('تم إزالة الطالب من المجموعة');
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.learners(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.removedLearners(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      await queryClient.invalidateQueries({ queryKey: ['wirds', 'tracking', groupId] });
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ'),
  });

  const updateMateMutation = useApiMutation<
    { memberId: string; dto: UpdateMemberMateDto },
    GroupMemberDto
  >({
    mutationFn: ({ memberId, dto }) => groupService.updateMemberMate(memberId, dto),
    onSuccess: async () => {
      toast.success('تم تحديث الزميل بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.learners(groupId) });
      await queryClient.invalidateQueries({ queryKey: ['wirds', 'tracking', groupId] });
      setMemberPendingMateEdit(null);
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ'),
  });

  const members = learnersQuery.data?.data ?? [];
  const removedMembers = removedLearnersQuery.data?.data ?? [];
  const total = learnersQuery.data?.meta?.total ?? 0;
  const totalPages = learnersQuery.data?.meta?.totalPages ?? 1;

  const handleAddLearners = async (dto: CreateAndAssignLearnersDto) => {
    await createLearnersMutation.mutateAsync(dto);
  };

  const handleUpdateLearner = async (studentId: string, data: UpdateLearnerDto) => {
    await updateLearnerMutation.mutateAsync({ id: studentId, data });
  };

  const handleRemoveMember = async (memberId: string) => {
    await removeMemberMutation.mutateAsync(memberId);
  };

  const handleUpdateMate = async (mateId: string | null) => {
    if (!memberPendingMateEdit) return;
    await updateMateMutation.mutateAsync({ memberId: memberPendingMateEdit.id, dto: { mateId } });
  };

  return {
    members,
    removedMembers,
    total,
    totalPages,
    page,
    setPage,
    isLoading: learnersQuery.isLoading,
    isLoadingRemovedMembers: removedLearnersQuery.isLoading,
    queryError: learnersQuery.error?.message ?? null,
    // Add modal
    isAddModalOpen,
    openAddModal: () => setIsAddModalOpen(true),
    closeAddModal: () => setIsAddModalOpen(false),
    handleAddLearners,
    isAdding: createLearnersMutation.isPending,
    // Direct action handlers (state managed in LearnerEditDeleteActions)
    handleUpdateLearner,
    handleRemoveMember,
    isUpdatingLearner: updateLearnerMutation.isPending,
    isRemovingMember: removeMemberMutation.isPending,
    // Mate edit flow
    memberPendingMateEdit,
    setMemberPendingMateEdit,
    handleUpdateMate,
    isUpdatingMate: updateMateMutation.isPending,
  };
}
