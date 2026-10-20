import { useId } from "react";
import type { NumberRange } from "../core/validation";
import styles from "./NumberField.module.css";

interface NumberFieldProps {
  label: string;
  value: string;
  range?: NumberRange;
  error?: string;
  onChange: (value: string) => void;
}

// A text input for whole numbers that shows its allowed range and any validation error.
export default function NumberField({
  label,
  value,
  range,
  error,
  onChange,
}: NumberFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label}
        {range && (
          <span className={styles.range}>
            {" "}
            ({range.min}–{range.max})
          </span>
        )}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={value}
        aria-invalid={error !== undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <span id={errorId} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
