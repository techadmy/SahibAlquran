import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createGroupSchema } from '@sahibalquran/shared';
import type { CreateGroupDto } from '@sahibalquran/shared';

type UseCreateGroupModalArgs = {
  onSubmit: (data: CreateGroupDto) => Promise<void>;
  onClose: () => void;
};

export function useCreateGroupModal({ onSubmit, onClose }: UseCreateGroupModalArgs) {
  const form = useForm<CreateGroupDto>({
    resolver: zodResolver(createGroupSchema('ar')),
    defaultValues: {
      name: '',
      status: 'ACTIVE',
      description: '',
      awrad: [],
      moderatorId: 'none',
    },
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit({
      ...data,
      moderatorId: data.moderatorId && data.moderatorId !== 'none' ? data.moderatorId : undefined,
      description: data.description?.trim() || undefined,
    });
    form.reset();
  });

  return {
    control: form.control,
    handleSubmit,
    watch: form.watch,
    setValue: form.setValue,
    errors: form.formState.errors,
    handleClose,
  };
}
