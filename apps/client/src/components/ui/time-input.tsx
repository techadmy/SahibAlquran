import {
  minutesToInputTimeString,
  minutesToTimeString,
  timeStringToMinutes,
} from '@sahibalquran/shared';
import type { TimeMinutes } from '@sahibalquran/shared';
import { Clock } from 'lucide-react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface TimeInputProps {
  value?: number;
  onChange?: (minutes: number | undefined) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  id?: string;
  'aria-invalid'?: boolean;
}

/**
 * Displays time stored as minutes from midnight (0–1439).
 * - Edit mode: styled Input with Clock icon.
 * - Read-only / no onChange: shows Arabic 12h string (e.g. "09:00 ص").
 */
export function TimeInput({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  className,
  id,
  'aria-invalid': ariaInvalid,
}: TimeInputProps) {
  const isReadOnly = readOnly || !onChange;

  if (isReadOnly) {
    return (
      <span className={cn('text-sm', className)}>
        {value != null ? minutesToTimeString(value as TimeMinutes) : '-'}
      </span>
    );
  }

  return (
    <div className={cn('relative w-full', className)}>
      <div className='pointer-events-none absolute inset-y-0 right-3 flex items-center'>
        <Clock className='h-4 w-4 text-muted-foreground' />
      </div>
      <Input
        id={id}
        type='time'
        disabled={disabled}
        aria-invalid={ariaInvalid}
        value={value != null && !isNaN(value) ? minutesToInputTimeString(value as TimeMinutes) : ''}
        onChange={(e) => {
          const raw = e.target.value;
          onChange?.(raw ? timeStringToMinutes(raw) : undefined);
        }}
        className='pr-10 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none'
      />
    </div>
  );
}
