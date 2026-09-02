import { useState } from 'react';
import { toast } from 'sonner';
import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { queryClient, queryKeys } from '@/lib/query-client';
import { requestService } from '../services/request.service';
import type {
  RequestDto,
  ReviewRequestDto,
  RequestStatus,
  RequestStatsDto,
} from '@sahibalquran/shared';

// For admin/moderator — paginated requests with stats
export function useRequestsViewModel(status?: RequestStatus) {
  const [page, setPage] = useState(1);

  const requestsQuery = useApiQuery<RequestDto[]>({
    queryKey: [...queryKeys.requests.list(status), page],
    queryFn: () => requestService.getRequests(status, page),
  });

  const statsQuery = useApiQuery<RequestStatsDto>({
    queryKey: queryKeys.requests.stats(),
    queryFn: () => requestService.getStats(),
  });

  const reviewMutation = useApiMutation<{ id: string; dto: ReviewRequestDto }, RequestDto>({
    mutationFn: ({ id, dto }) => requestService.reviewRequest(id, dto),
    onSuccess: (_, variables) => {
      const action = variables.dto.action === 'ACCEPT' ? 'قبول' : 'رفض';
      toast.success(`تم ${action} الطلب بنجاح`);
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ'),
  });

  const requests = requestsQuery.data?.data ?? [];
  const meta = requestsQuery.data?.meta;
  const stats = statsQuery.data?.data;

  return {
    requests,
    stats,
    page,
    setPage,
    totalPages: meta?.totalPages ?? 1,
    isLoading: requestsQuery.isLoading,
    isReviewing: reviewMutation.isPending,
    handleAccept: (id: string) => reviewMutation.mutate({ id, dto: { action: 'ACCEPT' } }),
    handleReject: (id: string) => reviewMutation.mutate({ id, dto: { action: 'REJECT' } }),
  };
}

// For learners — own requests list
export function useMyRequestsViewModel() {
  const requestsQuery = useApiQuery<RequestDto[]>({
    queryKey: queryKeys.requests.myList(),
    queryFn: () => requestService.getMyRequests(),
  });

  return {
    requests: requestsQuery.data?.data ?? [],
    isLoading: requestsQuery.isLoading,
  };
}
