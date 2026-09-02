import { useState, useCallback } from 'react';
import { useForm, useFieldArray, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { readSheet } from 'read-excel-file/browser';
import type { CellValue, Row } from 'read-excel-file/browser';
import {
  createAndAssignLearnersSchema,
  DEFAULT_TIMEZONE,
  LEARNER_DETAIL_FIELDS,
  PLATFORM_OPTIONS,
  RECITATION_OPTIONS,
  normalizeArabic,
  normalizePhoneInput,
  timeStringToMinutes,
  TIMEZONES,
} from '@sahibalquran/shared';
import type {
  CreateAndAssignLearnersDto,
  PlatformType,
  RecitationType,
  TimeZoneType,
} from '@sahibalquran/shared';

type FormValues = Pick<CreateAndAssignLearnersDto, 'learners'>;

/** Columns that are required in the Excel file */
const REQUIRED_EXCEL_COLUMNS = ['الاسم', 'رقم الهاتف'] as const;

type UseImportLearnersViewModelArgs = {
  groupId: string;
  onSubmit: (dto: CreateAndAssignLearnersDto) => Promise<void>;
  onClose: () => void;
};

export function useImportLearnersViewModel({
  groupId,
  onSubmit,
  onClose,
}: UseImportLearnersViewModelArgs) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [blockingErrors, setBlockingErrors] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(
      createAndAssignLearnersSchema('ar').omit({ groupId: true })
    ) as unknown as Resolver<FormValues>,
    defaultValues: { learners: [] },
    mode: 'onChange',
  });

  const fieldArray = useFieldArray({ control: form.control, name: 'learners' });

  /** Normalize Arabic column header for comparison */
  const normalizeHeader = (h: unknown): string =>
    typeof h === 'string' ? normalizeArabic(h.trim()) : '';

  /** Map a raw Excel row (header→value map) to a DTO learner entry */
  const mapRowToLearner = (
    row: Record<string, CellValue | null>
  ): FormValues['learners'][number] => {
    // Build a normalized-key lookup
    const normalized: Record<string, CellValue | null> = {};
    for (const [k, v] of Object.entries(row)) {
      normalized[normalizeArabic(k.trim())] = v;
    }

    const get = (col: string): string | undefined => {
      const val = normalized[normalizeArabic(col)];
      return val != null && val !== '' ? String(val).trim() : undefined;
    };

    const timezone = (TIMEZONES.find(
      (tz) => normalizeArabic(tz.label) === normalizeArabic(get('البلد') ?? '')
    )?.value ?? DEFAULT_TIMEZONE) as TimeZoneType;

    const age = get(LEARNER_DETAIL_FIELDS.find((f) => f.key === 'age')!.excelColumn);
    const schedule = get(LEARNER_DETAIL_FIELDS.find((f) => f.key === 'schedule')!.excelColumn);

    const rawPlatform = get(LEARNER_DETAIL_FIELDS.find((f) => f.key === 'platform')!.excelColumn);
    const platform = rawPlatform
      ? (PLATFORM_OPTIONS.find((o) => normalizeArabic(o.label) === normalizeArabic(rawPlatform))
          ?.value as PlatformType | undefined)
      : undefined;

    const rawRecitation = get(
      LEARNER_DETAIL_FIELDS.find((f) => f.key === 'recitation')!.excelColumn
    );
    const recitation = rawRecitation
      ? (RECITATION_OPTIONS.find((o) => normalizeArabic(o.label) === normalizeArabic(rawRecitation))
          ?.value as RecitationType | undefined)
      : undefined;

    return {
      name: get('الاسم') ?? '',
      phone: normalizePhoneInput(normalized[normalizeArabic('رقم الهاتف')]),
      timezone,
      notes: undefined,
      age: age ? Number(age) : undefined,
      platform,
      schedule: schedule ? timeStringToMinutes(schedule) : undefined,
      recitation,
    };
  };

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        toast.error('يجب أن يكون الملف بصيغة xlsx. فقط');
        return;
      }

      const rawRows: Row[] = await readSheet(file, { dateFormat: 'YYYY-MM-DD' });
      if (rawRows.length < 2) {
        setBlockingErrors(['الملف فارغ أو لا يحتوي على بيانات']);
        setStep('preview');
        return;
      }

      const headerRow = rawRows[0].map((h) => (h != null ? String(h) : ''));
      const normalizedHeaders = headerRow.map(normalizeHeader);

      // Validate required columns
      const errors: string[] = [];
      for (const col of REQUIRED_EXCEL_COLUMNS) {
        if (!normalizedHeaders.includes(normalizeArabic(col))) {
          errors.push(`العمود المطلوب "${col}" غير موجود في الملف`);
        }
      }
      setBlockingErrors(errors);

      // Map data rows to learner DTOs
      const dataRows = rawRows
        .slice(1)
        .filter((row) => row.some((cell) => cell != null && cell !== ''));

      const learners = dataRows.map((row) => {
        const rowObj: Record<string, CellValue | null> = {};
        headerRow.forEach((h, i) => {
          rowObj[h] = row[i];
        });
        return mapRowToLearner(rowObj);
      });

      form.reset({ learners });
      await form.trigger();
      setStep('preview');
    },
    [form]
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      groupId,
      learners: values.learners.map((l) => ({
        name: l.name,
        phone: l.phone,
        timezone: l.timezone,
        notes: l.notes || undefined,
        age: l.age,
        platform: l.platform,
        schedule: l.schedule,
        recitation: l.recitation,
      })),
    });
    handleClose();
  });

  const handleClose = () => {
    form.reset({ learners: [] });
    setStep('upload');
    setBlockingErrors([]);
    onClose();
  };

  const handleBack = () => {
    form.reset({ learners: [] });
    setStep('upload');
    setBlockingErrors([]);
  };

  return {
    step,
    blockingErrors,
    control: form.control,
    fields: fieldArray.fields,
    formState: form.formState,
    learnersCount: fieldArray.fields.length,
    handleFileSelect,
    handleSubmit,
    handleClose,
    handleBack,
    removeLearner: fieldArray.remove,
  };
}
