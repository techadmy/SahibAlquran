import { BookOpen, Users, Pencil, CalendarDays, GraduationCap, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { TimezoneDisplay } from '@/components/ui/timezone-display';
import { GroupStatusBadge } from '../atoms/GroupStatusBadge';
import type { GroupDto } from '@sahibalquran/shared';

type GroupInfoCardProps = {
  group: GroupDto;
  isEditable: boolean;
  onEditGroup: () => void;
  onOpenSchedule: () => void;
  onManageLearners?: () => void;
  onDeleteGroup?: () => void;
};

export function GroupInfoCard({
  group,
  isEditable,
  onEditGroup,
  onOpenSchedule,
  onManageLearners,
  onDeleteGroup,
}: GroupInfoCardProps) {
  const awradLabel = group.awrad.length > 0 ? group.awrad.join('، ') : 'لا يوجد';

  return (
    <div className='rounded-2xl border border-s-4 border-s-primary bg-card p-6 shadow-sm'>
      {/* Top row: name+status on start, edit button on end */}
      <div className='flex items-start justify-between gap-4'>
        <div className='flex flex-col gap-1.5 min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <Typography as='h2' size='xl' weight='bold'>
              {group.name}
            </Typography>
            <GroupStatusBadge status={group.status} />
          </div>
          {group.moderatorName && (
            <Typography size='sm' className='text-muted-foreground'>
              {group.moderatorName}
            </Typography>
          )}
        </div>

        {isEditable && (
          <div className='flex items-center gap-2 shrink-0'>
            <Button
              variant='outline'
              color='warning'
              size='sm'
              className='gap-1.5'
              onClick={onEditGroup}
            >
              <Pencil className='h-3.5 w-3.5' />
              تعديل البيانات
            </Button>
            {onDeleteGroup && (
              <Button
                variant='ghost'
                color='danger'
                size='icon'
                className='h-8 w-8'
                onClick={onDeleteGroup}
                aria-label='حذف المجموعة'
              >
                <Trash2 className='h-3.5 w-3.5' />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Description section */}
      {group.description && (
        <div className='mt-3 rounded-lg bg-muted/50 px-4 py-3 border-s-2 border-primary/40'>
          <Typography as='p' size='sm' className='text-muted-foreground italic leading-relaxed'>
            {group.description}
          </Typography>
        </div>
      )}

      {/* Metadata row: timezone + stat badges */}
      <div className='mt-3 flex flex-wrap items-center gap-x-4 gap-y-2'>
        <TimezoneDisplay timezone={group.timezone} />

        <Badge variant='soft' color='emerald' className='gap-1.5'>
          <Users className='h-3.5 w-3.5' />
          {`${group.memberCount} طالب`}
        </Badge>

        <Badge variant='soft' color='purple' className='gap-1.5'>
          <BookOpen className='h-3.5 w-3.5' />
          {awradLabel}
        </Badge>
      </div>

      {/* Action buttons row */}
      {isEditable && (
        <div className='mt-4 flex items-center gap-2 flex-wrap'>
          <Button
            variant='soft'
            color='primary'
            size='sm'
            className='gap-1.5'
            onClick={onOpenSchedule}
          >
            <CalendarDays className='h-3.5 w-3.5' />
            الجدول الأسبوعي
          </Button>
          {onManageLearners && (
            <Button
              variant='soft'
              color='success'
              size='sm'
              className='gap-1.5'
              onClick={onManageLearners}
            >
              <GraduationCap className='h-3.5 w-3.5' />
              إدارة الطلاب
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
