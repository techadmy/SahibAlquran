'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import type { Matcher } from 'react-day-picker';
import { formatDateLongArabic, type ISODateOnlyString } from '@sahibalquran/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Matches every day that is NOT Saturday (weekday 6 in react-day-picker) */
const NON_SATURDAY_MATCHER: Matcher = { dayOfWeek: [0, 1, 2, 3, 4, 5] };

type SaturdayDatePickerProps = {
  value?: ISODateOnlyString;
  onChange: (value: ISODateOnlyString | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * A reusable date picker that only allows selecting Saturdays.
 * Uses our existing Calendar + Popover primitives.
 */
export function SaturdayDatePicker({
  value,
  onChange,
  placeholder = 'اختر تاريخ السبت',
  className,
  disabled,
}: SaturdayDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    const [y, m, d] = value.split('-').map(Number);
    // eslint-disable-next-line no-restricted-syntax
    return new Date(y, m - 1, d);
  }, [value]);

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onChange(undefined);
      setOpen(false);
      return;
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}` as ISODateOnlyString);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          disabled={disabled}
          className={cn(
            'w-full justify-between text-right font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          {value ? formatDateLongArabic(value) : placeholder}
          <CalendarIcon className='h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Calendar
          mode='single'
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={NON_SATURDAY_MATCHER}
          disablePastDates
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
