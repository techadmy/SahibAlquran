import { useState } from 'react';
import { toast } from 'sonner';
import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { queryClient, queryKeys } from '@/lib/query-client';
import { useApp } from '@/contexts/AppContext';
import { excuseService } from '../services/excuse.service';
import { getNowAsUTC, dateOnlyToUTC } from '@sahibalquran/shared';
import type { ExcuseDto, ISODateOnlyString } from '@sahibalquran/shared';

export function useExcuseModalViewModel(
  studentId: string,
  groupId: string,
  isOpen: boolean,
  weekId?: string
) {
  const { user } = useApp();
  const userTimezone = user?.timezone ?? 'UTC';

  const [newExpiryDate, setNewExpiryDate] = useState<ISODateOnlyString | undefined>();

  const excusesQuery = useApiQuery<ExcuseDto[]>({
    queryKey: queryKeys.excuses.student(studentId, groupId),
    queryFn: () => excuseService.getStudentExcuses(studentId, groupId),
    enabled: isOpen,
  });

  const disableMutation = useApiMutation<string, ExcuseDto>({
    mutationFn: (id) => excuseService.disableExcuse(id),
    onSuccess: async () => {
      toast.success('تم إلغاء العذر بنجاح');
      await queryClient.invalidateQueries({
        queryKey: queryKeys.excuses.student(studentId, groupId),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.learners(groupId) });
      if (weekId)
        await queryClient.invalidateQueries({
          queryKey: queryKeys.wirds.tracking(groupId, weekId),
        });
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ'),
  });

  const createMutation = useApiMutation<
    { studentId: string; groupId: string; expiresAt: string },
    ExcuseDto
  >({
    mutationFn: (dto) =>
      excuseService.createExcuse({
        studentId: dto.studentId,
        groupId: dto.groupId,
        expiresAt: dto.expiresAt as ExcuseDto['expiresAt'],
      }),
    onSuccess: async () => {
      toast.success('تم إضافة العذر بنجاح');
      setNewExpiryDate(undefined);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.excuses.student(studentId, groupId),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.learners(groupId) });
      if (weekId)
        await queryClient.invalidateQueries({
          queryKey: queryKeys.wirds.tracking(groupId, weekId),
        });
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ'),
  });

  const excuses = excusesQuery.data?.data ?? [];

  const isActive = (excuse: ExcuseDto) => excuse.expiresAt > getNowAsUTC();

  const handleDisable = (id: string) => {
    disableMutation.mutate(id);
  };

  const handleCreate = () => {
    if (!newExpiryDate) return;
    const expiresAt = dateOnlyToUTC(newExpiryDate).toISOString();
    createMutation.mutate({
      studentId,
      groupId,
      expiresAt,
    });
  };

  const hasActiveExcuse = excuses.some(isActive);

  return {
    excuses,
    isLoading: excusesQuery.isLoading,
    isActive,
    hasActiveExcuse,
    userTimezone,
    newExpiryDate,
    setNewExpiryDate,
    handleDisable,
    handleCreate,
    isDisabling: disableMutation.isPending,
    isCreating: createMutation.isPending,
  };
}
