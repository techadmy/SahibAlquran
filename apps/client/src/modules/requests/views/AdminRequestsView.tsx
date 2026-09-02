import { useState, useEffect } from 'react';
import { Loader2, ClipboardList } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useApp } from '@/contexts/AppContext';
import { RequestsTable } from '../components/organisms/RequestsTable';
import { useRequestsViewModel } from '../viewmodels/requests.viewmodel';
import type { RequestStatus, TimeZoneType } from '@sahibalquran/shared';

export function AdminRequestsView() {
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<RequestStatus | 'ALL'>('ALL');

  const vm = useRequestsViewModel(activeTab === 'ALL' ? undefined : activeTab);
  // stats always from all-tab query for counts
  const allVm = useRequestsViewModel();

  // Reset page to 1 when tab changes
  useEffect(() => {
    vm.setPage(1);
  }, [activeTab]);

  return (
    <div className='container max-w-7xl mx-auto p-6'>
      <div className='flex flex-col gap-6'>
        <div className='flex items-center gap-2'>
          <ClipboardList className='h-6 w-6 text-primary' />
          <div>
            <Typography as='h1' size='2xl' weight='bold'>
              إدارة الطلبات
            </Typography>
            <Typography size='sm' className='text-muted-foreground'>
              مراجعة وقبول أو رفض طلبات الطلاب
            </Typography>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className='w-full grid grid-cols-4'>
            <TabsTrigger value='ALL'>
              الكل
              {allVm.stats && (
                <Badge variant='soft' color='muted' className='mr-1.5'>
                  {allVm.stats.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value='PENDING'>
              قيد المراجعة
              {allVm.stats && (
                <Badge variant='soft' color='warning' className='mr-1.5'>
                  {allVm.stats.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value='ACCEPTED'>
              مقبول
              {allVm.stats && (
                <Badge variant='soft' color='success' className='mr-1.5'>
                  {allVm.stats.accepted}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value='REJECTED'>
              مرفوض
              {allVm.stats && (
                <Badge variant='soft' color='danger' className='mr-1.5'>
                  {allVm.stats.rejected}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className='mt-4 space-y-4'>
            <div className='bg-card border rounded-lg shadow-sm overflow-hidden overflow-x-auto'>
              {vm.isLoading ? (
                <div className='flex justify-center py-12'>
                  <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                </div>
              ) : (
                <div className='min-w-max mx-auto [&_th]:text-center [&_td]:text-center'>
                  <RequestsTable
                    requests={vm.requests}
                    userTimezone={(user?.timezone ?? 'Asia/Riyadh') as TimeZoneType}
                    onAccept={vm.handleAccept}
                    onReject={vm.handleReject}
                    isReviewing={vm.isReviewing}
                    showActions={activeTab === 'ALL' || activeTab === 'PENDING'}
                  />
                </div>
              )}
            </div>

            <PaginationControls
              value={vm.page}
              totalPages={vm.totalPages}
              onValueChange={vm.setPage}
              disabled={vm.isLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
