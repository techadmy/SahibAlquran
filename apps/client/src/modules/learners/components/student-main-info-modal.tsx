import { LEARNER_DETAIL_FIELDS, TIMEZONES } from '@sahibalquran/shared';
import { FormField } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Typography } from '@/components/ui/typography';
import { LearnerGroupsReadonlyPanel } from './LearnerGroupsReadonlyPanel';
import {
  useStudentMainInfoModal,
  type StudentMainInfoLearner,
  type StudentMainInfoMode,
  type StudentMainInfoSubmitArgs,
} from '../viewmodels/student-main-info-modal.viewmodel';

export type { StudentMainInfoMode, StudentMainInfoLearner, StudentMainInfoSubmitArgs };

type StudentMainInfoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: StudentMainInfoMode;
  learner?: StudentMainInfoLearner | null;
  addToGroupId?: string;
  onSubmit?: (args: StudentMainInfoSubmitArgs) => Promise<void> | void;
  isLoading?: boolean;
};

export function StudentMainInfoModal({
  open,
  onOpenChange,
  mode,
  learner,
  addToGroupId,
  onSubmit,
  isLoading = false,
}: StudentMainInfoModalProps) {
  const vm = useStudentMainInfoModal({
    mode,
    learner,
    addToGroupId,
    onSubmit,
    onClose: () => onOpenChange(false),
  });

  const title =
    mode === 'create' ? 'إضافة طالب' : mode === 'edit' ? 'تعديل بيانات الطالب' : 'بيانات الطالب';

  const description =
    mode === 'create'
      ? 'أدخل البيانات الأساسية للطالب الجديد'
      : mode === 'edit'
        ? 'يمكنك تعديل البيانات وحفظها'
        : 'عرض البيانات الأساسية للطالب';

  return (
    <>
      <Dialog open={open} onOpenChange={vm.handleOpenChange}>
        <DialogContent className='w-full sm:max-w-lg' onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <form onSubmit={vm.handleFormSubmit} className='space-y-4'>
            <FormField
              control={vm.form.control}
              name='name'
              id='student-name'
              label='الاسم'
              type='text'
              placeholder='اسم الطالب'
              disabled={vm.isViewMode || isLoading}
            />

            <FormField
              control={vm.form.control}
              name='phone'
              id='student-phone'
              label='رقم الهاتف'
              type='phone'
              disabled={vm.isViewMode || isLoading}
            />

            <FormField
              control={vm.form.control}
              name='timezone'
              id='student-timezone'
              label='المنطقة الزمنية'
              type='select'
              placeholder='اختر المنطقة الزمنية'
              disabled={vm.isViewMode || isLoading}
              options={TIMEZONES.map((tz) => ({
                value: tz.value,
                label: tz.label,
              }))}
            />

            <FormField
              control={vm.form.control}
              name='notes'
              id='student-notes'
              label='ملاحظات'
              type='textarea'
              placeholder='ملاحظات عن الطالب'
              disabled={vm.isViewMode || isLoading}
              rows={4}
            />

            {mode === 'edit' ? (
              <FormField
                control={vm.form.control}
                name='password'
                id='student-password'
                label='كلمة المرور الجديدة'
                type='password'
                placeholder='اتركه فارغًا للإبقاء على كلمة المرور الحالية'
                disabled={isLoading}
              />
            ) : null}

            {LEARNER_DETAIL_FIELDS.map((field) => (
              <FormField
                key={field.key}
                control={vm.form.control}
                name={`details.${field.key}`}
                id={`student-details-${field.key}`}
                label={field.label}
                type={field.inputType}
                placeholder={
                  field.inputType === 'select' || field.inputType === 'time'
                    ? undefined
                    : field.label
                }
                disabled={vm.isViewMode || isLoading}
                options={field.options}
              />
            ))}

            {vm.isViewMode ? (
              <LearnerGroupsReadonlyPanel
                groups={learner?.groups}
                groupCount={learner?.groupCount}
              />
            ) : null}

            {vm.errorMessage ? (
              <Typography as='div' size='sm' className='text-danger' role='alert'>
                {vm.errorMessage}
              </Typography>
            ) : null}

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                color='muted'
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                إغلاق
              </Button>

              {!vm.isViewMode ? (
                <Button
                  type='submit'
                  color='success'
                  disabled={isLoading || !vm.form.formState.isDirty || !vm.form.formState.isValid}
                >
                  {isLoading ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
              ) : null}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={vm.confirmOpen}
        onOpenChange={vm.setConfirmOpen}
        title={vm.isCreateMode ? 'تأكيد إضافة طالب' : 'تأكيد تعديل الطالب'}
        description={
          vm.isCreateMode ? 'هل أنت متأكد من إضافة هذا الطالب؟' : 'هل أنت متأكد من حفظ التعديلات؟'
        }
        confirmText={vm.isCreateMode ? 'إضافة' : 'حفظ'}
        cancelText='إلغاء'
        onConfirm={vm.confirmSubmit}
      />
    </>
  );
}
