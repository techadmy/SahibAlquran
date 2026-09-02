import { useState } from 'react';
import { toast } from 'sonner';
import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { queryClient, queryKeys } from '@/lib/query-client';
import { requestService } from '../services/request.service';
import { groupService } from '@/modules/groups';
import type { GroupDto, CreateRequestDto, RequestDto } from '@sahibalquran/shared';

export function useActivationRequestViewModel(isOpen: boolean, defaultGroupId?: string) {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultGroupId ?? '');

  const groupsQuery = useApiQuery<GroupDto[]>({
    queryKey: queryKeys.groups.eligibleForActivation(),
    queryFn: () => groupService.getEligibleActivationGroups(),
    enabled: isOpen,
  });

  const createMutation = useApiMutation<CreateRequestDto<'ACTIVATION'>, RequestDto<'ACTIVATION'>>({
    mutationFn: (dto) => requestService.createActivationRequest(dto),
    onSuccess: () => {
      toast.success('تم إرسال طلب التفعيل بنجاح');
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.myList() });
      setSelectedGroupId(defaultGroupId ?? '');
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ'),
  });

  const handleSubmit = () => {
    if (!selectedGroupId) {
      toast.error('الرجاء اختيار المجموعة');
      return;
    }

    createMutation.mutate({
      type: 'ACTIVATION',
      payload: { groupId: selectedGroupId },
    });
  };

  return {
    groups: groupsQuery.data?.data ?? [],
    isLoading: groupsQuery.isLoading,
    selectedGroupId,
    setSelectedGroupId,
    handleSubmit,
    isSubmitting: createMutation.isPending,
  };
}
