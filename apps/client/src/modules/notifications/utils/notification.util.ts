import type { NotificationDto, NotificationType } from '@sahibalquran/shared';
import { Bell, AlertTriangle, FileText, CheckCircle, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { queryKeys } from '@/lib/query-client';

export function getNotificationMessage(notification: NotificationDto): string {
  const p = notification.payload as Record<string, unknown>;

  switch (notification.type) {
    case 'ALERT_ASSIGNED':
      return `تم تسجيل تنبيه في مجموعة ${p.groupName}`;
    case 'LEARNER_DEACTIVATED':
      return `تم إلغاء تفعيل ${p.studentName} في مجموعة ${p.groupName}`;
    case 'LEARNER_REACTIVATED':
      return `تم تفعيل حسابك في مجموعة ${p.groupName}`;
    case 'LEARNER_REMOVED':
      return `تمت إزالة ${p.studentName} من مجموعة ${p.groupName}`;
    case 'REQUEST_CREATED':
      return `طلب جديد من ${p.studentName} في مجموعة ${p.groupName}`;
    case 'REQUEST_UPDATED':
      return `تم ${p.status === 'ACCEPTED' ? 'قبول' : 'رفض'} طلبك في مجموعة ${p.groupName}`;
    default:
      return 'إشعار جديد';
  }
}

export function getNotificationIcon(notification: NotificationDto): LucideIcon {
  const p = notification.payload as Record<string, unknown>;

  switch (notification.type) {
    case 'ALERT_ASSIGNED':
      return AlertTriangle;
    case 'LEARNER_DEACTIVATED':
      return AlertTriangle;
    case 'LEARNER_REACTIVATED':
      return CheckCircle;
    case 'LEARNER_REMOVED':
      return AlertTriangle;
    case 'REQUEST_CREATED':
      return FileText;
    case 'REQUEST_UPDATED':
      return p.status === 'ACCEPTED' ? CheckCircle : XCircle;
    default:
      return Bell;
  }
}

export function getNotificationPath(notification: NotificationDto): string | null {
  const p = notification.payload as Record<string, unknown>;

  switch (notification.type) {
    case 'ALERT_ASSIGNED':
    case 'LEARNER_DEACTIVATED':
    case 'LEARNER_REACTIVATED':
    case 'LEARNER_REMOVED':
      return p.groupId ? `/groups/${p.groupId}` : '/groups';
    case 'REQUEST_CREATED':
    case 'REQUEST_UPDATED':
      return '/requests';
    default:
      return null;
  }
}

export const NOTIFICATION_QUERY_INVALIDATION_MAP: Record<
  NotificationType,
  readonly (readonly string[])[]
> = {
  ALERT_ASSIGNED: [queryKeys.wirds.all],
  LEARNER_DEACTIVATED: [queryKeys.groups.all],
  LEARNER_REACTIVATED: [queryKeys.groups.all],
  LEARNER_REMOVED: [queryKeys.groups.all, queryKeys.learners.all],
  REQUEST_CREATED: [queryKeys.requests.all],
  REQUEST_UPDATED: [queryKeys.requests.all, queryKeys.requests.myList()],
};
