import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { CreatableCombobox } from '@/components/ui/creatable-combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TIMEZONES } from '@sahibalquran/shared';
import type { AwradType, StaffUserDto } from '@sahibalquran/shared';

export const AWRAD_SUGGESTIONS: AwradType[] = [
  'حفظ',
  'المراجعة (القريبة والبعيدة)',
  'الاستماع (مرتين للمشايخ المتفق عليها)',
];

export const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'نشط' },
  { value: 'INACTIVE', label: 'غير نشط' },
];

export const timezoneOptions = TIMEZONES.map((tz) => ({ value: tz.value, label: tz.label }));

// ─── AwradField ───────────────────────────────────────────────────────────────

type AwradFieldProps = {
  value: AwradType[];
  onChange: (value: AwradType[]) => void;
  errorMessage?: string;
};

export function AwradField({ value, onChange, errorMessage }: AwradFieldProps) {
  return (
    <Field>
      <FieldLabel>الأوراد</FieldLabel>
      <CreatableCombobox
        value={value}
        onChange={onChange}
        suggestions={AWRAD_SUGGESTIONS}
        createLabel={(v) => `إضافة "وِرد" جديد: ${v}`}
      />
      <FieldError errors={[{ message: errorMessage }]} />
    </Field>
  );
}

// ─── ModeratorSelectField ─────────────────────────────────────────────────────

type ModeratorSelectFieldProps = {
  value: string;
  onChange: (value: string) => void;
  staffUsers: StaffUserDto[];
  errorMessage?: string;
  disabled?: boolean;
};

export function ModeratorSelectField({
  value,
  onChange,
  staffUsers,
  errorMessage,
  disabled,
}: ModeratorSelectFieldProps) {
  const moderatorOptions = [
    { value: 'none', label: 'بدون مشرف' },
    ...staffUsers.map((u) => ({ value: u.id, label: u.name })),
  ];

  return (
    <Field>
      <FieldLabel>المشرف</FieldLabel>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder='اختر المشرف' />
        </SelectTrigger>
        <SelectContent>
          {moderatorOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={[{ message: errorMessage }]} />
    </Field>
  );
}
