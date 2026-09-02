import { Controller } from 'react-hook-form';
import { Plus, Loader2, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Typography } from '@/components/ui/typography';
import { SaturdayDatePicker } from '@/components/ui/saturday-date-picker';
import { FileUpload } from '@/components/ui/file-upload';
import { Field, FieldLabel } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { ISODateOnlyString, WeekDto } from '@sahibalquran/shared';
import { formatDateArabicNoWeekday, formatDateLongArabic } from '@sahibalquran/shared';
import { useWeeklyScheduleViewModel } from '../../viewmodels/weekly-schedule.viewmodel';

type ScheduleGridProps = {
  weeks: WeekDto[];
  onSelect: (url: string) => void;
  onEdit: (week: WeekDto) => void;
};

function ScheduleGrid({ weeks, onSelect, onEdit }: ScheduleGridProps) {
  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
      {weeks.map((week) => (
        <Button
          key={week.scheduleImage.id}
          type='button'
          variant='ghost'
          className='relative group p-0 rounded-xl overflow-hidden border aspect-3/4 bg-muted h-auto w-full block hover:bg-muted'
          onClick={() => onSelect(week.scheduleImage.imageUrl)}
        >
          <img
            src={week.scheduleImage.imageUrl}
            alt={`الأسبوع ${week.weekNumber}`}
            className='w-full h-full object-cover transition-transform group-hover:scale-105'
          />
          <div className='absolute bottom-0 inset-x-0 bg-foreground/60 px-2 py-1.5'>
            <Typography size='xs' className='text-white text-center'>
              {week.scheduleImage.name}
            </Typography>
            <Typography size='xs' className='text-white/70 text-center'>
              {formatDateArabicNoWeekday(week.startDate)}
            </Typography>
          </div>
          <Button
            type='button'
            size='icon'
            variant='ghost'
            color='warning'
            className='absolute top-2 left-2 h-7 w-7 z-10'
            onClick={(e) => {
              e.stopPropagation();
              onEdit(week);
            }}
          >
            <Pencil className='h-3.5 w-3.5' />
          </Button>
        </Button>
      ))}
    </div>
  );
}

type WeeklyScheduleModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
};

export function WeeklyScheduleModal({ open, onOpenChange, groupId }: WeeklyScheduleModalProps) {
  const vm = useWeeklyScheduleViewModel(groupId, open);

  const handleClose = () => {
    vm.resetAll();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className='max-w-5xl max-h-[85vh] overflow-y-auto'>
          <DialogHeader>
            <div className='flex items-center justify-between'>
              <DialogTitle>الجداول الأسبوعية</DialogTitle>
              <Button
                variant='outline'
                size='sm'
                className='gap-1.5'
                onClick={() => vm.setShowUploadForm(true)}
              >
                <Plus className='h-3.5 w-3.5' />
                إضافة جدول جديد
              </Button>
            </div>
          </DialogHeader>

          {vm.showUploadForm && (
            <form
              onSubmit={vm.form.handleSubmit(vm.handleUpload)}
              className='space-y-4 border rounded-xl p-4 bg-muted/30'
            >
              <Typography size='sm' weight='semibold'>
                رفع صورة جدول جديد
              </Typography>

              <Field>
                <FieldLabel>اسم الجدول</FieldLabel>
                <Input
                  {...vm.form.register('scheduleName', { required: true })}
                  placeholder='مثال: الأسبوع الأول'
                />
              </Field>

              {vm.isFirstWeek && (
                <Field>
                  <FieldLabel>تاريخ السبت (الأسبوع الأول)</FieldLabel>
                  <Controller
                    control={vm.form.control}
                    name='saturdayDate'
                    rules={{ required: vm.isFirstWeek }}
                    render={({ field }) => (
                      <SaturdayDatePicker
                        value={field.value as ISODateOnlyString | undefined}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Field>
              )}

              <Field>
                <FieldLabel>صورة الجدول</FieldLabel>
                <Controller
                  control={vm.form.control}
                  name='file'
                  rules={{ required: true }}
                  render={({ field }) => (
                    <FileUpload value={field.value} onChange={field.onChange} accept='image/*' />
                  )}
                />
              </Field>

              <div className='flex gap-2 justify-end'>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={() => {
                    vm.form.reset();
                    vm.setShowUploadForm(false);
                  }}
                >
                  إلغاء
                </Button>
                <Button
                  type='submit'
                  color='success'
                  disabled={
                    vm.isUploading ||
                    !vm.form.watch('file') ||
                    !vm.form.watch('scheduleName')?.trim()
                  }
                >
                  {vm.isUploading ? (
                    <>
                      <Loader2 className='h-4 w-4 animate-spin' /> جاري الرفع...
                    </>
                  ) : (
                    'رفع'
                  )}
                </Button>
              </div>
            </form>
          )}

          {vm.editingCtx && (
            <div className='space-y-3 border rounded-xl p-4 bg-muted/30'>
              <div>
                <Typography size='sm' weight='semibold'>
                  تحديث الجدول: {vm.editingCtx.imageName}
                </Typography>
                <Typography size='xs' className='text-muted-foreground mt-0.5'>
                  الأسبوع {vm.editingCtx.weekNumber} —{' '}
                  {formatDateLongArabic(vm.editingCtx.weekStartDate)}
                </Typography>
              </div>
              <Field>
                <FieldLabel>اسم الجدول</FieldLabel>
                <Input
                  value={vm.editName}
                  onChange={(e) => vm.setEditName(e.target.value)}
                  placeholder='اسم الجدول'
                />
              </Field>
              <FileUpload value={vm.editFile} onChange={vm.setEditFile} accept='image/*' />
              <div className='flex gap-2 justify-end'>
                <Button type='button' variant='ghost' onClick={vm.cancelEdit}>
                  إلغاء
                </Button>
                <Button
                  type='button'
                  color='success'
                  disabled={vm.isUpdatingImage || (!vm.editFile && !vm.editName.trim())}
                  onClick={vm.handleUpdateImage}
                >
                  {vm.isUpdatingImage ? (
                    <>
                      <Loader2 className='h-4 w-4 animate-spin' /> جاري التحديث...
                    </>
                  ) : (
                    'تحديث'
                  )}
                </Button>
              </div>
            </div>
          )}

          {vm.weeks.length === 0 && !vm.showUploadForm ? (
            <Alert alertType='WARN'>
              <AlertDescription>
                لا توجد جداول أسبوعية بعد. أضف جدولاً جديداً للبدء.
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs
              value={vm.activeTab}
              onValueChange={(v) => vm.setActiveTab(v as 'current' | 'past')}
            >
              <TabsList className='w-full'>
                <TabsTrigger value='current' className='flex-1 gap-2'>
                  الحالية
                  {vm.currentWeeks.length > 0 && (
                    <Badge variant='soft' color='primary' className='text-xs px-1.5 py-0 h-4'>
                      {vm.currentWeeks.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value='past' className='flex-1 gap-2'>
                  السابقة
                  {vm.pastWeeks.length > 0 && (
                    <Badge variant='soft' color='muted' className='text-xs px-1.5 py-0 h-4'>
                      {vm.pastWeeks.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value='current' className='mt-4'>
                {vm.currentWeeks.length === 0 ? (
                  <Alert alertType='WARN'>
                    <AlertDescription>لا توجد جداول للأسابيع الحالية أو القادمة.</AlertDescription>
                  </Alert>
                ) : (
                  <ScheduleGrid
                    weeks={vm.currentWeeks}
                    onSelect={vm.setSelectedImage}
                    onEdit={vm.openEditImage}
                  />
                )}
              </TabsContent>

              <TabsContent value='past' className='mt-4'>
                {vm.pastWeeks.length === 0 ? (
                  <Alert alertType='WARN'>
                    <AlertDescription>لا توجد جداول سابقة.</AlertDescription>
                  </Alert>
                ) : (
                  <ScheduleGrid
                    weeks={vm.pastWeeks}
                    onSelect={vm.setSelectedImage}
                    onEdit={vm.openEditImage}
                  />
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-size image preview */}
      {vm.selectedImage && (
        <Dialog open={!!vm.selectedImage} onOpenChange={() => vm.setSelectedImage(null)}>
          <DialogContent className='max-w-4xl p-2'>
            <img src={vm.selectedImage} alt='الجدول' className='w-full h-auto rounded-lg' />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
