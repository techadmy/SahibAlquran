import type { NotificationDto } from '@sahibalquran/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Bell } from 'lucide-react';
import { NotificationItem } from './NotificationItem';
import { NotificationEmptyState } from './NotificationEmptyState';

interface NotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: NotificationDto[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

function NotificationSkeleton() {
  return (
    <div className='flex items-start gap-2.5 px-3 py-2.5 border-b border-border/40 last:border-0'>
      <div className='w-9 h-9 rounded-lg bg-muted animate-pulse shrink-0' />
      <div className='flex-1 space-y-1.5'>
        <div className='h-4 bg-muted animate-pulse rounded w-3/4' />
        <div className='h-3 bg-muted animate-pulse rounded w-1/2' />
      </div>
      <div className='w-2 h-2 rounded-full bg-muted animate-pulse shrink-0 mt-1.5' />
    </div>
  );
}

export function NotificationDialog({
  open,
  onOpenChange,
  notifications,
  isLoading,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: NotificationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md p-0 gap-0 shadow-2xl'>
        {/* Header */}
        <DialogHeader className='px-6 py-5 border-b border-border/50 bg-linear-to-r from-primary/5 to-transparent'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ring-2 ring-primary/20'>
              <Bell className='w-5 h-5 text-primary' />
            </div>
            <DialogTitle className='text-xl font-bold'>الإشعارات</DialogTitle>
          </div>
          <DialogDescription className='sr-only'>قائمة الإشعارات الخاصة بك</DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className='max-h-120 overflow-y-auto'>
          {isLoading ? (
            <>
              <NotificationSkeleton />
              <NotificationSkeleton />
              <NotificationSkeleton />
            </>
          ) : notifications.length === 0 ? (
            <NotificationEmptyState />
          ) : (
            <>
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onClose={() => onOpenChange(false)} />
              ))}
              {hasMore && (
                <div className='flex justify-center py-4 border-t border-border/50 bg-muted/30'>
                  <Button
                    variant='outline'
                    color='primary'
                    size='sm'
                    onClick={onLoadMore}
                    disabled={isLoadingMore}
                    className='hover:bg-primary/5'
                  >
                    <Typography as='span' size='sm' weight='medium'>
                      {isLoadingMore ? 'جاري التحميل...' : 'تحميل المزيد'}
                    </Typography>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
