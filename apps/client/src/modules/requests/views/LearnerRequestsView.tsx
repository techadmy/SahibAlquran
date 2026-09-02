import { useState } from 'react';
import { FileText, UserCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { useApp } from '@/contexts/AppContext';
import { ExcuseRequestModal } from '../components/organisms/ExcuseRequestModal';
import { ActivationRequestModal } from '../components/organisms/ActivationRequestModal';
import { RequestsTable } from '../components/organisms/RequestsTable';
import { useMyRequestsViewModel } from '../viewmodels/requests.viewmodel';
import type { TimeZoneType } from '@sahibalquran/shared';

export function LearnerRequestsView() {
  const { user } = useApp();
  const vm = useMyRequestsViewModel();
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);

  const hasPendingExcuse = vm.requests.some((r) => r.type === 'EXCUSE' && r.status === 'PENDING');
  const hasPendingActivation = vm.requests.some(
    (r) => r.type === 'ACTIVATION' && r.status === 'PENDING'
  );

  return (
    <div className='container max-w-6xl mx-auto p-6'>
      <div className='flex flex-col gap-6'>
        <div className='flex items-center justify-between'>
          <div>
            <Typography as='h1' size='2xl' weight='bold'>
              طلباتي
            </Typography>
            <Typography size='sm' className='text-muted-foreground'>
              إدارة طلبات العذر والتفعيل
            </Typography>
          </div>

          <div className='flex gap-2'>
            <Button
              color='warning'
              disabled={hasPendingExcuse}
              title={hasPendingExcuse ? 'لديك طلب عذر قيد المراجعة' : undefined}
              onClick={() => setIsExcuseModalOpen(true)}
            >
              <FileText className='h-4 w-4' />
              طلب عذر
            </Button>
            <Button
              color='primary'
              disabled={hasPendingActivation}
              title={hasPendingActivation ? 'لديك طلب تفعيل قيد المراجعة' : undefined}
              onClick={() => setIsActivationModalOpen(true)}
            >
              <UserCheck className='h-4 w-4' />
              طلب تفعيل
            </Button>
          </div>
        </div>

        <div className='bg-card border rounded-lg shadow-sm overflow-hidden'>
          {vm.isLoading ? (
            <div className='flex justify-center py-12'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          ) : (
            <RequestsTable
              requests={vm.requests}
              userTimezone={(user?.timezone ?? 'Asia/Riyadh') as TimeZoneType}
              showActions={false}
            />
          )}
        </div>
      </div>

      <ExcuseRequestModal open={isExcuseModalOpen} onOpenChange={setIsExcuseModalOpen} />
      <ActivationRequestModal
        open={isActivationModalOpen}
        onOpenChange={setIsActivationModalOpen}
      />
    </div>
  );
}
