import { Loader2, Users } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Typography } from '@/components/ui/typography';
import { WirdStatusCell } from '../atoms/WirdStatusCell';
import { StudentWirdRow } from '../atoms/StudentWirdRow';
import type { GroupWirdTrackingRowDto, WirdStatus, TimeZoneType } from '@sahibalquran/shared';

/** Arabic display order: Sat(6) → Sun(0) → Mon(1) → Tue(2) → Wed(3) → Thu(4) */
const DAY_LABELS: Record<number, string> = {
  6: 'السبت',
  0: 'الأحد',
  1: 'الاثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
};

const DISPLAY_DAY_ORDER = [6, 0, 1, 2, 3, 4] as const;

const LEGEND_ITEMS: { status: WirdStatus; label: string }[] = [
  { status: 'ATTENDED', label: 'حضر' },
  { status: 'MISSED', label: 'غاب' },
  { status: 'LATE', label: 'متأخر' },
  { status: 'EMPTY', label: 'لم يسجل بعد' },
  { status: 'FUTURE', label: 'يوم قادم' },
];

type WirdTrackingTableProps = {
  rows: GroupWirdTrackingRowDto[];
  isLoading: boolean;
  weekId: string;
  groupId: string;
  userTimezone: TimeZoneType;
  canManage: boolean;
  isUpcomingWeek?: boolean;
  staffUserIds?: Set<string>;
  onEditMate?: (row: GroupWirdTrackingRowDto) => void;
  onEditLearner?: (studentId: string) => void;
  onDeleteLearner?: (memberId: string) => Promise<void>;
};

export function WirdTrackingTable({
  rows,
  isLoading,
  weekId,
  groupId,
  userTimezone,
  canManage,
  isUpcomingWeek,
  staffUserIds,
  onEditMate,
  onEditLearner,
  onDeleteLearner,
}: WirdTrackingTableProps) {
  return (
    <div className='space-y-3'>
      {/* Legend */}
      <div className='flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
        {LEGEND_ITEMS.map(({ status, label }) => (
          <div key={status} className='flex items-center gap-1.5'>
            <WirdStatusCell status={status} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <Table className='rounded-lg border bg-card shadow-sm'>
        <TableHeader className='bg-muted/40'>
          <TableRow>
            <TableHead className='px-4 py-3 text-right text-xs sticky right-0 z-10 bg-muted/40'>
              اسم الطالب
            </TableHead>
            {canManage && <TableHead className='px-3 py-3 text-right text-xs'>الرفيق</TableHead>}
            {canManage && (
              <TableHead className='px-3 py-3 text-center text-xs'>تعديل يدوي</TableHead>
            )}
            {DISPLAY_DAY_ORDER.map((dayNum) => (
              <TableHead key={dayNum} className='px-3 py-3 text-center text-xs'>
                {DAY_LABELS[dayNum]}
              </TableHead>
            ))}
            <TableHead className='px-3 py-3 text-center text-xs'>الانذارات الاسبوعية</TableHead>
            <TableHead className='px-3 py-3 text-center text-xs'>اجمالي الانذارات</TableHead>
            <TableHead className='px-3 py-3 text-center text-xs'>العذر</TableHead>
            {canManage && <TableHead className='px-3 py-3 text-left text-xs'>الإجراءات</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={canManage ? 13 : 10}>
                <div className='flex items-center justify-center py-8 gap-2 text-muted-foreground'>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  جاري التحميل...
                </div>
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={canManage ? 13 : 10}>
                <div className='flex flex-col items-center justify-center py-10 text-muted-foreground gap-2'>
                  <Users className='w-6 h-6 opacity-70' />
                  <Typography className='text-sm text-muted-foreground'>
                    لا يوجد بيانات لهذا الأسبوع
                  </Typography>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <StudentWirdRow
                key={row.memberId}
                row={row}
                weekId={weekId}
                groupId={groupId}
                userTimezone={userTimezone}
                canManage={canManage}
                isUpcomingWeek={isUpcomingWeek}
                onEditMate={onEditMate}
                onEditLearner={staffUserIds?.has(row.studentId) ? undefined : onEditLearner}
                onDeleteLearner={onDeleteLearner}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
