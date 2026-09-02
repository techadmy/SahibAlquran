import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/forms/form-field';
import type { CreateGroupDto, StaffUserDto } from '@sahibalquran/shared';
import { AwradField, ModeratorSelectField, STATUS_OPTIONS } from './group-form-shared';
import { useCreateGroupModal } from '../../viewmodels/create-group-modal.viewmodel';

type CreateGroupModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffUsers: StaffUserDto[];
  isLoading: boolean;
  onSubmit: (data: CreateGroupDto) => Promise<void>;
};

export function CreateGroupModal({
  open,
  onOpenChange,
  staffUsers,
  isLoading,
  onSubmit,
}: CreateGroupModalProps) {
  const vm = useCreateGroupModal({ onSubmit, onClose: () => onOpenChange(false) });

  return (
    <Dialog open={open} onOpenChange={vm.handleClose}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>إنشاء مجموعة جديدة</DialogTitle>
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
            value={vm.watch('awrad')}
            onChange={(v) => vm.setValue('awrad', v, { shouldDirty: true })}
            errorMessage={vm.errors.awrad?.message}
          />
          <ModeratorSelectField
            value={vm.watch('moderatorId') ?? 'none'}
            onChange={(v) => vm.setValue('moderatorId', v, { shouldDirty: true })}
            staffUsers={staffUsers}
            errorMessage={vm.errors.moderatorId?.message}
          />

          <DialogFooter>
            <Button type='button' variant='outline' color='muted' onClick={vm.handleClose}>
              إلغاء
            </Button>
            <Button type='submit' color='success' disabled={isLoading}>
              {isLoading ? 'جاري الإنشاء...' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
