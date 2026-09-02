import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/form-field';
import type { GroupDto, UpdateGroupDto, StaffUserDto } from '@sahibalquran/shared';
import { AwradField, ModeratorSelectField, STATUS_OPTIONS } from './group-form-shared';
import { useEditGroupModal } from '../../viewmodels/edit-group-modal.viewmodel';

type EditGroupModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupDto;
  staffUsers: StaffUserDto[];
  isLoading: boolean;
  isLoadingStaff: boolean;
  onSubmit: (data: UpdateGroupDto) => Promise<void>;
};

export function EditGroupModal({
  open,
  onOpenChange,
  group,
  staffUsers,
  isLoading,
  isLoadingStaff,
  onSubmit,
}: EditGroupModalProps) {
  const vm = useEditGroupModal({ group, onSubmit });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>تعديل معلومات المجموعة</DialogTitle>
        </DialogHeader>

        <form onSubmit={vm.handleSubmit} className='space-y-4'>
          <FormField control={vm.control} name='name' label='اسم المجموعة' type='text' />
          <FormField
            control={vm.control}
            name='status'
            label='الحالة'
            type='select'
            options={STATUS_OPTIONS}
          />
          <FormField
            control={vm.control}
            name='description'
            label='الوصف'
            type='textarea'
            rows={3}
          />
          <AwradField
            value={vm.watch('awrad') ?? []}
            onChange={(v) => vm.setValue('awrad', v, { shouldDirty: true })}
            errorMessage={vm.errors.awrad?.message}
          />
          <ModeratorSelectField
            value={vm.watch('moderatorId') ?? 'none'}
            onChange={(v) => vm.setValue('moderatorId', v, { shouldDirty: true })}
            staffUsers={staffUsers}
            errorMessage={vm.errors.moderatorId?.message}
            disabled={isLoadingStaff}
          />

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              color='muted'
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button type='submit' color='success' disabled={isLoading || !vm.isDirty}>
              {isLoading ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
