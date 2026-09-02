import { z } from 'zod';
import { createWeekScheduleSchema } from '@sahibalquran/shared';
import type { ReadSourceType } from '@sahibalquran/shared';

export const attendanceFormSchema = z.record(z.string(), z.boolean().optional());
export type AttendanceFormValues = z.infer<typeof attendanceFormSchema>;

export const uploadFormSchema = (locale: 'ar' | 'en' = 'ar') =>
  createWeekScheduleSchema(locale).extend({
    file: z.custom<File>((val) => val instanceof File, {
      message: locale === 'ar' ? 'صورة الجدول مطلوبة' : 'Schedule image is required',
    }),
  });

/** Raw form field values (pre-transform) — use as TFieldValues in useForm */
export type UploadFormInput = z.input<ReturnType<typeof uploadFormSchema>>;
/** Validated output (post-transform, branded types) — use as TTransformedValues */
export type UploadFormValues = z.output<ReturnType<typeof uploadFormSchema>>;

/**
 * Client form schema for recording a learner's wird.
 * Validates individual awrad checkboxes and read source before submitting.
 * Output is mapped to RecordLearnerWirdDto in the viewmodel.
 */
export const wirdRecordingFormSchema = z
  .object({
    awrad: z
      .array(z.boolean())
      .min(1)
      .refine((arr) => arr.every(Boolean), { message: 'يجب انهاء جميع الأوراد' }),
    readSource: z.enum([
      'DEFAULT_GROUP_MATE',
      'DIFFERENT_GROUP_MATE',
      'OUTSIDE_GROUP',
    ]) satisfies z.ZodType<ReadSourceType>,
    mateId: z.string().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.readSource === 'DIFFERENT_GROUP_MATE' && !data.mateId) {
      ctx.addIssue({
        code: 'custom',
        path: ['mateId'],
        message: 'يجب اختيار الرفيق',
      });
    }
  });

export type WirdRecordingFormValues = z.infer<typeof wirdRecordingFormSchema>;
