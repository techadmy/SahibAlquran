import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { attendanceFormSchema, type AttendanceFormValues } from '../../utils/groups.validation';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Typography } from '@/components/ui/typography';
import { useEditAttendanceViewModel } from '../../viewmodels/edit-attendance.viewmodel';
import type { StudentDayWird, UpdateStudentWirdsDto } from '@sahibalquran/shared';

const DAY_LABELS: Record<number, string> = {
  6: 'السبت',
  0: 'الأحد',
  1: 'الاثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
};

/** Arabic display order: Sat(6) → Sun(0) → Mon(1) → Tue(2) → Wed(3) → Thu(4) */
const DISPLAY_DAY_ORDER = [6, 0, 1, 2, 3, 4] as const;

// ─── Inner form ────────────────────────────────────────────────────────────────
// Rendered only when data is available; remounts via `key` — form always gets
// fresh defaultValues without needing useEffect.

type AttendanceFormContentProps = {
  days: StudentDayWird[];
  isSaving: boolean;
  onSave: (dto: UpdateStudentWirdsDto) => void;
  onCancel: () => void;
};

function AttendanceFormContent({ days, isSaving, onSave, onCancel }: AttendanceFormContentProps) {
  const defaultValues = Object.fromEntries(
    days.map((d) => [`day_${d.dayNumber}`, d.recordedStatus === 'ATTENDED'])
  ) as AttendanceFormValues;

  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues,
  });
  const dayMap = new Map(days.map((d) => [d.dayNumber, d]));

  function onSubmit(values: AttendanceFormValues) {
    const dirtyKeys = Object.keys(form.formState.dirtyFields) as `day_${number}`[];
    const updates = dirtyKeys.map((key) => ({
      dayNumber: parseInt(key.slice(4)), // 'day_6' → 6
      status: values[key] ? ('ATTENDED' as const) : ('MISSED' as const),
    }));
    if (updates.length === 0) return;
    onSave({ updates });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className='flex flex-col gap-3 py-2'>
        {DISPLAY_DAY_ORDER.map((dayNum) => {
          const day = dayMap.get(dayNum);
          const isBlocked = day?.isBlocked ?? false;

          return (
            <div
              key={dayNum}
              className='flex items-center justify-between rounded-lg border bg-card px-3 py-2'
            >
              <Typography
                size='sm'
                className={isBlocked ? 'text-muted-foreground opacity-50' : undefined}
              >
                {DAY_LABELS[dayNum]}
              </Typography>
              <Controller
                name={`day_${dayNum}`}
                control={form.control}
                render={({ field }) => (
                  <Checkbox
                    checked={!!field.value}
                    disabled={isBlocked}
                    onCheckedChange={(checked) => field.onChange(!!checked)}
                  />
                )}
              />
            </div>
          );
        })}
      </div>

      <DialogFooter className='gap-2 pt-4'>
        <Button
          type='button'
          variant='outline'
          color='muted'
          size='sm'
          onClick={onCancel}
          disabled={isSaving}
        >
          إلغاء
        </Button>
        <Button
          type='submit'
          color='success'
          size='sm'
          disabled={!form.formState.isDirty || isSaving}
        >
          {isSaving ? <Loader2 className='h-4 w-4 animate-spin' /> : 'حفظ'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Modal shell ───────────────────────────────────────────────────────────────

type EditAttendanceModalProps = {
  studentId: string;
  studentName: string;
  weekId: string;
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditAttendanceModal({
  studentId,
  studentName,
  weekId,
  groupId,
  open,
  onOpenChange,
}: EditAttendanceModalProps) {
  const vm = useEditAttendanceViewModel(studentId, weekId, groupId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-sm' dir='rtl'>
        <DialogHeader>
          <DialogTitle className='text-right'>تعديل حضور {studentName}</DialogTitle>
        </DialogHeader>

        {vm.isLoading ? (
          <div className='flex justify-center py-8'>
            <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
          </div>
        ) : (
          // key ensures the form remounts with fresh defaultValues each time data changes
          <AttendanceFormContent
            key={`${studentId}-${weekId}`}
            days={vm.days}
            isSaving={vm.isSaving}
            onSave={(dto) => {
              vm.handleSave(dto);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
