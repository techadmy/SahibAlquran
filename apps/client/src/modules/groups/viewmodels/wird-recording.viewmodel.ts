import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { GroupMemberDto, RecordLearnerWirdDto } from '@sahibalquran/shared';
import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { queryClient, queryKeys } from '@/lib/query-client';
import { learnerWirdService } from '../services/learner-wird.service';
import { groupService } from '../services/group.service';
import { wirdRecordingFormSchema, type WirdRecordingFormValues } from '../utils/groups.validation';

export function useWirdRecordingViewModel(groupId: string) {
  const overviewQuery = useApiQuery({
    queryKey: queryKeys.learnerWirds.overview(groupId),
    queryFn: () => learnerWirdService.getLearnerGroupOverview(groupId),
  });

  const overview = overviewQuery.data?.data;
  const hasMate = overview?.type === 'overview' && !!overview.myMembership.mateId;
  const awradList = overview?.type === 'overview' ? overview.awrad : [];
  const form = useForm<WirdRecordingFormValues>({
    resolver: zodResolver(wirdRecordingFormSchema),
    defaultValues: { awrad: [], readSource: 'OUTSIDE_GROUP', mateId: null },
  });

  const readSource = form.watch('readSource');

  // Initialize form once overview data arrives (awrad list length + default readSource)
  useEffect(() => {
    if (overview?.type === 'overview') {
      form.reset({
        awrad: new Array(overview.awrad.length).fill(false),
        readSource: overview.myMembership.mateId ? 'DEFAULT_GROUP_MATE' : 'OUTSIDE_GROUP',
        mateId: null,
      });
    }
  }, [overview?.type]); // intentional: reset only when overview type changes

  const membersQuery = useApiQuery<GroupMemberDto[]>({
    queryKey: queryKeys.groups.learners(groupId),
    queryFn: () => groupService.getGroupLearners(groupId),
    enabled: readSource === 'DIFFERENT_GROUP_MATE' && overview?.type === 'overview',
  });

  const mateOptions = useMemo(() => {
    if (overview?.type !== 'overview') return [];
    return (membersQuery.data?.data ?? [])
      .filter((m) => m.studentId !== overview.myMembership.studentId)
      .map((m) => ({ value: m.studentId, label: m.studentName }));
  }, [membersQuery.data, overview]);

  const recordMutation = useApiMutation<RecordLearnerWirdDto, void>({
    mutationFn: (dto) => learnerWirdService.recordLearnerWird(dto),
    onSuccess: async () => {
      toast.success('تم تسجيل الورد بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.learnerWirds.overview(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.wirds.all });
      form.reset({
        awrad: new Array(awradList.length).fill(false),
        readSource: hasMate ? 'DEFAULT_GROUP_MATE' : 'OUTSIDE_GROUP',
        mateId: null,
      });
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ أثناء التسجيل'),
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    if (overview?.type !== 'overview' || overview.recordableDay.status !== 'available') return;

    const base = {
      groupId,
      weekId: overview.week.id,
      dayNumber: overview.recordableDay.dayNumber,
    };

    let payload: RecordLearnerWirdDto;
    if (values.readSource === 'DIFFERENT_GROUP_MATE') {
      payload = { ...base, readSource: 'DIFFERENT_GROUP_MATE', mateId: values.mateId! };
    } else if (values.readSource === 'DEFAULT_GROUP_MATE') {
      payload = { ...base, readSource: 'DEFAULT_GROUP_MATE', mateId: null };
    } else {
      payload = { ...base, readSource: 'OUTSIDE_GROUP', mateId: null };
    }

    await recordMutation.mutateAsync(payload);
  });

  return {
    overview,
    form,
    hasMate,
    awradList,
    readSource,
    mateOptions,
    isLoading: overviewQuery.isLoading,
    isRecording: recordMutation.isPending,
    queryError: overviewQuery.error?.message ?? null,
    handleSubmit,
  };
}
