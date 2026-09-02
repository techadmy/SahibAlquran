import type { ISODateString, NotificationDto } from '@sahibalquran/shared';
import { formatRelativeTime } from '@sahibalquran/shared';
import { Typography } from '@/components/ui/typography';
import { useNavigate } from 'react-router-dom';
import {
  getNotificationMessage,
  getNotificationIcon,
  getNotificationPath,
} from '../utils/notification.util';

interface NotificationItemProps {
  notification: NotificationDto;
  onClose: () => void;
}

interface NotificationItemProps {
  notification: NotificationDto;
  onClose: () => void;
}

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const navigate = useNavigate();
  const Icon = getNotificationIcon(notification);
  const isUnread = !notification.readAt;

  // Enhanced color schemes with gradients
  const colorScheme = {
    ALERT_ASSIGNED: {
      bg: 'bg-linear-to-br from-amber-500/10 to-amber-600/5',
      icon: 'text-amber-600',
      ring: 'ring-amber-500/30',
    },
    LEARNER_DEACTIVATED: {
      bg: 'bg-linear-to-br from-red-500/10 to-red-600/5',
      icon: 'text-red-600',
      ring: 'ring-red-500/30',
    },
    LEARNER_REACTIVATED: {
      bg: 'bg-linear-to-br from-green-500/10 to-green-600/5',
      icon: 'text-green-600',
      ring: 'ring-green-500/30',
    },
    LEARNER_REMOVED: {
      bg: 'bg-linear-to-br from-red-500/10 to-red-600/5',
      icon: 'text-red-600',
      ring: 'ring-red-500/30',
    },
    REQUEST_CREATED: {
      bg: 'bg-linear-to-br from-blue-500/10 to-blue-600/5',
      icon: 'text-blue-600',
      ring: 'ring-blue-500/30',
    },
    REQUEST_UPDATED:
      (notification.payload as Record<string, unknown>).status === 'ACCEPTED'
        ? {
            bg: 'bg-linear-to-br from-green-500/10 to-green-600/5',
            icon: 'text-green-600',
            ring: 'ring-green-500/30',
          }
        : {
            bg: 'bg-linear-to-br from-red-500/10 to-red-600/5',
            icon: 'text-red-600',
            ring: 'ring-red-500/30',
          },
  }[notification.type] || {
    bg: 'bg-linear-to-br from-muted to-muted/50',
    icon: 'text-muted-foreground',
    ring: 'ring-muted',
  };

  const handleClick = () => {
    const path = getNotificationPath(notification);
    if (path) {
      navigate(path);
      onClose();
    }
  };

  return (
    <button
      type='button'
      className={`
        group relative flex items-start gap-2.5 w-full px-3 py-2.5 text-right transition-all duration-200
        border-b border-border/40 last:border-0
        hover:bg-linear-to-l hover:from-primary/8 hover:to-transparent hover:shadow-sm
        active:scale-[0.98]
        ${isUnread ? 'bg-linear-to-br from-primary/6 to-transparent shadow-xs' : ''}
      `}
      onClick={handleClick}
    >
      {/* Icon with colored background and glow effect */}
      <div
        className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${colorScheme.bg} ring-1 ${colorScheme.ring} transition-all duration-200 group-hover:scale-110 group-hover:shadow-md`}
      >
        <Icon className={`w-4.5 h-4.5 ${colorScheme.icon}`} strokeWidth={2.5} />
      </div>

      {/* Content */}
      <div className='flex-1 min-w-0 space-y-0.5'>
        <Typography
          as='p'
          size='sm'
          className={`leading-snug ${isUnread ? 'font-semibold text-foreground' : 'font-normal text-foreground/90'}`}
        >
          {getNotificationMessage(notification)}
        </Typography>
        <Typography as='span' size='xs' className='text-muted-foreground/80'>
          {formatRelativeTime(notification.createdAt as ISODateString)}
        </Typography>
      </div>

      {/* Unread indicator with pulse */}
      {isUnread && (
        <div className='shrink-0 mt-1.5'>
          <div className='relative flex items-center justify-center w-5 h-5'>
            <div className='w-2 h-2 rounded-full bg-primary shadow-sm' />
            <div className='absolute w-2 h-2 rounded-full bg-primary animate-ping opacity-60' />
          </div>
        </div>
      )}
    </button>
  );
}
