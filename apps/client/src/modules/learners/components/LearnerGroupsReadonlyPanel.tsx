import { LearnerGroupSummaryDto } from '@sahibalquran/shared';
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';

type LearnerGroupsReadonlyPanelProps = {
  groups?: LearnerGroupSummaryDto[];
  groupCount?: number;
};

export function LearnerGroupsReadonlyPanel({
  groups,
  groupCount,
}: LearnerGroupsReadonlyPanelProps) {
  const resolvedGroups = groups ?? [];
  const activeGroups = resolvedGroups.filter((group) => !group.removedAt);
  const removedGroups = resolvedGroups.filter((group) => !!group.removedAt);
  const resolvedGroupCount = groupCount ?? activeGroups.length;

  return (
    <div className='rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3'>
      <div className='flex items-center justify-between gap-2'>
        <Typography as='div' size='sm' weight='semibold'>
          حلقات الطالب
        </Typography>
        <Badge variant='soft' color='primary'>
          {resolvedGroupCount}
        </Badge>
      </div>

      {activeGroups.length === 0 ? (
        <Typography as='div' size='xs' className='text-muted-foreground'>
          غير منضم لأي مجموعة حالياً
        </Typography>
      ) : (
        <div className='flex flex-wrap gap-2'>
          {activeGroups.map((group) => (
            <Badge key={group.id} variant='outline' color='muted'>
              {group.name}
            </Badge>
          ))}
        </div>
      )}

      {removedGroups.length > 0 ? (
        <div className='space-y-2'>
          <Typography as='div' size='xs' className='text-muted-foreground'>
            المجموعات السابقة
          </Typography>
          <div className='flex flex-wrap gap-2'>
            {removedGroups.map((group) => (
              <Badge key={group.id} variant='soft' color='warning'>
                {group.name}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
