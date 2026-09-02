import { cva, type VariantProps } from 'class-variance-authority';
import { Users, Globe, Pencil } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ReadSourceType, WirdStatus } from '@sahibalquran/shared';

const cellVariants = cva(
  'relative inline-flex size-6 items-center justify-center rounded-md text-xs font-medium transition-colors',
  {
    variants: {
      status: {
        ATTENDED: 'bg-success text-success-foreground',
        MISSED: 'bg-destructive text-destructive-foreground',
        LATE: 'bg-warning text-warning-foreground',
        FUTURE: 'bg-muted text-muted-foreground',
        EMPTY: 'border border-border bg-transparent text-muted-foreground',
      },
    },
    defaultVariants: { status: 'EMPTY' },
  }
);

type WirdStatusCellProps = VariantProps<typeof cellVariants> & {
  status: WirdStatus;
  readSource?: ReadSourceType;
  readOnMateName?: string;
  className?: string;
};

type ReadSourceBadge = { Icon: LucideIcon; bg: string; tooltip: string };

function getReadSourceBadge(
  readSource: ReadSourceType | undefined,
  readOnMateName: string | undefined
): ReadSourceBadge | null {
  if (readSource === 'MANUAL') {
    return { Icon: Pencil, bg: 'bg-warning text-warning-foreground', tooltip: 'تم التعديل يدوياً' };
  }
  if (readSource === 'DIFFERENT_GROUP_MATE') {
    return {
      Icon: Users,
      bg: 'bg-primary text-primary-foreground',
      tooltip: `سُمع على: ${readOnMateName ?? ''}`,
    };
  }
  if (readSource === 'OUTSIDE_GROUP') {
    return { Icon: Globe, bg: 'bg-warning text-warning-foreground', tooltip: 'سُمع خارج المجموعة' };
  }
  return null;
}

export function WirdStatusCell({
  status,
  readSource,
  readOnMateName,
  className,
}: WirdStatusCellProps) {
  const badge = getReadSourceBadge(readSource, readOnMateName);

  const content = (
    <div className={cn(cellVariants({ status }), className)}>
      {badge && (
        <span
          className={cn(
            'absolute -top-1 -end-1 flex h-3.5 w-3.5 items-center justify-center rounded-full shadow-sm',
            badge.bg
          )}
        >
          <badge.Icon className='h-2 w-2' />
        </span>
      )}
    </div>
  );

  if (badge) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side='top' className='text-xs'>
            {badge.tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
