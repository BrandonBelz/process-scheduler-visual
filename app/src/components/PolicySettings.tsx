import { useId } from "react";
import type Policy from "../core/types/policy";
import type { PolicyErrors } from "../core/validation";
import NumberField from "./NumberField";
import PolicyTags from "./PolicyTags";
import styles from "./PolicySettings.module.css";

interface PolicySettingsProps {
  label: string;
  policies: Policy[];
  policy: Policy;
  config: Record<string, string>;
  errors: PolicyErrors;
  returnControlOnBlock: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: (policyName: string) => void;
  onConfigChange: (field: string, value: string) => void;
  onReturnControlOnBlockChange: (value: boolean) => void;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
}

// Edits one policy instance: its policy, the config fields it reports, and its place in the list.
export default function PolicySettings({
  label,
  policies,
  policy,
  config,
  errors,
  returnControlOnBlock,
  canMoveUp,
  canMoveDown,
  onSelect,
  onConfigChange,
  onReturnControlOnBlockChange,
  onMove,
  onRemove,
}: PolicySettingsProps) {
  const selectId = useId();

  return (
    <fieldset className={styles.settings}>
      <legend className={styles.label}>{label}</legend>
      <div className={styles.fields}>
        <div className={styles.select}>
          <label htmlFor={selectId}>Scheduling policy</label>
          <select
            id={selectId}
            value={policy.name}
            onChange={(event) => onSelect(event.target.value)}
          >
            {policies.map(({ name }) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        {policy.getConfigFields().map(({ key, label, description, min, max }) => (
          <NumberField
            key={key}
            label={label}
            description={description}
            value={config[key] ?? ""}
            range={{ min, max }}
            error={errors[key]}
            onChange={(value) => onConfigChange(key, value)}
          />
        ))}
        {!policy.isPreemptive && (
          <label
            className={styles.toggle}
            title="Return control to the scheduler when the running process blocks for I/O."
          >
            <input
              type="checkbox"
              checked={returnControlOnBlock}
              onChange={(event) =>
                onReturnControlOnBlockChange(event.target.checked)
              }
            />
            Return on block
          </label>
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
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
          >
            Remove
          </button>
        </div>
      </div>
      <PolicyTags policy={policy} />
      <p className={styles.description}>{policy.description}</p>
    </fieldset>
  );
}
