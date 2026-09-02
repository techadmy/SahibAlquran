import { useRef } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Typography } from '@/components/ui/typography';
import { LEARNER_DETAIL_FIELDS } from '@sahibalquran/shared';
import type { CreateAndAssignLearnersDto } from '@sahibalquran/shared';
import { useImportLearnersViewModel } from '../../viewmodels/import-learners.viewmodel';
import { NewLearnersTab } from './NewLearnersTab';

type ImportLearnersTabProps = {
  groupId: string;
  isActive: boolean;
  isLoading: boolean;
  onSubmit: (dto: CreateAndAssignLearnersDto) => Promise<void>;
  onClose: () => void;
};

const REQUIRED_COLUMNS = ['الاسم', 'رقم الهاتف'];
const OPTIONAL_COLUMNS = LEARNER_DETAIL_FIELDS.map((f) => f.label);

export function ImportLearnersTab({
  groupId,
  isActive: _isActive,
  isLoading,
  onSubmit,
  onClose,
}: ImportLearnersTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vm = useImportLearnersViewModel({ groupId, onSubmit, onClose });

  // ─── Upload step ────────────────────────────────────────────────────────────
  if (vm.step === 'upload') {
    return (
      <div className='space-y-5'>
        {/* Admin notice */}
        <div className='rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-2'>
          <div className='flex items-center gap-2 text-warning'>
            <Info className='h-4 w-4 shrink-0' />
            <Typography as='div' size='sm' weight='semibold' className='text-warning'>
              تنبيه مهم للمشرف
            </Typography>
          </div>
          <Typography as='p' size='xs' className='text-muted-foreground leading-relaxed'>
            تأكد من أن جميع الطلاب في الملف لم يُسجَّلوا مسبقاً في النظام قبل الرفع.
          </Typography>
        </div>

        {/* Columns guide */}
        <div className='rounded-xl border border-border bg-muted/20 p-4 space-y-3'>
          <div className='flex items-center gap-2'>
            <FileSpreadsheet className='h-4 w-4 text-primary' />
            <Typography as='div' size='sm' weight='semibold'>
              أعمدة ملف Excel
            </Typography>
          </div>
          <div className='space-y-2'>
            <div className='space-y-1'>
              <Typography as='div' size='xs' weight='semibold' className='text-danger'>
                مطلوبة
              </Typography>
              <div className='flex flex-wrap gap-1.5'>
                {REQUIRED_COLUMNS.map((col) => (
                  <span
                    key={col}
                    className='inline-flex items-center gap-1 rounded-md bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger border border-danger/20'
                  >
                    <CheckCircle2 className='h-3 w-3' />
                    {col}
                  </span>
                ))}
              </div>
            </div>
            <div className='space-y-1'>
              <Typography as='div' size='xs' weight='semibold' className='text-muted-foreground'>
                اختيارية
              </Typography>
              <div className='flex flex-wrap gap-1.5'>
                {OPTIONAL_COLUMNS.map((col) => (
                  <span
                    key={col}
                    className='inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border'
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Typography as='p' size='xs' className='text-muted-foreground'>
            ملاحظة: عمود <span className='font-semibold'>رقم الهاتف</span> يُستخدم اسم مستخدم لتسجيل
            الدخول ولا يُخزَّن بشكل منفصل.
          </Typography>
        </div>

        {/* Drop zone */}
        <button
          type='button'
          onClick={() => fileInputRef.current?.click()}
          className='w-full rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors p-8 flex flex-col items-center gap-3 cursor-pointer'
        >
          <div className='rounded-full bg-primary/10 p-3'>
            <Upload className='h-6 w-6 text-primary' />
          </div>
          <div className='text-center'>
            <Typography as='div' size='sm' weight='semibold'>
              اضغط لاختيار ملف
            </Typography>
            <Typography as='div' size='xs' className='text-muted-foreground mt-0.5'>
              xlsx. فقط
            </Typography>
          </div>
        </button>

        <input
          ref={fileInputRef}
          type='file'
          accept='.xlsx'
          className='hidden'
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) vm.handleFileSelect(file);
            e.target.value = '';
          }}
        />

        <DialogFooter>
          <Button type='button' variant='outline' color='muted' onClick={onClose}>
            إلغاء
          </Button>
        </DialogFooter>
      </div>
    );
  }

  // ─── Preview step — reuse NewLearnersTab in readonly mode ───────────────────
  const hasBlockingErrors = vm.blockingErrors.length > 0;

  return (
    <div className='space-y-4'>
      {hasBlockingErrors && (
        <div className='rounded-xl border border-danger/30 bg-danger/5 p-3 space-y-1'>
          <div className='flex items-center gap-2 text-danger'>
            <AlertTriangle className='h-4 w-4 shrink-0' />
            <Typography as='div' size='sm' weight='semibold' className='text-danger'>
              أخطاء يجب إصلاحها قبل الاستيراد
            </Typography>
          </div>
          <ul className='list-disc list-inside space-y-0.5'>
            {vm.blockingErrors.map((err) => (
              <li key={err}>
                <Typography as='span' size='xs' className='text-danger'>
                  {err}
                </Typography>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats bar */}
      {!hasBlockingErrors && vm.learnersCount > 0 && (
        <div className='flex items-center gap-3 rounded-lg border border-success/20 bg-success/5 px-3 py-2'>
          <CheckCircle2 className='h-4 w-4 text-success shrink-0' />
          <Typography as='div' size='sm' className='text-success'>
            تم تحليل <span className='font-bold'>{vm.learnersCount}</span> سجل جاهز للمراجعة
          </Typography>
        </div>
      )}

      {/* NewLearnersTab in readonly mode — form is pre-filled from Excel */}
      <NewLearnersTab
        control={vm.control}
        fields={vm.fields}
        errors={vm.formState.errors}
        readonlyRows
        onRemoveLearner={vm.removeLearner}
        onSubmit={vm.handleSubmit}
        onClose={vm.handleClose}
        learnersCount={vm.learnersCount}
        isLoading={isLoading}
        customFooter={
          <DialogFooter className='gap-2'>
            <Button
              type='button'
              variant='outline'
              color='muted'
              className='gap-1.5'
              onClick={vm.handleBack}
            >
              <ArrowRight className='h-4 w-4' />
              رفع ملف آخر
            </Button>
            <Button
              type='submit'
              color='success'
              className='gap-1.5'
              disabled={
                isLoading || hasBlockingErrors || !vm.formState.isValid || vm.learnersCount === 0
              }
            >
              {isLoading ? 'جاري الاستيراد...' : `استيراد (${vm.learnersCount})`}
            </Button>
          </DialogFooter>
        }
      />
    </div>
  );
}
