import { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { queryKeys } from '@/lib/query-client';
import { groupService } from '../services/group.service';
import type { GroupDto } from '@sahibalquran/shared';

const AdminGroupDetailView = lazy(() => import('./AdminGroupDetailView'));
const LearnerGroupDetailView = lazy(() => import('./LearnerGroupDetailView'));

function ModeratorGroupDetailRoute({ groupId }: { groupId: string }) {
  const { user } = useApp();
  const groupQuery = useApiQuery<GroupDto>({
    queryKey: queryKeys.groups.detail(groupId),
    queryFn: () => groupService.getGroup(groupId),
  });

  if (groupQuery.isLoading) {
    return (
      <div className='flex items-center justify-center py-20 text-muted-foreground gap-2'>
        <Loader2 className='h-5 w-5 animate-spin' />
      </div>
    );
  }

  const group = groupQuery.data?.data;
  const isModerator = group?.moderatorId === user?.id;

  return isModerator ? (
    <AdminGroupDetailView groupId={groupId} />
  ) : (
    <LearnerGroupDetailView groupId={groupId} />
  );
}

export default function GroupDetailView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useApp();

  return (
    <Suspense
      fallback={
        <div className='flex items-center justify-center py-20 text-muted-foreground gap-2'>
          <Loader2 className='h-5 w-5 animate-spin' />
        </div>
      }
    >
      {user?.role === 'STUDENT' ? (
        <LearnerGroupDetailView groupId={id!} />
      ) : user?.role === 'MODERATOR' ? (
        <ModeratorGroupDetailRoute groupId={id!} />
      ) : (
        <AdminGroupDetailView groupId={id!} />
      )}
    </Suspense>
  );
}
