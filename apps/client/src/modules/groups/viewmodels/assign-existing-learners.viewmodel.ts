import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { queryClient, queryKeys } from '@/lib/query-client';
import { groupService } from '../services/group.service';
import type { AssignLearnersToGroupDto, LearnerDto } from '@sahibalquran/shared';

export function useAssignExistingLearnersViewModel(groupId: string, isActive: boolean) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const learnersQuery = useApiQuery<LearnerDto[]>({
    queryKey: queryKeys.groups.unassigned(groupId),
    queryFn: () => groupService.getUnassignedLearners(groupId),
    enabled: isActive,
  });

  const learners = learnersQuery.data?.data ?? [];

  const filtered = useMemo(
    () => learners.filter((l) => l.name.toLowerCase().includes(search.toLowerCase())),
    [learners, search]
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((l) => l.id))
    );
  };

  const assignMutation = useApiMutation<AssignLearnersToGroupDto, unknown>({
    mutationFn: (dto) => groupService.assignLearnersToGroup(dto),
    onSuccess: async () => {
      toast.success('تمت إضافة الطلاب بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.learners(groupId) });
      await queryClient.invalidateQueries({ queryKey: ['wirds', 'tracking', groupId] });
      setSelected(new Set());
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ'),
  });

  const handleAssign = async () => {
    if (selected.size === 0) return;
    await assignMutation.mutateAsync({ groupId, studentIds: Array.from(selected) });
  };

  return {
    search,
    setSearch,
    filtered,
    selected,
    toggleSelect,
    toggleAll,
    handleAssign,
    isLoading: learnersQuery.isLoading,
    isAssigning: assignMutation.isPending,
  };
}
