import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { queryClient, queryKeys } from '@/lib/query-client';
import { groupService } from '../../services/group.service';
import type { ReactivateMemberDto } from '@sahibalquran/shared';

type ReactivateLearnerButtonProps = {
  studentId: string;
  studentName: string;
  groupId: string;
};

export function ReactivateLearnerButton({
  studentId,
  studentName,
  groupId,
}: ReactivateLearnerButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { mutate, isPending } = useApiMutation<ReactivateMemberDto, null>({
    mutationFn: (dto) => groupService.reactivateMember(groupId, dto),
    onSuccess: async () => {
      toast.success('تم تفعيل الطالب بنجاح');
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      await queryClient.invalidateQueries({ queryKey: ['wirds', 'tracking', groupId] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.requests.all });
      setConfirmOpen(false);
    },
    onError: (err) => toast.error(err.message ?? 'حدث خطأ'),
  });

  return (
    <>
      <Button
        variant='soft'
        size='sm'
        color='success'
        className='h-6 text-xs px-2'
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
      >
        <RotateCcw className='h-3 w-3 ml-1' />
        تفعيل
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => mutate({ groupId, studentId })}
        title='تأكيد التفعيل'
        description={`هل أنت متأكد من تفعيل "${studentName}" في المجموعة؟`}
      />
    </>
  );
}
