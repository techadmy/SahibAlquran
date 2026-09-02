import { useState } from 'react';
import {
  CalendarCheck,
  Loader2,
  BanIcon,
  PlusIcon,
  ShieldCheck,
  AlertCircle,
  Pencil,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Typography } from '@/components/ui/typography';
import { formatDate } from '@sahibalquran/shared';
import type { ISODateString, ISODateOnlyString, TimeZoneType } from '@sahibalquran/shared';
import { useExcuseModalViewModel } from '../../viewmodels/excuse-modal.viewmodel';

type ExcuseModalProps = {
  studentId: string;
  studentName: string;
  groupId: string;
  weekId?: string;
  userTimezone: TimeZoneType;
  activeExcuseExpiresAt?: ISODateString | null;
  /** When true, renders the cell display only — no dialog trigger */
  showOnly?: boolean;
};

export function ExcuseModal({
  studentId,
  studentName,
  groupId,
  weekId,
  userTimezone,
  activeExcuseExpiresAt,
  showOnly = false,
}: ExcuseModalProps) {
  const [open, setOpen] = useState(false);
  const [disableTargetId, setDisableTargetId] = useState<string | null>(null);
  const vm = useExcuseModalViewModel(studentId, groupId, open, weekId);

  const formatExpiry = (iso: ISODateString) =>
    formatDate({ date: iso, token: 'dd/MM/yyyy', timezone: userTimezone });

  return (
    <>
      {/* Inline trigger */}
      {activeExcuseExpiresAt ? (
        <div className='flex items-center gap-1.5'>
          <Badge variant='soft' color='warning' className='gap-1 text-xs'>
            <AlertCircle className='h-3 w-3' />
            حتى{' '}
            {formatDate({
              date: activeExcuseExpiresAt,
              token: 'dd/MM/yyyy',
              timezone: userTimezone,
            })}
          </Badge>
          {!showOnly && (
            <Button
              variant='ghost'
              size='icon'
              color='warning'
              className='h-6 w-6'
              onClick={() => setOpen(true)}
            >
              <Pencil className='h-3 w-3' />
            </Button>
          )}
        </div>
      ) : (
        !showOnly && (
          <Button
            variant='ghost'
            size='sm'
            color='muted'
            className='h-7 text-xs gap-1 text-muted-foreground'
            onClick={() => setOpen(true)}
          >
            <AlertCircle className='h-3 w-3' />
            إضافة
          </Button>
        )
      )}

      {/* Dialog */}
      {!showOnly && (
        <>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className='max-w-md' dir='rtl'>
              <DialogHeader>
                <DialogTitle className='flex items-center gap-2 text-right'>
                  <ShieldCheck className='h-5 w-5 text-warning' />
                  أعذار {studentName}
                </DialogTitle>
              </DialogHeader>

              {/* Excuse list */}
              <div className='flex flex-col gap-2 max-h-64 overflow-y-auto'>
                {vm.isLoading ? (
                  <div className='flex justify-center py-6'>
                    <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                  </div>
                ) : vm.excuses.length === 0 ? (
                  <Typography size='sm' className='text-center py-6 text-muted-foreground'>
                    لا توجد أعذار مسجّلة
                  </Typography>
                ) : (
                  vm.excuses.map((excuse) => {
                    const active = vm.isActive(excuse);
                    return (
                      <div
                        key={excuse.id}
                        className='flex items-center justify-between rounded-lg border bg-card px-3 py-2 gap-3'
                      >
                        <div className='flex items-center gap-2 flex-1 min-w-0'>
                          <CalendarCheck className='h-4 w-4 shrink-0 text-muted-foreground' />
                          <span className='text-sm font-medium'>
                            ينتهي: {formatExpiry(excuse.expiresAt)}
                          </span>
                        </div>
                        <div className='flex items-center gap-2 shrink-0'>
                          {active ? (
                            <Badge variant='soft' color='success'>
                              نشط
                            </Badge>
                          ) : (
                            <Badge variant='soft' color='muted'>
                              منتهي
                            </Badge>
                          )}
                          {active && (
                            <Button
                              variant='ghost'
                              size='icon'
                              color='danger'
                              className='h-7 w-7'
                              onClick={() => setDisableTargetId(excuse.id)}
                              disabled={vm.isDisabling}
                            >
                              <BanIcon className='h-3.5 w-3.5' />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <Separator />

              {/* Create new excuse — hidden when an active excuse already exists */}
              {!vm.hasActiveExcuse ? (
                <div className='flex flex-col gap-3'>
                  <Typography size='sm' weight='semibold'>
                    إضافة عذر جديد
                  </Typography>
                  <div className='flex items-end gap-2'>
                    <div className='flex-1'>
                      <DateTimePicker
                        mode='dateOnly'
                        date={vm.newExpiryDate}
                        onDateChange={(d) => vm.setNewExpiryDate(d as ISODateOnlyString)}
                        dateLabel='تاريخ انتهاء العذر'
                        disablePastDates
                      />
                    </div>
                    <Button
                      color='success'
                      size='sm'
                      onClick={vm.handleCreate}
                      disabled={!vm.newExpiryDate || vm.isCreating}
                      className='shrink-0'
                    >
                      {vm.isCreating ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <PlusIcon className='h-4 w-4' />
                      )}
                      حفظ
                    </Button>
                  </div>
                </div>
              ) : (
                <Typography size='sm' className='text-center text-muted-foreground'>
                  يوجد عذر نشط بالفعل
                </Typography>
              )}
            </DialogContent>
          </Dialog>

          <ConfirmDialog
            open={!!disableTargetId}
            onOpenChange={(o) => !o && setDisableTargetId(null)}
            title='إلغاء العذر'
            description='هل أنت متأكد من إلغاء هذا العذر؟ سيُعتبر العذر منتهياً فوراً.'
            confirmText='إلغاء العذر'
            cancelText='تراجع'
            intent='destructive'
            onConfirm={() => {
              if (disableTargetId) vm.handleDisable(disableTargetId);
              setDisableTargetId(null);
            }}
          />
        </>
      )}
    </>
  );
}
