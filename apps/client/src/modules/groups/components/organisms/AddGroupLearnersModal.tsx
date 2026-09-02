import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { CreateAndAssignLearnersDto } from '@sahibalquran/shared';
import { AssignExistingLearnersTab } from './AssignExistingLearnersTab';
import { NewLearnersTab } from './NewLearnersTab';
import { ImportLearnersTab } from './ImportLearnersTab';
import { useAddGroupLearnersModal } from '../../viewmodels/add-group-learners-modal.viewmodel';

type AddGroupLearnersModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  onSubmit: (dto: CreateAndAssignLearnersDto) => Promise<void>;
  isLoading: boolean;
};

export function AddGroupLearnersModal({
  open,
  onOpenChange,
  groupId,
  onSubmit,
  isLoading,
}: AddGroupLearnersModalProps) {
  const vm = useAddGroupLearnersModal({
    groupId,
    onSubmit,
    onClose: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={vm.handleClose}>
      <DialogContent className='min-w-[95%] max-h-[85vh] flex flex-col overflow-hidden'>
        <DialogHeader>
          <DialogTitle>إضافة طالبين للمجموعة</DialogTitle>
        </DialogHeader>

        <Tabs
          dir='rtl'
          value={vm.tab}
          onValueChange={(v) => vm.setTab(v as 'new' | 'existing' | 'import')}
          className='flex-1 min-h-0 flex flex-col overflow-hidden'
        >
          <TabsList className='w-full shrink-0'>
            <TabsTrigger value='new' className='flex-1'>
              طالبون جدد
            </TabsTrigger>
            <TabsTrigger value='existing' className='flex-1'>
              طالبون موجودون
            </TabsTrigger>
            <TabsTrigger value='import' className='flex-1'>
              استيراد Excel
            </TabsTrigger>
          </TabsList>

          <TabsContent value='new' className='mt-4 flex-1 min-h-0 overflow-y-auto space-y-4'>
            <NewLearnersTab
              control={vm.control}
              fields={vm.fields}
              errors={vm.formState.errors}
              onAddLearner={vm.addLearner}
              onRemoveLearner={vm.removeLearner}
              onSubmit={vm.handleSubmit}
              onClose={vm.handleClose}
              learnersCount={vm.learnersCount}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value='existing' className='mt-4 flex-1 min-h-0'>
            <AssignExistingLearnersTab
              groupId={groupId}
              isActive={vm.tab === 'existing'}
              onSuccess={vm.handleClose}
            />
          </TabsContent>

          <TabsContent value='import' className='mt-4 flex-1 min-h-0 overflow-y-auto'>
            <ImportLearnersTab
              groupId={groupId}
              isActive={vm.tab === 'import'}
              isLoading={isLoading}
              onSubmit={onSubmit}
              onClose={vm.handleClose}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
