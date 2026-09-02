import { useState } from 'react';
import { toast } from 'sonner';
import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { queryClient, queryKeys } from '@/lib/query-client';
import { requestService } from '../services/request.service';
import { groupService } from '@/modules/groups';
import { useApp } from '@/contexts/AppContext';
import type {
  GroupDto,
  ISODateOnlyString,
  ISODateString,
  CreateRequestDto,
  RequestDto,
} from '@sahibalquran/shared';

export function useExcuseRequestViewModel(isOpen: boolean, defaultGroupId?: string) {
  const { user } = useApp();
  const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultGroupId ?? '');
  const [expiryDate, setExpiryDate] = useState<ISODateOnlyString | undefined>();
  const [expiryTime] = useState<string>('23:59');
  const [reason, setReason] = useState<string>('');

  const groupsQuery = useApiQuery<GroupDto[]>({
    queryKey: queryKeys.groups.myGroups(),
    queryFn: () => groupService.getMyGroups(),
    enabled: isOpen,
  });

  const createMutation = useApiMutation<CreateRequestDto<'EXCUSE'>, RequestDto<'EXCUSE'>>({
    mutationFn: (dto) => requestService.createExcuseRequest(dto),
    onSuccess: () => {
      toast.success('تم إرسال طلب العذر بنجاح');
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.myList() });
      setSelectedGroupId(defaultGroupId ?? '');
      setExpiryDate(undefined);
      setReason('');
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ'),
  });

  const handleSubmit = () => {
    if (!selectedGroupId) {
      toast.error('الرجاء اختيار المجموعة');
      return;
    }
    if (!expiryDate) {
      toast.error('الرجاء اختيار تاريخ انتهاء العذر');
      return;
    }

    const expiresAt = `${expiryDate}T${expiryTime}:00.000Z` as ISODateString;

    createMutation.mutate({
      type: 'EXCUSE',
      payload: { groupId: selectedGroupId, expiresAt, reason: reason.trim() },
    });
  };

  return {
    groups: groupsQuery.data?.data ?? [],
    isLoading: groupsQuery.isLoading,
    selectedGroupId,
    setSelectedGroupId,
    expiryDate,
    setExpiryDate,
    reason,
    setReason,
    handleSubmit,
    isSubmitting: createMutation.isPending,
    userTimezone: user?.timezone ?? 'UTC',
  };
}
