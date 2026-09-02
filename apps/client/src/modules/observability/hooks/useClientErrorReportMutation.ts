import type { ClientErrorLogDto, ClientErrorLogResponseDto } from '@sahibalquran/shared';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { observabilityService } from '../services/observability.service';

export const useClientErrorReportMutation = () => {
  return useApiMutation<ClientErrorLogDto, ClientErrorLogResponseDto>({
    mutationFn: observabilityService.reportClientError,
  });
};
