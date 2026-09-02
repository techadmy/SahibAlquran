import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateGroupSchema } from '@sahibalquran/shared';
import type { GroupDto, UpdateGroupDto } from '@sahibalquran/shared';

type UseEditGroupModalArgs = {
  group: GroupDto;
  onSubmit: (data: UpdateGroupDto) => Promise<void>;
};

export function useEditGroupModal({ group, onSubmit }: UseEditGroupModalArgs) {
  const form = useForm<UpdateGroupDto>({
    resolver: zodResolver(updateGroupSchema('ar')),
    defaultValues: {
      name: group.name,
      status: group.status,
      description: group.description ?? '',
      awrad: group.awrad,
      moderatorId: group.moderatorId ?? 'none',
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit({
      ...data,
      moderatorId: data.moderatorId && data.moderatorId !== 'none' ? data.moderatorId : undefined,
    });
  });

  return {
    control: form.control,
    handleSubmit,
    watch: form.watch,
    setValue: form.setValue,
    errors: form.formState.errors,
    isDirty: form.formState.isDirty,
  };
}
