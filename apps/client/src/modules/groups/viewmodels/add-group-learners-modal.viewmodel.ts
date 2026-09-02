import { useState } from 'react';
import { useForm, useFieldArray, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAndAssignLearnersSchema, DEFAULT_TIMEZONE } from '@sahibalquran/shared';
import type { CreateAndAssignLearnersDto } from '@sahibalquran/shared';

type FormValues = Pick<CreateAndAssignLearnersDto, 'learners'>;

type UseAddGroupLearnersModalArgs = {
  groupId: string;
  onSubmit: (dto: CreateAndAssignLearnersDto) => Promise<void>;
  onClose: () => void;
};

export function useAddGroupLearnersModal({
  groupId,
  onSubmit,
  onClose,
}: UseAddGroupLearnersModalArgs) {
  const [tab, setTab] = useState<'new' | 'existing' | 'import'>('new');

  const form = useForm<FormValues>({
    resolver: zodResolver(
      createAndAssignLearnersSchema('ar').omit({ groupId: true })
    ) as unknown as Resolver<FormValues>,
    defaultValues: {
      learners: [{ name: '', phone: '', timezone: DEFAULT_TIMEZONE, notes: '' }],
    },
  });

  const fieldArray = useFieldArray({ control: form.control, name: 'learners' });

  const handleClose = () => {
    form.reset();
    setTab('new');
    onClose();
  };
  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      groupId,
      learners: values.learners.map((l: FormValues['learners'][number]) => ({
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
    form.reset();
  });

  const addLearner = () =>
    fieldArray.append({
      name: '',
      phone: '',
      timezone: DEFAULT_TIMEZONE,
      notes: '',
    });

  return {
    tab,
    setTab,
    control: form.control,
    formState: form.formState,
    handleSubmit,
    handleClose,
    fields: fieldArray.fields,
    removeLearner: fieldArray.remove,
    addLearner,
    learnersCount: fieldArray.fields.length,
  };
}
