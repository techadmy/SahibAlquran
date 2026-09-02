import { ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { formatDate, type ISODateString, type TimeZoneType } from '@sahibalquran/shared';

type Props = {
  expiresAt: string;
  timezone: TimeZoneType;
};

export function ActiveExcuseNotice({ expiresAt, timezone }: Props) {
  return (
    <Card className='border-warning/40 bg-warning/5'>
      <CardContent className='pt-6'>
        <div className='flex items-center gap-4'>
          <div className='rounded-full bg-warning/10 p-3 shrink-0'>
            <ShieldCheck className='h-6 w-6 text-warning' />
          </div>
          <div className='flex-1 space-y-1'>
            <Typography weight='medium' className='text-warning'>
              لديك عذر نشط
            </Typography>
            <Typography size='sm' className='text-muted-foreground'>
              ينتهي العذر في:{' '}
              <span className='font-medium'>
                {formatDate({
                  date: expiresAt as ISODateString,
                  token: 'dd/MM/yyyy',
                  timezone,
                })}
              </span>
            </Typography>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
