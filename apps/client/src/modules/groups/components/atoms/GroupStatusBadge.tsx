import { Badge } from '@/components/ui/badge';
import type { GroupStatus } from '@sahibalquran/shared';

type GroupStatusBadgeProps = { status: GroupStatus };

export function GroupStatusBadge({ status }: GroupStatusBadgeProps) {
  return (
    <Badge variant='soft' color={status === 'ACTIVE' ? 'success' : 'muted'}>
      {status === 'ACTIVE' ? 'نشط' : 'غير نشط'}
    </Badge>
  );
}
