import { FileText, Loader2, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldLabel } from '@/components/ui/field';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Typography } from '@/components/ui/typography';
import { GroupSelectField } from '../molecules/GroupSelectField';
import { useExcuseRequestViewModel } from '../../viewmodels/create-excuse-request.viewmodel';
import type { ISODateOnlyString } from '@sahibalquran/shared';

type ExcuseRequestModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultGroupId?: string;
  hideGroupSelect?: boolean;
};

export function ExcuseRequestModal({
  open,
  onOpenChange,
  defaultGroupId,
  hideGroupSelect = false,
}: ExcuseRequestModalProps) {
  const vm = useExcuseRequestViewModel(open, defaultGroupId);

  const handleSubmit = () => {
    vm.handleSubmit();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg' dir='rtl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-right'>
            <FileText className='h-5 w-5 text-primary' />
            طلب عذر
          </DialogTitle>
        </DialogHeader>

        <div className='flex flex-col gap-4'>
          {vm.isLoading ? (
            <div className='flex justify-center py-6'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : vm.groups.length === 0 ? (
            <Typography size='sm' className='text-center py-6 text-muted-foreground'>
              لا توجد مجموعات متاحة
            </Typography>
          ) : (
            <>
              {!hideGroupSelect && (
                <GroupSelectField
                  value={vm.selectedGroupId}
                  onChange={vm.setSelectedGroupId}
                  groups={vm.groups}
                  label='اختر المجموعة'
                  placeholder='اختر المجموعة'
                />
              )}

              <Field>
                <FieldLabel>تاريخ انتهاء العذر</FieldLabel>
                <DateTimePicker
                  mode='dateOnly'
                  date={vm.expiryDate}
                  onDateChange={(d) => vm.setExpiryDate(d as ISODateOnlyString)}
                  disablePastDates
                />
              </Field>

              <Field>
                <FieldLabel>
                  سبب العذر <span className='text-danger'>*</span>
                </FieldLabel>
                <Textarea
                  value={vm.reason}
                  onChange={(e) => vm.setReason(e.target.value)}
                  placeholder='اكتب سبب العذر...'
                  rows={3}
                  maxLength={500}
                />
                <Typography size='xs' className='text-muted-foreground text-left'>
                  {vm.reason.length} / 500
                </Typography>
              </Field>

              <div className='flex gap-2 justify-end pt-2'>
                <Button
                  variant='outline'
                  color='muted'
                  onClick={() => onOpenChange(false)}
                  disabled={vm.isSubmitting}
                >
                  إلغاء
                </Button>
                <Button
                  color='success'
                  onClick={handleSubmit}
                  disabled={
                    !vm.selectedGroupId || vm.isSubmitting || !vm.expiryDate || !vm.reason.trim()
                  }
                >
                  {vm.isSubmitting ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Send className='h-4 w-4' />
                  )}
                  إرسال الطلب
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
