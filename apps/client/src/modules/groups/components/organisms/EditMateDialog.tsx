import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GroupMemberDto } from '@sahibalquran/shared';

const NO_MATE_VALUE = '__none__';

type EditMateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: GroupMemberDto | null;
  allMembers: GroupMemberDto[];
  onConfirm: (mateId: string | null) => Promise<void>;
  isLoading: boolean;
};

export function EditMateDialog({
  open,
  onOpenChange,
  member,
  allMembers,
  onConfirm,
  isLoading,
}: EditMateDialogProps) {
  const [selectedValue, setSelectedValue] = useState<string>(member?.mateId ?? NO_MATE_VALUE);

  const eligibleMates = allMembers.filter((m) => m.studentId !== member?.studentId);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedValue(member?.mateId ?? NO_MATE_VALUE);
    }
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    const mateId = selectedValue === NO_MATE_VALUE ? null : selectedValue;
    await onConfirm(mateId);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>تعديل الرفيق</DialogTitle>
        </DialogHeader>

        <div className='space-y-3 py-2'>
          <p className='text-sm text-muted-foreground'>
            اختر الرفيق لـ{' '}
            <span className='font-medium text-foreground'>{member?.studentName}</span>
          </p>

          <Select value={selectedValue} onValueChange={setSelectedValue}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='اختر الزميل...' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_MATE_VALUE}>بدون رفيق</SelectItem>
              {eligibleMates.map((mate) => (
                <SelectItem key={mate.studentId} value={mate.studentId}>
                  {mate.studentName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            color='muted'
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            إلغاء
          </Button>
          <Button color='success' onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
