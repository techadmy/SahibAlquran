import { useState, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DEFAULT_TIMEZONE } from '@sahibalquran/shared';
import type { CreateLearnerDto, LearnerDto, UpdateLearnerDto } from '@sahibalquran/shared';
import {
  studentMainInfoFormSchema,
  type StudentMainInfoFormValues,
} from '../utils/learner.validation';

export type StudentMainInfoMode = 'view' | 'edit' | 'create';

export type StudentMainInfoLearner = Pick<
  LearnerDto,
  'id' | 'name' | 'phone' | 'timezone' | 'contact' | 'groupCount' | 'groups'
>;

export type StudentMainInfoSubmitArgs =
  | { mode: 'create'; addToGroupId?: string; data: CreateLearnerDto }
  | { mode: 'edit'; learnerId?: string; data: UpdateLearnerDto };

type UseStudentMainInfoModalArgs = {
  mode: StudentMainInfoMode;
  learner?: StudentMainInfoLearner | null;
  addToGroupId?: string;
  onSubmit?: (args: StudentMainInfoSubmitArgs) => Promise<void> | void;
  onClose: () => void;
};

export function useStudentMainInfoModal({
  mode,
  learner,
  addToGroupId,
  onSubmit,
  onClose,
}: UseStudentMainInfoModalArgs) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingSubmitArgs, setPendingSubmitArgs] = useState<StudentMainInfoSubmitArgs | null>(
    null
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';

  const defaultValues = useMemo<StudentMainInfoFormValues>(
    () => ({
      name: learner && !isCreateMode ? learner.name : '',
      phone: learner && !isCreateMode ? (learner.phone ?? '') : '',
      timezone: learner && !isCreateMode ? learner.timezone || DEFAULT_TIMEZONE : DEFAULT_TIMEZONE,
      notes: learner && !isCreateMode ? learner.contact.notes || '' : '',
      password: '',
      details: {
        age: !isCreateMode && learner?.contact.age != null ? String(learner.contact.age) : '',
        platform: (!isCreateMode && learner?.contact.platform) || undefined,
        schedule: !isCreateMode ? (learner?.contact.schedule ?? undefined) : undefined,
        recitation: (!isCreateMode && learner?.contact.recitation) || undefined,
      },
    }),
    [learner, isCreateMode]
  );

  const form = useForm<StudentMainInfoFormValues>({
    resolver: zodResolver(
      studentMainInfoFormSchema
    ) as unknown as Resolver<StudentMainInfoFormValues>,
    values: defaultValues,
    mode: 'onTouched',
  });

  const buildContact = (values: StudentMainInfoFormValues) => {
    const notes = values.notes.trim() || undefined;
    const age = values.details.age.trim() ? Number(values.details.age) : undefined;
    const platform = values.details.platform || undefined;
    const schedule = values.details.schedule;
    const recitation = values.details.recitation || undefined;
    return { notes, age, platform, schedule, recitation };
  };

  const handleFormSubmit = (values: StudentMainInfoFormValues) => {
    if (isViewMode || !onSubmit) {
      onClose();
      return;
    }

    const contact = buildContact(values);

    const submitData: StudentMainInfoSubmitArgs = isCreateMode
      ? {
          mode: 'create',
          addToGroupId,
          data: {
            name: values.name.trim(),
            phone: values.phone.trim(),
            timezone: values.timezone,
            contact: Object.values(contact).some((v) => v !== undefined) ? contact : undefined,
          },
        }
      : {
          mode: 'edit',
          learnerId: learner?.id,
          data: {
            name: values.name.trim(),
            phone: values.phone.trim(),
            timezone: values.timezone,
            contact,
            password: values.password?.trim() ? values.password.trim() : undefined,
          },
        };

    setPendingSubmitArgs(submitData);
    setConfirmOpen(true);
  };

  const confirmSubmit = async () => {
    if (!pendingSubmitArgs || !onSubmit) return;

    setErrorMessage(null);
    try {
      await onSubmit(pendingSubmitArgs);
      setConfirmOpen(false);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'تعذر حفظ بيانات الطالب');
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setErrorMessage(null);
      setConfirmOpen(false);
      setPendingSubmitArgs(null);
      onClose();
    }
  };

  return {
    form,
    isViewMode,
    isCreateMode,
    errorMessage,
    confirmOpen,
    setConfirmOpen,
    handleFormSubmit: form.handleSubmit(handleFormSubmit),
    confirmSubmit,
    handleOpenChange,
  };
}
