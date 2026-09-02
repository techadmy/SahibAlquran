import {
  LearnerDto,
  UpdateLearnerDto,
  LEARNER_DETAIL_FIELDS,
  PLATFORM_OPTIONS,
  RECITATION_OPTIONS,
  minutesToTimeString,
  convertMinutesToTimezone,
} from '@sahibalquran/shared';
import type { TimeMinutes } from '@sahibalquran/shared';
import { UserCircle2 } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TimezoneDisplay } from '@/components/ui/timezone-display';
import { LearnerEditDeleteActions } from './learner-edit-delete-actions';

type StudentTableItemProps = {
  learner: LearnerDto;
  showActions?: boolean;
  onClick: (learner: LearnerDto) => void;
  onEditSubmit: (data: UpdateLearnerDto) => Promise<void>;
  onDeleteConfirm: () => Promise<void>;
  isUpdating?: boolean;
  isDeleting?: boolean;
};

export function StudentTableItem({
  learner,
  showActions = true,
  onClick,
  onEditSubmit,
  onDeleteConfirm,
  isUpdating = false,
}: StudentTableItemProps) {
  const learnerInitial = learner.name.trim().charAt(0) || '؟';

  return (
    <TableRow
      className='cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-900/40'
      onClick={() => onClick(learner)}
    >
      <TableCell className='px-4 py-3'>
        <div className='flex items-center gap-2.5'>
          <div className='size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold'>
            {learnerInitial}
          </div>
          <div className='flex flex-col'>
            <div className='text-sm text-gray-900 dark:text-gray-100 font-medium'>
              {learner.name}
            </div>
            <div className='text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1'>
              <UserCircle2 className='w-3.5 h-3.5' />
              طالب
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className='px-4 py-3'>
        <TimezoneDisplay timezone={learner.timezone} />
      </TableCell>

      <TableCell className='px-4 py-3'>
        <div className='text-sm font-medium text-gray-900 dark:text-gray-100'>
          {learner.groups
            ?.filter((g) => !g.removedAt)
            .map((g) => g.name)
            .join(' / ') || '-'}
        </div>
      </TableCell>
      {LEARNER_DETAIL_FIELDS.map(({ key }) => {
        const raw = learner.contact[key as keyof typeof learner.contact];

        if (key === 'schedule' && typeof raw === 'number') {
          const localTime = minutesToTimeString(raw as TimeMinutes);
          const saudiMinutes = convertMinutesToTimezone(
            raw as TimeMinutes,
            learner.timezone,
            'Asia/Riyadh'
          );
          const saudiTime = minutesToTimeString(saudiMinutes);
          return (
            <TableCell key={key} className='px-4 py-3'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='text-sm text-gray-700 dark:text-gray-300 truncate max-w-28 cursor-default'>
                      {saudiTime}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side='top'>
                    <span className='text-xs'>🕐 بتوقيت المستخدم: {localTime}</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableCell>
          );
        }

        const display = raw;
        // Resolve enum label for select fields
        const label =
          key === 'platform'
            ? (PLATFORM_OPTIONS.find((o) => o.value === display)?.label ?? display)
            : key === 'recitation'
              ? (RECITATION_OPTIONS.find((o) => o.value === display)?.label ?? display)
              : display;
        return (
          <TableCell key={key} className='px-4 py-3'>
            <div className='text-sm text-gray-700 dark:text-gray-300 truncate max-w-28'>
              {label ?? <span className='text-muted-foreground text-xs'>-</span>}
            </div>
          </TableCell>
        );
      })}

      <TableCell className='px-4 py-3 max-w-72'>
        <div className='truncate text-xs text-gray-600 dark:text-gray-400'>
          {learner.contact.notes || 'لا توجد ملاحظات'}
        </div>
      </TableCell>
      <TableCell className='px-4 py-3 text-right'>
        {showActions ? (
          <div className='flex items-center justify-end gap-2'>
            <LearnerEditDeleteActions
              learner={learner}
              deleteDescription={`هل تريد حذف "${learner.name}"؟`}
              onEditSubmit={onEditSubmit}
              onDeleteConfirm={onDeleteConfirm}
              isUpdating={isUpdating}
            />
          </div>
        ) : (
          '-'
        )}
      </TableCell>
    </TableRow>
  );
}
