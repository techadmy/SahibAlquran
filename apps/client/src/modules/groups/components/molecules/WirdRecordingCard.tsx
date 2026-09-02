import { Controller } from 'react-hook-form';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Typography } from '@/components/ui/typography';
import { useWirdRecordingViewModel } from '../../viewmodels/wird-recording.viewmodel';
import { AllRecordedMessage } from './AllRecordedMessage';
import { BlockedByPreviousDayMessage } from './BlockedByPreviousDayMessage';

const DAY_LABELS: Record<number, string> = {
  6: 'السبت',
  0: 'الأحد',
  1: 'الاثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
};

type Props = { groupId: string };

export function WirdRecordingCard({ groupId }: Props) {
  const vm = useWirdRecordingViewModel(groupId);

  if (vm.isLoading) {
    return (
      <Card>
        <CardContent className='pt-6 flex items-center gap-2 text-muted-foreground'>
          <Loader2 className='h-4 w-4 animate-spin' />
          <Typography size='sm'>جاري تحميل حالة التسجيل...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (vm.queryError) {
    return (
      <Alert alertType='ERROR'>
        <AlertDescription>{vm.queryError}</AlertDescription>
      </Alert>
    );
  }

  if (!vm.overview || vm.overview.type === 'nothing') return null;

  if (
    vm.overview.groupStatus === 'INACTIVE' ||
    vm.overview.myMembership.status === 'INACTIVE' ||
    !!vm.overview.myMembership.removedAt
  ) {
    return null;
  }

  const { recordableDay, myRow } = vm.overview;

  if (recordableDay.status === 'none') {
    if (recordableDay.reason === 'all_recorded') return <AllRecordedMessage />;
    return <BlockedByPreviousDayMessage blockedBy='الوقت الحالي' />;
  }

  const daysInWeek = myRow.days.map((day) => ({
    dayNumber: day.dayNumber,
    dayRecorded: day.wirdStatus !== 'MISSED',
  }));

  const awradError =
    vm.form.formState.errors.awrad?.root?.message ?? vm.form.formState.errors.awrad?.message;

  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex items-center gap-2 flex-wrap'>
          <CardTitle className='text-base'>تسجيل الورد</CardTitle>
          <Typography size='sm' className='text-muted-foreground'>
            ليوم {DAY_LABELS[recordableDay.dayNumber]}
          </Typography>
          {recordableDay.isLate && (
            <div className='flex items-center gap-1 text-xs text-warning bg-warning/10 px-2 py-1 rounded-full'>
              <AlertTriangle className='h-3 w-3' />
              تأخير في التسجيل
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className='space-y-5'>
        {/* Individual awrad checkboxes */}
        <div className='space-y-2'>
          <Label className='text-sm font-medium'>الأوراد </Label>
          <div className='space-y-2'>
            {vm.awradList.map((wirdName, index) => (
              <Controller
                key={wirdName}
                control={vm.form.control}
                name={`awrad.${index}` as `awrad.${number}`}
                render={({ field }) => (
                  <div className='flex items-center gap-2'>
                    <Checkbox
                      id={`awrad-${index}`}
                      checked={!!field.value}
                      onCheckedChange={(checked) => field.onChange(!!checked)}
                    />
                    <Label
                      htmlFor={`awrad-${index}`}
                      className='cursor-pointer text-sm font-normal'
                    >
                      {wirdName}
                    </Label>
                  </div>
                )}
              />
            ))}
          </div>
          {awradError && (
            <Typography size='xs' className='text-danger'>
              {awradError}
            </Typography>
          )}
        </div>

        {/* Show unrecorded days warning */}
        {daysInWeek.some((d) => !d.dayRecorded) && (
          <div className='bg-warning/5 border border-warning/30 rounded-lg p-3 space-y-2'>
            <Typography size='xs' weight='medium' className='text-warning'>
              الأيام التي لم تسجل فيها:
            </Typography>
            <div className='flex flex-wrap gap-2'>
              {daysInWeek
                .filter((d) => !d.dayRecorded)
                .map((d) => (
                  <span
                    key={d.dayNumber}
                    className='text-xs bg-warning/10 text-warning px-2 py-1 rounded'
                  >
                    {DAY_LABELS[d.dayNumber]}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Read source selector */}
        <div className='space-y-2'>
          <Label className='text-sm font-medium'>أين سمعت الورد؟</Label>
          <Controller
            control={vm.form.control}
            name='readSource'
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vm.hasMate && <SelectItem value='DEFAULT_GROUP_MATE'>رفيقي الدائم</SelectItem>}
                  <SelectItem value='DIFFERENT_GROUP_MATE'>متطوع من داخل المجموعة</SelectItem>
                  <SelectItem value='OUTSIDE_GROUP'>متطوع من منصة صاحب القران</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Mate selector — only when reading on a different group mate */}
        {vm.readSource === 'DIFFERENT_GROUP_MATE' && (
          <div className='space-y-2'>
            <Label className='text-xs text-muted-foreground'>اختر الرفيق</Label>
            <Controller
              control={vm.form.control}
              name='mateId'
              render={({ field, fieldState }) => (
                <>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='اختر الرفيق' />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.mateOptions.map((mate) => (
                        <SelectItem key={mate.value} value={mate.value}>
                          {mate.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <Typography size='xs' className='text-danger'>
                      {fieldState.error.message}
                    </Typography>
                  )}
                </>
              )}
            />
          </div>
        )}

        <Button
          className='w-full'
          color='success'
          disabled={vm.isRecording}
          onClick={vm.handleSubmit}
        >
          {vm.isRecording ? (
            <>
              <Loader2 className='h-4 w-4 animate-spin' />
              جاري التسجيل...
            </>
          ) : (
            'تسجيل الورد'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
