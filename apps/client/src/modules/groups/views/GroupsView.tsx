import { Link } from 'react-router-dom';
import { BookOpen, GraduationCap, Loader2, Plus, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Typography } from '@/components/ui/typography';
import type { GroupDto, GroupStatus } from '@sahibalquran/shared';
import { GroupStatusBadge } from '../components/atoms/GroupStatusBadge';
import { StatsCountCard } from '../components/molecules/StatsCountCard';
import { CreateGroupModal } from '../components/organisms/CreateGroupModal';
import { useGroupsViewModel } from '../viewmodels/groups.viewmodel';

const STATUS_LABELS: Record<GroupStatus, string> = {
  ACTIVE: 'المجموعات النشطة',
  INACTIVE: 'المجموعات الموقوفة',
};

const STATUS_ORDER: GroupStatus[] = ['ACTIVE', 'INACTIVE'];

const arabicGroupNameCollator = new Intl.Collator('ar', {
  sensitivity: 'base',
  numeric: true,
});

function sortGroupsByArabicName(groups: GroupDto[]): GroupDto[] {
  return [...groups].sort((a, b) => arabicGroupNameCollator.compare(a.name, b.name));
}

function groupsByStatus(groups: GroupDto[]) {
  return STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    groups: sortGroupsByArabicName(groups.filter((g) => g.status === status)),
  }));
}

export default function GroupsView() {
  const vm = useGroupsViewModel();

  if (vm.isLoadingGroups) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );
  }

  if (vm.groupsError) {
    return (
      <Alert alertType='ERROR'>
        <AlertDescription>{vm.groupsError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Stats summary */}
      {!vm.isStudent ? (
        <section className='space-y-2 rounded-xl border border-primary/20 bg-linear-to-l from-primary/5 via-background to-success/5 p-3 md:space-y-3 md:rounded-2xl md:p-4'>
          <div className='flex flex-wrap items-center justify-between gap-1'>
            <Typography as='h2' size='sm' weight='semibold' className='md:text-lg'>
              ملخص المجموعات
            </Typography>
            <Typography as='div' size='xs' className='text-muted-foreground hidden sm:block'>
              إحصائيات مباشرة عن الطلاب والمجموعات
            </Typography>
          </div>
          <div className='grid grid-cols-3 gap-1.5 md:gap-4'>
            <StatsCountCard
              icon={GraduationCap}
              data={{ count: vm.learnersCount, title: 'إجمالي الطلاب' }}
              isLoading={vm.isLoadingStats}
              className='bg-linear-to-br from-primary/15 via-primary/5 to-background border-primary/30 ring-primary/20'
              iconClassName='bg-primary/15 text-primary'
            />
            <StatsCountCard
              icon={Users}
              data={{ count: vm.moderatorsCount, title: 'إجمالي المشرفين' }}
              isLoading={vm.isLoadingStats}
              className='bg-linear-to-br from-success/15 via-success/5 to-background border-success/30 ring-success/20'
              iconClassName='bg-success/15 text-success'
            />
            <StatsCountCard
              icon={BookOpen}
              data={{ count: vm.groupsCount, title: 'إجمالي المجموعات' }}
              isLoading={vm.isLoadingStats}
              className='bg-card border-border ring-border'
              iconClassName='bg-muted/70 text-muted-foreground'
            />
          </div>
        </section>
      ) : null}

      <PageHeader
        title='المجموعات'
        description='إدارة حلقات الأوراد'
        actions={
          vm.canManageGroups ? (
            <Button onClick={() => vm.setIsCreateModalOpen(true)} className='gap-2'>
              <Plus className='h-4 w-4' />
              إضافة مجموعة
            </Button>
          ) : null
        }
      />

      <div className='h-px bg-border' />

      {groupsByStatus(vm.groups).map(({ status, label, groups }) => (
        <section key={status} className='space-y-4'>
          <div className='flex items-center gap-2'>
            <Typography as='h2' size='lg' weight='semibold'>
              {label}
            </Typography>
            <Typography as='span' size='sm' className='text-muted-foreground'>
              ({groups.length})
            </Typography>
          </div>

          {groups.length > 0 ? (
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {groups.map((group) => (
                <Link
                  key={group.id}
                  to={`/groups/${group.id}`}
                  className='block transition-shadow hover:shadow-md h-full'
                >
                  <Card className='h-full flex flex-col'>
                    <CardContent className='space-y-2 p-3 flex-1 flex flex-col md:space-y-3 md:p-4'>
                      <div className='flex items-start justify-between'>
                        <div className='rounded-md bg-primary/10 p-1.5 md:rounded-lg md:p-2'>
                          <Users className='h-4 w-4 text-primary md:h-5 md:w-5' />
                        </div>
                        <GroupStatusBadge status={group.status} />
                      </div>

                      <Typography
                        as='h3'
                        size='md'
                        weight='semibold'
                        className='line-clamp-1 md:text-lg'
                      >
                        {group.name}
                      </Typography>

                      {group.description && (
                        <div className='rounded-md bg-muted/50 px-2 py-1.5 border-s-2 border-primary/30 md:px-3 md:py-2 md:min-h-14'>
                          <Typography
                            as='p'
                            size='xs'
                            className='text-muted-foreground italic leading-relaxed line-clamp-2'
                          >
                            {group.description}
                          </Typography>
                        </div>
                      )}

                      <div className='space-y-1 flex-1 md:space-y-1.5'>
                        <div className='flex items-center justify-between'>
                          <Typography as='div' size='xs' className='text-muted-foreground'>
                            الطلاب
                          </Typography>
                          <Typography as='div' size='xs' weight='medium'>
                            {group.memberCount}
                          </Typography>
                        </div>

                        <div className='flex items-center justify-between'>
                          <Typography as='div' size='xs' className='text-muted-foreground'>
                            الأسابيع
                          </Typography>
                          <Typography as='div' size='xs' weight='medium'>
                            {group.weekCount}
                          </Typography>
                        </div>

                        {group.moderatorName ? (
                          <div className='flex items-center justify-between gap-2'>
                            <Typography
                              as='div'
                              size='xs'
                              className='text-muted-foreground shrink-0'
                            >
                              المشرف
                            </Typography>
                            <Typography
                              as='div'
                              size='xs'
                              weight='medium'
                              className='truncate text-end'
                            >
                              {group.moderatorName}
                            </Typography>
                          </div>
                        ) : null}

                        {group.awrad.length > 0 ? (
                          <div className='border-t border-border pt-1'>
                            <div className='flex flex-wrap gap-1'>
                              {group.awrad.map((w) => (
                                <Badge
                                  key={w}
                                  variant='soft'
                                  color='muted'
                                  className='text-xs px-1.5 py-0'
                                >
                                  {w}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className='rounded-lg border border-dashed border-border py-8 text-center'>
              <Users className='mx-auto mb-2 h-8 w-8 opacity-30' />
              <Typography as='div' size='sm' className='text-muted-foreground'>
                لا توجد {label}
              </Typography>
            </div>
          )}
        </section>
      ))}

      {vm.isStudent && vm.removedGroups.length > 0 ? (
        <section className='space-y-4'>
          <div className='flex items-center gap-2'>
            <Typography as='h2' size='lg' weight='semibold'>
              المجموعات السابقة
            </Typography>
            <Typography as='span' size='sm' className='text-muted-foreground'>
              ({vm.removedGroups.length})
            </Typography>
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {sortGroupsByArabicName(vm.removedGroups).map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className='block transition-shadow hover:shadow-md h-full'
              >
                <Card className='h-full flex flex-col border-warning/30 bg-warning/5'>
                  <CardContent className='space-y-3 p-4 flex-1 flex flex-col'>
                    <div className='flex items-start justify-between'>
                      <div className='rounded-lg bg-warning/15 p-2'>
                        <Users className='h-5 w-5 text-warning' />
                      </div>
                      <Badge variant='soft' color='warning'>
                        سابقاً
                      </Badge>
                    </div>

                    <Typography as='h3' size='lg' weight='semibold' className='line-clamp-1'>
                      {group.name}
                    </Typography>

                    <Typography as='p' size='xs' className='text-muted-foreground'>
                      عرض للقراءة فقط
                    </Typography>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {vm.groups.length === 0 && (!vm.isStudent || vm.removedGroups.length === 0) ? (
        <div className='py-12 text-center'>
          <Users className='mx-auto mb-3 h-12 w-12 opacity-30' />
          <Typography as='div' size='sm' className='text-muted-foreground'>
            لا توجد حلقات
          </Typography>
        </div>
      ) : null}

      <CreateGroupModal
        open={vm.isCreateModalOpen}
        onOpenChange={vm.setIsCreateModalOpen}
        staffUsers={vm.staffUsers}
        isLoading={vm.isCreating || vm.isLoadingStaff}
        onSubmit={vm.createGroup}
      />
    </div>
  );
}
