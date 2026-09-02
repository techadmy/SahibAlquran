import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/lib/hooks/useApiQuery';
import { useApiMutation } from '@/lib/hooks/useApiMutation';
import { queryKeys } from '@/lib/query-client';
import { notificationService } from '../services/notification.service';
import { useSSE } from './useSSE';
import type { NotificationDto } from '@sahibalquran/shared';
import { toast } from 'sonner';

export function useNotificationsViewModel(isAuthenticated: boolean) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useSSE({ enabled: isAuthenticated });

  const unreadCountQuery = useApiQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => notificationService.getUnreadCount(),
    enabled: isAuthenticated,
  });

  const listQuery = useApiQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => notificationService.getNotifications(),
    enabled: isAuthenticated && isOpen,
  });

  // Sync list query to local state (safe effect with proper dependencies)
  // ResponseInterceptor flattens paginated responses: { success: true, data: T[], meta: {...} }
  const latestDataRef = useRef<typeof listQuery.data>(null);
  if (listQuery.data !== latestDataRef.current) {
    latestDataRef.current = listQuery.data;
    if (listQuery.data && 'data' in listQuery.data && 'meta' in listQuery.data) {
      const response = listQuery.data as unknown as {
        data: NotificationDto[];
        meta: { nextCursor: string | null; hasMore: boolean };
      };
      setNotifications(response.data);
      setNextCursor(response.meta.nextCursor);
      setHasMore(response.meta.hasMore);
    }
  }

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const response = await notificationService.getNotifications(nextCursor);
      if ('data' in response && 'meta' in response) {
        const typed = response as unknown as {
          data: NotificationDto[];
          meta: { nextCursor: string | null; hasMore: boolean };
        };
        setNotifications((prev) => [...prev, ...typed.data]);
        setNextCursor(typed.meta.nextCursor);
        setHasMore(typed.meta.hasMore);
      }
    } catch {
      toast.error('حدث خطأ في تحميل الإشعارات');
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore]);

  const markAllAsReadMutation = useApiMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
    },
  });

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    // Don't clear notifications - keep showing previous ones while refetching
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });

    // Auto mark all as read when opening if there are unread notifications
    const unreadCount = unreadCountQuery.data?.data?.count ?? 0;
    if (unreadCount > 0) {
      markAllAsReadMutation.mutate(undefined);
    }
  }, [queryClient, unreadCountQuery.data, markAllAsReadMutation]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    handleOpen,
    handleClose,
    notifications,
    hasMore,
    isLoadingMore,
    loadMore,
    isLoading: listQuery.isLoading,
    unreadCount: unreadCountQuery.data?.data?.count ?? 0,
  };
}
