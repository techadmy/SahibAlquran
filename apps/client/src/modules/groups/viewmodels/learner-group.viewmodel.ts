import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { queryKeys } from '@/lib/query-client';
import { groupService } from '../services/group.service';
import { learnerWirdService } from '../services/learner-wird.service';
import type { GroupDto, LearnerGroupOverviewDto } from '@sahibalquran/shared';

export function useLearnerGroupViewModel(groupId: string) {
  const groupQuery = useApiQuery<GroupDto>({
    queryKey: queryKeys.groups.detail(groupId),
    queryFn: () => groupService.getGroup(groupId),
  });

  const overviewQuery = useApiQuery<LearnerGroupOverviewDto>({
    queryKey: queryKeys.learnerWirds.overview(groupId),
    queryFn: () => learnerWirdService.getLearnerGroupOverview(groupId),
  });

  const group = groupQuery.data?.data;
  const overview = overviewQuery.data?.data;

  return {
    group,
    overview,
    isLoading: groupQuery.isLoading || overviewQuery.isLoading,
    queryError: groupQuery.error?.message ?? overviewQuery.error?.message ?? null,
  };
}
