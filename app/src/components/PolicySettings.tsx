import { useId } from "react";
import type Policy from "../core/types/policy";
import NumberField from "./NumberField";
import PolicyTags from "./PolicyTags";
import styles from "./PolicySettings.module.css";

interface PolicySettingsProps {
  policies: Policy[];
  policy: Policy;
  config: Record<string, string>;
  errors: Record<string, string>;
  returnControlOnBlock: boolean;
  onSelect: (policyName: string) => void;
  onConfigChange: (field: string, value: string) => void;
  onReturnControlOnBlockChange: (value: boolean) => void;
}

// Picks the policy to run and edits the config fields it reports.
export default function PolicySettings({
  policies,
  policy,
  config,
  errors,
  returnControlOnBlock,
  onSelect,
  onConfigChange,
  onReturnControlOnBlockChange,
}: PolicySettingsProps) {
  const selectId = useId();
  const returnControlOnBlockId = useId();

  return (
    <div className={styles.settings}>
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
        {policy.getConfigFields().map(({ key, label, min, max }) => (
          <NumberField
            key={key}
            label={label}
            value={config[key] ?? ""}
            range={{ min, max }}
            error={errors[key]}
            onChange={(value) => onConfigChange(key, value)}
          />
        ))}
        {!policy.isPreemptive && (
          <div>
            <label htmlFor={returnControlOnBlockId}>
              <input
                id={returnControlOnBlockId}
                type="checkbox"
                checked={returnControlOnBlock}
                onChange={(event) =>
                  onReturnControlOnBlockChange(event.target.checked)
                }
              />
              Return control when a process blocks
            </label>
          </div>
        )}
      </div>
      <PolicyTags policy={policy} />
      <p className={styles.description}>{policy.description}</p>
    </div>
  );
}
