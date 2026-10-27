import { PROGRAM_FIELD_LIMITS, type ProgramErrors } from "../core/validation";
import type { ProgramDraft } from "../utils/workloadDraft";
import NumberField from "./NumberField";
import styles from "./ProgramEditor.module.css";

interface ProgramEditorProps {
  label: string;
  program: ProgramDraft;
  errors: ProgramErrors;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (changes: Partial<ProgramDraft>) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
}

// Edits one program's CPU work, arrival, and optional I/O, with reorder and remove controls.
export default function ProgramEditor({
  label,
  program,
  errors,
  canMoveUp,
  canMoveDown,
  onChange,
  onMove,
  onRemove,
}: ProgramEditorProps) {
  return (
    <fieldset className={styles.program}>
      <legend className={styles.label}>{label}</legend>
      <NumberField
        label="CPU cycles"
        value={program.executionTime}
        range={PROGRAM_FIELD_LIMITS.executionTime}
        error={errors.executionTime}
        onChange={(executionTime) => onChange({ executionTime })}
      />
      <NumberField
        label="Arrives at"
        value={program.arrivalTime}
        range={PROGRAM_FIELD_LIMITS.arrivalTime}
        error={errors.arrivalTime}
        onChange={(arrivalTime) => onChange({ arrivalTime })}
      />
      <label className={styles.ioToggle}>
        <input
          type="checkbox"
          checked={program.ioEnabled}
          onChange={(event) => onChange({ ioEnabled: event.target.checked })}
        />
        I/O
      </label>
      {program.ioEnabled && (
        <>
          <NumberField
            label="I/O every"
            value={program.ioInterval}
            range={PROGRAM_FIELD_LIMITS.ioInterval}
            error={errors.ioInterval}
            onChange={(ioInterval) => onChange({ ioInterval })}
          />
          <NumberField
            label="I/O length"
            value={program.ioLength}
            range={PROGRAM_FIELD_LIMITS.ioLength}
            error={errors.ioLength}
            onChange={(ioLength) => onChange({ ioLength })}
          />
        </>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={!canMoveUp}
          aria-label={`Move ${label} up`}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={!canMoveDown}
          aria-label={`Move ${label} down`}
        >
          ↓
        </button>
        <button type="button" onClick={onRemove}>
          Remove
        </button>
      </div>
    </fieldset>
  );
}
