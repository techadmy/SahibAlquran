import {
  CreateLearnerDto,
  nameSchema,
  notesSchema,
  timezoneFieldSchema,
  phoneSchema,
  passwordSchema,
  TIME_MINUTES_MAX,
  recitationSchema,
  platformSchema,
} from '@wirdi/shared';
import type { PlatformType, RecitationType } from '@wirdi/shared';
import { z, type ZodType } from 'zod';

export type StudentMainInfoFormValues = Pick<CreateLearnerDto, 'name' | 'phone' | 'timezone'> & {
  notes: string;
  password?: string;
  details: {
    age: string;
    platform?: PlatformType;
    schedule?: number;
    recitation?: RecitationType;
  };
};

export const studentMainInfoFormSchema = z.intersection(
  z.object({
    name: nameSchema(),
    phone: phoneSchema(),
    notes: notesSchema(),
    password: z.union([passwordSchema(), z.literal('')]).optional(),
    details: z.object({
      age: z.string().trim(),
      platform: platformSchema(),
      schedule: z.coerce.number().int().min(0).max(TIME_MINUTES_MAX).optional(),
      recitation: recitationSchema(),
    }),
  }),
  timezoneFieldSchema()
) satisfies ZodType<StudentMainInfoFormValues>;
