import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import {
  type ISODateOnlyString,
  type TimeMinutes,
  minutesToInputTimeString,
  timeStringToMinutes,
  parseDateString,
  formatDate,
  formatDateLongArabic,
} from '@sahibalquran/shared';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { Input } from './input';
import { cn } from '@/lib/utils';

type DateTimePickerMode = 'dateTime' | 'dateOnly' | 'timeOnly';

interface DateTimePickerProps {
  mode?: DateTimePickerMode;
  date?: ISODateOnlyString;
  time?: number;
  onDateChange?: (date: ISODateOnlyString) => void;
  onTimeChange?: (time: number) => void;
  onDateBlur?: () => void;
  onTimeBlur?: () => void;
  disabled?: boolean;
  dateLabel?: string;
  timeStep?: number;
  invalid?: boolean;
  disablePastDates?: boolean;
}

export function DateTimePicker({
  mode = 'dateTime',
  date,
  time,
  onDateChange,
  onTimeChange,
  onDateBlur,
  onTimeBlur,
  disabled = false,
  dateLabel = 'اختر التاريخ',
  timeStep = 15,
  invalid = false,
  disablePastDates = false,
}: DateTimePickerProps) {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const selectedDate = date ? parseDateString(date) : undefined;
  const showDate = mode !== 'timeOnly';
  const showTime = mode !== 'dateOnly';

  // DayPicker constructs JS Dates in local time (e.g. 2026-03-15T00:00:00+03:00).
  // Without a timezone, formatDate defaults to UTC and reads the raw UTC offset,
  // which shifts the date by one day for UTC+ users. We must use the browser
  // timezone to extract the correct calendar date.
  const handleDateSelect = (day: Date | undefined) => {
    if (day && onDateChange) {
      const newDateStr = formatDate({
        date: day,
        token: 'yyyy-MM-dd',
        timezone: browserTimezone,
      }) as ISODateOnlyString;
      onDateChange(newDateStr);
    }
    onDateBlur?.();
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeStr = e.target.value;
    if (onTimeChange && timeStr) {
      onTimeChange(timeStringToMinutes(timeStr));
    }
  };

  const displayDate = date ? formatDateLongArabic(date) : dateLabel;

  return (
    <div className='flex flex-col gap-2 sm:flex-row'>
      {showDate ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant='outline'
              color='muted'
              aria-invalid={invalid}
              onBlur={onDateBlur}
              className={cn(
                'w-full justify-start text-right font-normal',
                showTime && 'sm:flex-1',
                !date && 'text-muted-foreground'
              )}
              disabled={disabled}
            >
              <CalendarIcon className='ml-2 h-4 w-4' />
              {displayDate}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='start'>
            <Calendar
              mode='single'
              selected={selectedDate}
              onSelect={handleDateSelect}
              disablePastDates={disablePastDates}
              disabled={disabled}
            />
          </PopoverContent>
        </Popover>
      ) : null}

      {showTime ? (
        <div className={cn('relative w-full', showDate && 'sm:w-48')}>
          <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'>
            <Clock className='h-4 w-4 text-muted-foreground' />
          </div>
          <Input
            type='time'
            value={time !== undefined ? minutesToInputTimeString(time as TimeMinutes) : ''}
            onChange={handleTimeChange}
            onBlur={onTimeBlur}
            aria-invalid={invalid}
            disabled={disabled}
            className='bg-background pr-10 text-right appearance-none [&::-webkit-calendar-picker-indicator]:hidden'
            step={timeStep * 60}
          />
        </div>
      ) : null}
    </div>
  );
}
