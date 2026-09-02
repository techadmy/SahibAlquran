import { Plus, Trash2, UserPlus } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Control, FieldErrors, UseFieldArrayReturn } from 'react-hook-form';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/form-field';
import { LEARNER_DETAIL_FIELDS, TIMEZONES } from '@sahibalquran/shared';
import type { CreateAndAssignLearnersDto } from '@sahibalquran/shared';

type FormValues = Pick<CreateAndAssignLearnersDto, 'learners'>;

type NewLearnersTabProps = {
  control: Control<FormValues>;
  fields: UseFieldArrayReturn<FormValues, 'learners'>['fields'];
  errors?: FieldErrors<FormValues>;
  /** Hide add/remove row controls — used when showing imported rows */
  readonlyRows?: boolean;
  onAddLearner?: () => void;
  onRemoveLearner?: (index: number) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onClose: () => void;
  learnersCount: number;
  isLoading: boolean;
  /** Override the default footer (used by ImportLearnersTab to provide import-specific actions) */
  customFooter?: ReactNode;
};

export function NewLearnersTab({
  control,
  fields,
  errors,
  readonlyRows = false,
  onAddLearner,
  onRemoveLearner,
  onSubmit,
  onClose,
  learnersCount,
  isLoading,
  customFooter,
}: NewLearnersTabProps) {
  return (
    <form onSubmit={onSubmit} className='space-y-4'>
      <div className='space-y-3'>
        {fields.map((field, index) => {
          const rowErrors = errors?.learners?.[index];
          const hasRequiredError = !!(rowErrors?.name || rowErrors?.phone);

          return (
            <div
              key={field.id}
              className={`border rounded-xl p-3 ${
                hasRequiredError ? 'border-danger/40 bg-danger/5' : 'bg-muted/20'
              }`}
            >
              <div className='flex gap-2 items-start overflow-x-auto pb-1'>
                <div className='w-36 shrink-0'>
                  <FormField
                    control={control}
                    name={`learners.${index}.name`}
                    label='الاسم'
                    type='text'
                    placeholder='اسم الطالب'
                  />
                </div>
                <div className='min-w-40 shrink-0'>
                  <FormField
                    control={control}
                    name={`learners.${index}.phone`}
                    label='رقم الهاتف'
                    type='phone'
                  />
                </div>
                <div className='w-44 shrink-0'>
                  <FormField
                    control={control}
                    name={`learners.${index}.timezone`}
                    id={`student-timezone-${index}`}
                    label='المنطقة الزمنية'
                    type='select'
                    placeholder='اختر المنطقة الزمنية'
                    options={TIMEZONES.map((tz) => ({ value: tz.value, label: tz.label }))}
                  />
                </div>
                {LEARNER_DETAIL_FIELDS.map(({ key, label, inputType, options }) => (
                  <div key={key} className='w-28 shrink-0'>
                    <FormField
                      control={control}
                      name={`learners.${index}.${key}`}
                      label={label}
                      type={inputType}
                      placeholder={inputType === 'select' || inputType === 'time' ? undefined : '-'}
                      options={options}
                    />
                  </div>
                ))}
                {!!onRemoveLearner && fields.length > 1 && (
                  <Button
                    type='button'
                    variant='ghost'
                    color='danger'
                    size='icon'
                    className='shrink-0 mb-0.5'
                    onClick={() => onRemoveLearner?.(index)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!readonlyRows && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='gap-1.5 w-full'
          onClick={onAddLearner}
        >
          <Plus className='h-3.5 w-3.5' />
          إضافة طالب آخر
        </Button>
      )}

      <DialogFooter>
        {customFooter ?? (
          <>
            <Button type='button' variant='outline' color='muted' onClick={onClose}>
              إلغاء
            </Button>
            <Button type='submit' color='success' disabled={isLoading} className='gap-1.5'>
              <UserPlus className='h-4 w-4' />
              {isLoading ? 'جاري الإضافة...' : `إضافة ${learnersCount} طالب`}
            </Button>
          </>
        )}
      </DialogFooter>
    </form>
  );
}
