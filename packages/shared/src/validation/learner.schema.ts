import z, { ZodType } from 'zod';
import { CreateLearnerDto, QueryLearnersDto, UpdateLearnerDto } from '../learner.types';
import { getMessages, ValidationLocale } from './messages';
import {
  contactDetailsSchema,
  nameSchema,
  notesSchema,
  passwordSchema,
  phoneSchema,
} from './fields.schema';
import { optionalTimezoneFieldSchema, timezoneFieldSchema } from './timezone.schema';
import { paginationSchema } from './api.schema';
import { TIMEZONE_VALUES } from '../utils/timezones.util';
import type { TimeZoneType } from '../types/api.types';

const learnerContactSchema = (locale: ValidationLocale = 'ar') =>
  contactDetailsSchema(locale).extend({
    notes: notesSchema(locale).optional(),
  });

export const createLearnerSchema = (locale: ValidationLocale = 'ar') =>
  z.intersection(
    z.object({
      name: nameSchema(locale),
      phone: phoneSchema(locale),
      contact: learnerContactSchema(locale).optional(),
    }),
    timezoneFieldSchema(locale)
  ) satisfies ZodType<CreateLearnerDto>;

export const updateLearnerSchema = (locale: ValidationLocale = 'ar') => {
  const m = getMessages(locale);
  return z
    .intersection(
      z.object({
        name: nameSchema(locale).optional(),
        phone: phoneSchema(locale).optional(),
        contact: learnerContactSchema(locale).optional(),
        password: passwordSchema(locale).optional(),
      }),
      optionalTimezoneFieldSchema(locale)
    )
    .refine((value) => Object.keys(value).length > 0, {
      message: m.atLeastOneField,
    }) satisfies ZodType<UpdateLearnerDto>;
};

export const queryLearnersSchema = (locale: ValidationLocale = 'ar') =>
  paginationSchema(locale).extend({
    search: z.string().trim().min(1).optional(),
    sortBy: z
      .enum([
        'name',
        'timezone',
        'notes',
        'groupCount',
        'groups',
        'createdAt',
        'age',
        'schedule',
        'recitation',
        'platform',
      ])
      .optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    timezone: z
      .string()
      .refine((v) => TIMEZONE_VALUES.includes(v), { message: 'Invalid timezone' })
      .transform((v) => v as TimeZoneType)
      .optional(),
    recitation: z.enum(['HAFS', 'WARSH']).optional(),
    platform: z.enum(['MOBILE_NETWORKS', 'INTERNET', 'BOTH']).optional(),
    groupId: z.string().optional(),
  }) satisfies ZodType<QueryLearnersDto>;
