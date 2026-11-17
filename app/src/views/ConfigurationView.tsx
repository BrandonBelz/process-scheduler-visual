import PolicySettings from "../components/PolicySettings";
import ProgramEditor from "../components/ProgramEditor";
import { numberPolicyNames } from "../core/api";
import {
  POLICY_COUNT_LIMITS,
  PROGRAM_COUNT_LIMITS,
  type WorkloadErrors,
} from "../core/validation";
import {
  POLICIES,
  createPolicyDraft,
  createProgramDraft,
  defaultPolicyConfig,
  findPolicy,
  type PolicyDraft,
  type ProgramDraft,
  type WorkloadDraft,
} from "../utils/workloadDraft";
import styles from "./ConfigurationView.module.css";

interface ConfigurationViewProps {
  workload: WorkloadDraft;
  /** Undefined when the workload is valid and can run. */
  errors?: WorkloadErrors;
  runError?: string;
  onChange: (workload: WorkloadDraft) => void;
  onRun: () => void;
}

// Returns a copy of the list with one item moved by the offset.
function moveItem<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const nextItems = [...items];
  const [moved] = nextItems.splice(index, 1);
  nextItems.splice(index + offset, 0, moved);
  return nextItems;
}

// Returns a copy of the list with the keyed item's changes applied.
function updateItem<T extends { key: string }>(
  items: T[],
  key: string,
  changes: Partial<T>,
): T[] {
  return items.map((item) =>
    item.key === key ? { ...item, ...changes } : item,
  );
}

export default function ConfigurationView({
  workload,
  errors,
  runError,
  onChange,
  onRun,
}: ConfigurationViewProps) {
  const { programs, policies } = workload;
  const canAddProgram = programs.length < PROGRAM_COUNT_LIMITS.max;
  const canAddPolicy = policies.length < POLICY_COUNT_LIMITS.max;
  const policyLabels = numberPolicyNames(
    policies.map(({ policyName }) => policyName),
  );

  function setPrograms(nextPrograms: ProgramDraft[]) {
    onChange({ ...workload, programs: nextPrograms });
  }

  function setPolicies(nextPolicies: PolicyDraft[]) {
    onChange({ ...workload, policies: nextPolicies });
  }

  // Suggests a policy not yet in the list so each addition is a new comparison.
  function addPolicy() {
    const unused = POLICIES.find(
      ({ name }) => !policies.some(({ policyName }) => policyName === name),
    );
    setPolicies([...policies, createPolicyDraft(unused ?? POLICIES[0])]);
  }

  return (
    <form
      className={styles.view}
      onSubmit={(event) => {
        event.preventDefault();
        onRun();
      }}
    >
      <h1>Configure workload</h1>

      <section>
        <h2>Policies</h2>
        <ol className={styles.list}>
          {policies.map((draft, index) => {
            const policy = findPolicy(draft.policyName);
            return (
              <li key={draft.key}>
                <PolicySettings
                  label={policyLabels[index]}
                  policies={POLICIES}
                  policy={policy}
                  config={draft.config}
                  errors={errors?.policies[index] ?? {}}
                  canMoveUp={index > 0}
                  canMoveDown={index < policies.length - 1}
                  onSelect={(policyName) => {
                    const nextPolicy = findPolicy(policyName);
                    setPolicies(
                      updateItem(policies, draft.key, {
                        policyName: nextPolicy.name,
                        config: defaultPolicyConfig(nextPolicy),
                      }),
                    );
                  }}
                  onConfigChange={(field, value) =>
                    setPolicies(
                      updateItem(policies, draft.key, {
                        config: { ...draft.config, [field]: value },
                      }),
                    )
                  }
                  onMove={(offset) =>
                    setPolicies(moveItem(policies, index, offset))
                  }
                  onRemove={() =>
                    setPolicies(
                      policies.filter((other) => other.key !== draft.key),
                    )
                  }
                />
              </li>
            );
          })}
        </ol>
        <div className={styles.addRow}>
          <button type="button" onClick={addPolicy} disabled={!canAddPolicy}>
            Add policy
          </button>
          <span className={styles.hint}>
            {policies.length} of {POLICY_COUNT_LIMITS.max} policies
          </span>
        </div>
        {errors?.policyCount && (
          <p className={styles.error}>{errors.policyCount}</p>
        )}
      </section>

      <section>
        <h2>Processes</h2>
        <ol className={styles.list}>
          {programs.map((program, index) => (
            <li key={program.key}>
              <ProgramEditor
                label={`P${index}`}
                program={program}
                errors={errors?.programs[index] ?? {}}
                canMoveUp={index > 0}
                canMoveDown={index < programs.length - 1}
                onChange={(changes) =>
                  setPrograms(updateItem(programs, program.key, changes))
                }
                onMove={(offset) =>
                  setPrograms(moveItem(programs, index, offset))
                }
                onRemove={() =>
                  setPrograms(
                    programs.filter((other) => other.key !== program.key),
                  )
                }
              />
            </li>
          ))}
        </ol>
        <div className={styles.addRow}>
          <button
            type="button"
            onClick={() => setPrograms([...programs, createProgramDraft()])}
            disabled={!canAddProgram}
          >
            Add process
          </button>
          <span className={styles.hint}>
            {programs.length} of {PROGRAM_COUNT_LIMITS.max} processes
          </span>
        </div>
        {errors?.programCount && (
          <p className={styles.error}>{errors.programCount}</p>
        )}
      </section>

      <div className={styles.runRow}>
        <button
          type="submit"
          className={styles.runButton}
          disabled={errors !== undefined}
        >
          Run simulation
        </button>
        {errors && (
          <span className={styles.hint}>
            Fix the highlighted fields to run.
          </span>
        )}
      </div>
      {runError && (
        <p className={styles.error} role="alert">
          The simulation failed: {runError}
        </p>
      )}
    </form>
  );
}
