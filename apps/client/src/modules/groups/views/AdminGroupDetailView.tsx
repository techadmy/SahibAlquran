import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GroupInfoCard } from '../components/molecules/GroupInfoCard';
import { EditGroupModal } from '../components/organisms/EditGroupModal';
import { WeeklyScheduleModal } from '../components/organisms/WeeklyScheduleModal';
import { AddGroupLearnersModal } from '../components/organisms/AddGroupLearnersModal';
import { EditMateDialog } from '../components/organisms/EditMateDialog';
import { WeekTabs } from '../components/molecules/WeekTabs';
import { WirdTrackingTable } from '../components/organisms/WirdTrackingTable';
import { WirdRecordingCard } from '../components/molecules/WirdRecordingCard';
import { useGroupDetailViewModel } from '../viewmodels/group-detail.viewmodel';
import { useWirdTrackingViewModel } from '../viewmodels/wird-tracking.viewmodel';
import { useGroupLearnersViewModel } from '../viewmodels/group-learners.viewmodel';
import { StudentMainInfoModal } from '@/modules/learners/components/student-main-info-modal';
import type { GroupWirdTrackingRowDto } from '@sahibalquran/shared';

type Props = { groupId: string };

export default function AdminGroupDetailView({ groupId }: Props) {
  const vm = useGroupDetailViewModel(groupId);
  const wirdVm = useWirdTrackingViewModel(groupId);
  const learnersVm = useGroupLearnersViewModel(groupId);

  const [editingLearnerId, setEditingLearnerId] = useState<string | null>(null);

  if (vm.isLoading) {
    return (
      <div className='flex items-center justify-center py-20 text-muted-foreground gap-2'>
        <Loader2 className='h-5 w-5 animate-spin' />
        <Typography className='text-muted-foreground'>جاري التحميل...</Typography>
      </div>
    );
  }

  if (vm.queryError || !vm.group) {
    return (
      <Alert alertType='ERROR'>
        <AlertDescription>{vm.queryError ?? 'لم يتم العثور على المجموعة'}</AlertDescription>
      </Alert>
    );
  }

  const handleEditMate = (row: GroupWirdTrackingRowDto) => {
    const member = learnersVm.members.find((m) => m.id === row.memberId);
    if (member) {
      learnersVm.setMemberPendingMateEdit(member);
    }
  };

  const handleEditLearner = (studentId: string) => {
    setEditingLearnerId(studentId);
  };

  const handleDeleteLearner = async (memberId: string) => {
    await learnersVm.handleRemoveMember(memberId);
  };

  const learnerForEdit = editingLearnerId
    ? learnersVm.members.find((m) => m.studentId === editingLearnerId)
    : null;

  // Determine if the selected week is upcoming to disable manual editing
  const selectedWeek = wirdVm.weeks.find((w) => w.id === wirdVm.selectedWeekId);
  const isSelectedWeekUpcoming = selectedWeek?.isUpcoming ?? false;
  const staffUserIds = new Set(vm.staffUsers.map((staffUser) => staffUser.id));

  return (
    <div className='space-y-6'>
      <GroupInfoCard
        group={vm.group}
        isEditable={vm.isEditable}
        onEditGroup={vm.openEditModal}
        onOpenSchedule={vm.openScheduleModal}
        onDeleteGroup={vm.openDeleteModal}
      />

      {vm.isEditable && (
        <Card>
          <CardHeader className='pb-3 flex-row items-center justify-between space-y-0'>
            <CardTitle className='text-base'>سجل المتابعة اليومي</CardTitle>
            <Button onClick={learnersVm.openAddModal} size='sm' className='gap-2'>
              <UserPlus className='w-4 h-4' />
              إضافة طالب جديد
            </Button>
          </CardHeader>
          <CardContent className='space-y-4'>
            <WeekTabs
              weeks={wirdVm.weeks}
              selectedWeekId={wirdVm.selectedWeekId}
              onSelect={wirdVm.setSelectedWeekId}
            />
            <WirdTrackingTable
              rows={wirdVm.trackingRows}
              isLoading={wirdVm.isLoadingWeeks || wirdVm.isLoadingTracking}
              weekId={wirdVm.selectedWeekId ?? ''}
              groupId={groupId}
              userTimezone={vm.group.timezone}
              canManage={true}
              isUpcomingWeek={isSelectedWeekUpcoming}
              staffUserIds={staffUserIds}
              onEditMate={handleEditMate}
              onEditLearner={handleEditLearner}
              onDeleteLearner={handleDeleteLearner}
            />

            {learnersVm.removedMembers.length > 0 && (
              <div className='rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2'>
                <Typography size='sm' weight='semibold' className='text-warning'>
                  الطلاب المحذوفون من الحلقة
                </Typography>
                <div className='flex flex-wrap gap-2'>
                  {learnersVm.removedMembers.map((member) => (
                    <Badge key={member.id} variant='soft' color='warning'>
                      {member.studentName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {vm.isEditModalOpen && (
        <EditGroupModal
          open={vm.isEditModalOpen}
          onOpenChange={vm.closeEditModal}
          group={vm.group}
          staffUsers={vm.staffUsers}
          isLoadingStaff={vm.isLoadingStaff}
          onSubmit={vm.handleUpdateGroup}
          isLoading={vm.isUpdating}
        />
      )}

      <WeeklyScheduleModal
        open={vm.isScheduleModalOpen}
        onOpenChange={vm.closeScheduleModal}
        groupId={groupId}
      />

      <AddGroupLearnersModal
        open={learnersVm.isAddModalOpen}
        onOpenChange={learnersVm.closeAddModal}
        groupId={groupId}
        onSubmit={learnersVm.handleAddLearners}
        isLoading={learnersVm.isAdding}
      />

      <EditMateDialog
        key={learnersVm.memberPendingMateEdit?.id}
        open={!!learnersVm.memberPendingMateEdit}
        onOpenChange={(open) => !open && learnersVm.setMemberPendingMateEdit(null)}
        member={learnersVm.memberPendingMateEdit}
        allMembers={learnersVm.members}
        onConfirm={learnersVm.handleUpdateMate}
        isLoading={learnersVm.isUpdatingMate}
      />

      {learnerForEdit && (
        <StudentMainInfoModal
          open={!!editingLearnerId}
          onOpenChange={(open) => !open && setEditingLearnerId(null)}
          mode='edit'
          learner={{
            id: learnerForEdit.studentId,
            name: learnerForEdit.studentName,
            phone: learnerForEdit.studentPhone,
            timezone: learnerForEdit.studentTimezone,
            contact: {
              notes: learnerForEdit.notes,
              age: learnerForEdit.age,
              platform: learnerForEdit.platform,
              schedule: learnerForEdit.schedule,
              recitation: learnerForEdit.recitation,
            },
            groupCount: undefined,
            groups: undefined,
          }}
          onSubmit={(args) => {
            if (args.mode === 'edit') {
              return learnersVm.handleUpdateLearner(editingLearnerId!, args.data);
            }
          }}
          isLoading={learnersVm.isUpdatingLearner}
        />
      )}

      <WirdRecordingCard groupId={groupId} />

      <ConfirmDialog
        open={vm.isDeleteModalOpen}
        onOpenChange={(open) => !open && vm.closeDeleteModal()}
        onConfirm={() => vm.handleDeleteGroup()}
        title='حذف المجموعة'
        description='هل أنت متأكد من حذف هذه المجموعة؟ سيتم حذف جميع البيانات المرتبطة بها (الأسابيع، الجداول، الطلبات، التنبيهات). لن يتم حذف بيانات الطلاب أنفسهم.'
        intent='destructive'
      />
    </div>
  );
}
