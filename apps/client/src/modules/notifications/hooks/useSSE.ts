import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { NotificationDto } from '@sahibalquran/shared';
import { queryKeys } from '@/lib/query-client';
import { NOTIFICATION_QUERY_INVALIDATION_MAP } from '../utils/notification.util';

function getStreamUrl(token: string): string {
  const base =
    import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
  return `${base}/notifications/stream?token=${encodeURIComponent(token)}`;
}

/**
 * SSE hook for real-time notifications
 * Purpose: Invalidate React Query caches when notifications arrive
 * Does NOT store notification data - just triggers refetch
 */
export function useSSE({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem('sahibalquran_token');
    if (!token) return;

    let eventSource: EventSource | null = null;
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      eventSource = new EventSource(getStreamUrl(token));

      eventSource.onmessage = (event) => {
        try {
          const notification: NotificationDto = JSON.parse(event.data);

          // Invalidate notification queries (React Query will refetch)
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

          // Invalidate type-specific queries
          const keysToInvalidate = NOTIFICATION_QUERY_INVALIDATION_MAP[notification.type];
          keysToInvalidate?.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        } catch {
          // Ignore parse errors
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        // Retry connection after 5 seconds
        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      eventSource?.close();
      clearTimeout(reconnectTimeoutRef.current);
    };
  }, [enabled, queryClient]);
}
