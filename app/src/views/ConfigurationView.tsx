import PolicySettings from "../components/PolicySettings";
import ProgramEditor from "../components/ProgramEditor";
import { PROGRAM_COUNT_LIMITS, type WorkloadErrors } from "../core/validation";
import {
  POLICIES,
  createProgramDraft,
  defaultPolicyConfig,
  findPolicy,
  type ProgramDraft,
  type WorkloadDraft,
} from "../workloadDraft";
import styles from "./ConfigurationView.module.css";

interface ConfigurationViewProps {
  workload: WorkloadDraft;
  /** Undefined when the workload is valid and can run. */
  errors?: WorkloadErrors;
  runError?: string;
  onChange: (workload: WorkloadDraft) => void;
  onRun: () => void;
}

export default function ConfigurationView({
  workload,
  errors,
  runError,
  onChange,
  onRun,
}: ConfigurationViewProps) {
  const { programs } = workload;
  const policy = findPolicy(workload.policyName);
  const canAddProgram = programs.length < PROGRAM_COUNT_LIMITS.max;

  function setPrograms(nextPrograms: ProgramDraft[]) {
    onChange({ ...workload, programs: nextPrograms });
  }

  function moveProgram(index: number, offset: -1 | 1) {
    const nextPrograms = [...programs];
    const [moved] = nextPrograms.splice(index, 1);
    nextPrograms.splice(index + offset, 0, moved);
    setPrograms(nextPrograms);
  }

  function selectPolicy(policyName: string) {
    const nextPolicy = findPolicy(policyName);
    onChange({
      ...workload,
      policyName: nextPolicy.name,
      policyConfig: defaultPolicyConfig(nextPolicy),
    });
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
        <h2>Policy</h2>
        <PolicySettings
          policies={POLICIES}
          policy={policy}
          config={workload.policyConfig}
          errors={errors?.policyConfig ?? {}}
          onSelect={selectPolicy}
          onConfigChange={(field, value) =>
            onChange({
              ...workload,
              policyConfig: { ...workload.policyConfig, [field]: value },
            })
          }
        />
      </section>

      <section>
        <h2>Processes</h2>
        <ol className={styles.programs}>
          {programs.map((program, index) => (
            <li key={program.key}>
              <ProgramEditor
                label={`P${index}`}
                program={program}
                errors={errors?.programs[index] ?? {}}
                canMoveUp={index > 0}
                canMoveDown={index < programs.length - 1}
                onChange={(changes) =>
                  setPrograms(
                    programs.map((other) =>
                      other.key === program.key
                        ? { ...other, ...changes }
                        : other,
                    ),
                  )
                }
                onMove={(offset) => moveProgram(index, offset)}
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
