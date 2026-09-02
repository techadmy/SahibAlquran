import { useMemo } from 'react';
import { toast } from 'sonner';
import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { queryClient, queryKeys } from '@/lib/query-client';
import { wirdService } from '../services/wird.service';
import type { UpdateStudentWirdsDto } from '@sahibalquran/shared';

export function useEditAttendanceViewModel(
  studentId: string,
  weekId: string,
  groupId: string,
  open: boolean
) {
  const wirdsQuery = useApiQuery({
    queryKey: queryKeys.wirds.studentWeek(studentId, weekId),
    queryFn: () => wirdService.getStudentWeekWirds(studentId, weekId),
    enabled: open && !!studentId && !!weekId,
  });

  // Stabilized reference so useEffect deps in the component don't fire on every render
  const days = useMemo(() => wirdsQuery.data?.data?.days ?? [], [wirdsQuery.data]);

  const updateMutation = useApiMutation<UpdateStudentWirdsDto, void>({
    mutationFn: (dto) => wirdService.updateStudentWeekWirds(studentId, weekId, dto),
    onSuccess: async () => {
      toast.success('تم تحديث الحضور');
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wirds.tracking(groupId, weekId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wirds.studentWeek(studentId, weekId),
      });
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ أثناء التحديث'),
  });

  return {
    days,
    isLoading: wirdsQuery.isLoading,
    isSaving: updateMutation.isPending,
    handleSave: (dto: UpdateStudentWirdsDto) => updateMutation.mutate(dto),
  };
}
