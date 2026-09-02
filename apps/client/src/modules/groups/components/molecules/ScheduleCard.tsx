import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import type { ScheduleImageDto } from '@sahibalquran/shared';

type Props = {
  scheduleImage: ScheduleImageDto;
};

export function ScheduleCard({ scheduleImage }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <CardHeader
        className='cursor-pointer select-none pb-3'
        onClick={() => setIsExpanded((v) => !v)}
      >
        <div className='flex items-center gap-3'>
          <div className='w-14 h-14 rounded-lg overflow-hidden border shrink-0 bg-muted'>
            <img
              src={scheduleImage.imageUrl}
              alt={scheduleImage.name}
              className='w-full h-full object-cover'
            />
          </div>
          <div className='flex-1 min-w-0'>
            <Typography weight='medium' size='sm' className='truncate'>
              جدول الحلقة
            </Typography>
            <Typography size='xs' className='text-muted-foreground'>
              انقر لتوسيع الصورة
            </Typography>
          </div>
          <Button
            variant='ghost'
            size='icon'
            className='shrink-0 text-muted-foreground'
            tabIndex={-1}
          >
            {isExpanded ? <ChevronUp className='h-5 w-5' /> : <ChevronDown className='h-5 w-5' />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className='pt-0'>
          <img
            src={scheduleImage.imageUrl}
            alt={scheduleImage.name}
            className='w-full max-w-md mx-auto rounded-xl border object-contain'
          />
        </CardContent>
      )}
    </Card>
  );
}
