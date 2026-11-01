import styles from "@/features/settings/SettingsForm.module.css";

interface ToggleFieldProps {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

export function ToggleField({ checked, description, disabled, label, onChange }: ToggleFieldProps) {
  return (
    <label className={styles.toggleField}>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

interface SelectFieldProps {
  description?: string;
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
  value: string;
}

export function SelectField({ description, disabled, label, onChange, options, value }: SelectFieldProps) {
  return (
    <label className={styles.selectField}>
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <select disabled={disabled} onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

interface NumberFieldProps {
  description: string;
  disabled?: boolean;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}

export function NumberField({ description, disabled, label, max, min, onChange, value }: NumberFieldProps) {
  return (
    <label className={styles.selectField}>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        disabled={disabled}
        inputMode="numeric"
        max={max}
        min={min}
        onChange={(event) => {
          const nextValue = event.target.valueAsNumber;
          if (Number.isInteger(nextValue) && nextValue >= min && nextValue <= max) onChange(nextValue);
        }}
        type="number"
        value={value}
      />
    </label>
  );
}
