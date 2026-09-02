import { formatDate } from '@sahibalquran/shared';
import type { WeekWithCurrentFlagDto } from '@sahibalquran/shared';
import { Lock } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type WeekTabsProps = {
  weeks: WeekWithCurrentFlagDto[];
  selectedWeekId: string | undefined;
  onSelect: (weekId: string) => void;
};

export function WeekTabs({ weeks, selectedWeekId, onSelect }: WeekTabsProps) {
  if (weeks.length === 0) return null;

  return (
    <div className='pb-1'>
      <TooltipProvider delayDuration={200}>
        <Tabs className='overflow-auto' value={selectedWeekId} onValueChange={onSelect}>
          <TabsList className='h-auto w-max gap-1 p-1'>
            {weeks.map((week) => {
              const trigger = (
                <TabsTrigger
                  key={week.id}
                  value={week.id}
                  disabled={week.isUpcoming}
                  className='flex flex-col items-center gap-0.5 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40'
                >
                  <span className='flex items-center gap-1 text-xs font-semibold'>
                    {week.isUpcoming && <Lock className='h-2.5 w-2.5' />}
                    الأسبوع {week.weekNumber}
                  </span>
                  <span className='text-[10px] text-muted-foreground'>
                    {formatDate({ date: week.startDate, token: 'dd/MM/yyyy' })}
                  </span>
                  {week.isCurrent && <span className='h-1 w-1 rounded-full bg-primary' />}
                </TabsTrigger>
              );

              if (!week.isUpcoming) return trigger;

              return (
                <Tooltip key={week.id}>
                  <TooltipTrigger asChild>
                    <span className='inline-flex'>{trigger}</span>
                  </TooltipTrigger>
                  <TooltipContent side='bottom' className='text-xs'>
                    لم يبدأ هذا الأسبوع بعد
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TabsList>
        </Tabs>
      </TooltipProvider>
    </div>
  );
}
