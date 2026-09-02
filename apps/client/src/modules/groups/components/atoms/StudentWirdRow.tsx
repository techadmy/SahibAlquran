import { useState } from 'react';
import { ClipboardEdit, Pencil, Trash2 } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { WirdStatusCell } from './WirdStatusCell';
import { ExcuseModal } from '../organisms/ExcuseModal';
import { EditAttendanceModal } from '../organisms/EditAttendanceModal';
import { ReactivateLearnerButton } from './ReactivateLearnerButton';
import type { GroupWirdTrackingRowDto, TimeZoneType } from '@sahibalquran/shared';

type StudentWirdRowProps = {
  row: GroupWirdTrackingRowDto;
  weekId: string;
  groupId: string;
  userTimezone: TimeZoneType;
  canManage: boolean;
  isUpcomingWeek?: boolean;
  onEditMate?: (row: GroupWirdTrackingRowDto) => void;
  onEditLearner?: (studentId: string) => void;
  onDeleteLearner?: (memberId: string) => Promise<void>;
};

export function StudentWirdRow({
  row,
  weekId,
  groupId,
  userTimezone,
  canManage,
  isUpcomingWeek,
  onEditMate,
  onEditLearner,
  onDeleteLearner,
}: StudentWirdRowProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleDelete = async () => {
    if (onDeleteLearner) {
      await onDeleteLearner(row.memberId);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <>
      <TableRow>
        {/* Name */}
        <TableCell className='px-4 py-3 font-medium text-right sticky right-0 z-10  bg-card '>
          <div className='flex items-center gap-2'>
            <span>{row.studentName}</span>
            {row.studentStatus === 'INACTIVE' &&
              (canManage ? (
                <ReactivateLearnerButton
                  studentId={row.studentId}
                  studentName={row.studentName}
                  groupId={groupId}
                />
              ) : (
                <Badge variant='soft' color='muted' className='text-xs'>
                  متوقف
                </Badge>
              ))}
          </div>
        </TableCell>

        {/* Mate column (only for admins) */}
        {canManage && (
          <TableCell className='px-3 py-3 text-muted-foreground'>
            <div className='flex items-center gap-1'>
              <span>{row.mateName ?? '—'}</span>
              {onEditMate && (
                <Button
                  variant='ghost'
                  size='icon'
                  color='warning'
                  className='h-6 w-6'
                  onClick={() => onEditMate(row)}
                >
                  <Pencil className='h-3 w-3' />
                </Button>
              )}
            </div>
          </TableCell>
        )}

        {/* Manual edit column (only for admins, disabled for upcoming weeks) */}
        {canManage && (
          <TableCell className='px-3 py-3 text-center'>
            {!isUpcomingWeek ? (
              <Button
                variant='ghost'
                size='icon'
                color='warning'
                className='h-7 w-7'
                onClick={() => setEditOpen(true)}
                title='تعديل الحضور يدوياً'
              >
                <ClipboardEdit className='h-3.5 w-3.5' />
              </Button>
            ) : (
              <span className='text-xs text-muted-foreground'>—</span>
            )}
          </TableCell>
        )}

        {/* 6 day cells */}
        {row.days.map((day) => (
          <TableCell key={day.dayNumber} className='px-3 py-3 text-center'>
            <div className='flex justify-center'>
              <WirdStatusCell
                status={day.wirdStatus}
                readSource={day.readSource}
                readOnMateName={day.readOnMateName}
              />
            </div>
          </TableCell>
        ))}

        {/* الانذارات الاسبوعية */}
        <TableCell className='px-3 py-3 text-center'>
          {row.weekAlertCount > 0 ? (
            <Badge variant='soft' color='danger' className='text-xs'>
              {row.weekAlertCount}
            </Badge>
          ) : (
            <span className='text-xs text-muted-foreground'>—</span>
          )}
        </TableCell>

        {/* اجمالي الانذارات */}
        <TableCell className='px-3 py-3 text-center'>
          {row.totalAlertCount > 0 ? (
            <Badge variant='soft' color='warning' className='text-xs'>
              {row.totalAlertCount}
            </Badge>
          ) : (
            <span className='text-xs text-muted-foreground'>—</span>
          )}
        </TableCell>

        {/* العذر */}
        <TableCell className='px-3 py-3 text-center'>
          <ExcuseModal
            studentId={row.studentId}
            studentName={row.studentName}
            groupId={groupId}
            weekId={weekId}
            userTimezone={userTimezone}
            activeExcuseExpiresAt={row.activeExcuseExpiresAt}
            showOnly={!canManage}
          />
        </TableCell>

        {/* Actions column (only for admins) */}
        {canManage && (
          <TableCell className='px-3 py-3'>
            <div className='flex items-center gap-1 justify-end'>
              {onEditLearner && (
                <Button
                  variant='ghost'
                  size='icon'
                  color='warning'
                  className='h-7 w-7'
                  onClick={() => onEditLearner(row.studentId)}
                >
                  <Pencil className='h-3.5 w-3.5' />
                </Button>
              )}
              {onDeleteLearner && (
                <Button
                  variant='ghost'
                  size='icon'
                  color='danger'
                  className='h-7 w-7'
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className='h-3.5 w-3.5' />
                </Button>
              )}
            </div>
          </TableCell>
        )}
      </TableRow>

      {canManage && (
        <>
          <EditAttendanceModal
            studentId={row.studentId}
            studentName={row.studentName}
            weekId={weekId}
            groupId={groupId}
            open={editOpen}
            onOpenChange={setEditOpen}
          />

          <ConfirmDialog
            open={deleteConfirmOpen}
            onOpenChange={setDeleteConfirmOpen}
            onConfirm={handleDelete}
            title='تأكيد الإزالة'
            description={`هل أنت متأكد من إزالة "${row.studentName}" من المجموعة؟`}
            intent='destructive'
          />
        </>
      )}
    </>
  );
}
