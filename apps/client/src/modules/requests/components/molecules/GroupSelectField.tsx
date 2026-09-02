import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GroupDto } from '@sahibalquran/shared';

type GroupSelectFieldProps = {
  value: string;
  onChange: (value: string) => void;
  groups: GroupDto[];
  errorMessage?: string;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
};

export function GroupSelectField({
  value,
  onChange,
  groups,
  errorMessage,
  disabled,
  label = 'المجموعة',
  placeholder = 'اختر المجموعة',
}: GroupSelectFieldProps) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={[{ message: errorMessage }]} />
    </Field>
  );
}
