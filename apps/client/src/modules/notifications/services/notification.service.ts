import { apiClient } from '@/services';
import type {
  NotificationDto,
  UnreadCountDto,
  CursorPaginatedResult,
  UnifiedApiResponse,
} from '@sahibalquran/shared';

export const notificationService = {
  getNotifications: (
    cursor?: string,
    limit = 15
  ): Promise<UnifiedApiResponse<CursorPaginatedResult<NotificationDto[]>>> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return apiClient.get<CursorPaginatedResult<NotificationDto[]>>(`/notifications?${params}`);
  },

  getUnreadCount: (): Promise<UnifiedApiResponse<UnreadCountDto>> =>
    apiClient.get<UnreadCountDto>('/notifications/unread-count'),

  markAllAsRead: (): Promise<UnifiedApiResponse<void>> =>
    apiClient.patch<void>('/notifications/read-all'),
};
