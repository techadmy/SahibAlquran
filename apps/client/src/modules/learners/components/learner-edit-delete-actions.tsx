import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StudentMainInfoModal } from './student-main-info-modal';
import type { StudentMainInfoLearner, StudentMainInfoSubmitArgs } from './student-main-info-modal';
import type { UpdateLearnerDto } from '@sahibalquran/shared';

type LearnerEditDeleteActionsProps = {
  learner: StudentMainInfoLearner;
  deleteDescription: string;
  onEditSubmit: (data: UpdateLearnerDto) => Promise<void>;
  onDeleteConfirm: () => Promise<void>;
  isUpdating?: boolean;
};

export function LearnerEditDeleteActions({
  learner,
  deleteDescription,
  onEditSubmit,
  onDeleteConfirm,
  isUpdating = false,
}: LearnerEditDeleteActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleEditSubmit = async (args: StudentMainInfoSubmitArgs) => {
    if (args.mode !== 'edit') return;
    await onEditSubmit(args.data as UpdateLearnerDto);
    setIsEditOpen(false);
  };

  const handleDeleteConfirm = async () => {
    await onDeleteConfirm();
    setIsDeleteOpen(false);
  };

  return (
    <>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        color='warning'
        className='h-8 w-8'
        onClick={(e) => {
          e.stopPropagation();
          setIsEditOpen(true);
        }}
        aria-label='تعديل الطالب'
      >
        <Pencil className='w-4 h-4' />
      </Button>

      <Button
        type='button'
        variant='ghost'
        size='icon'
        color='danger'
        className='h-8 w-8'
        onClick={(e) => {
          e.stopPropagation();
          setIsDeleteOpen(true);
        }}
        aria-label='حذف الطالب'
      >
        <Trash2 className='w-4 h-4' />
      </Button>

      <StudentMainInfoModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        mode='edit'
        learner={learner}
        onSubmit={handleEditSubmit}
        isLoading={isUpdating}
      />

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title='حذف الطالب'
        description={deleteDescription}
        confirmText='حذف'
        cancelText='إلغاء'
        intent='destructive'
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
