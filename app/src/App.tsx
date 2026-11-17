import { useEffect, useState } from "react";
import {
  calculateAllStatistics,
  labelPolicyInstances,
  makePolicyInstance,
  runSimulations,
} from "./core/api";
import { validateWorkload } from "./core/validation";
import {
  createDefaultWorkload,
  findPolicy,
  toWorkloadInput,
  type WorkloadDraft,
} from "./utils/workloadDraft";
import ConfigurationView from "./views/ConfigurationView";
import SimulationView, { type SimulationRun } from "./views/SimulationView";
import "./App.css";

function App() {
  const [workload, setWorkload] = useState<WorkloadDraft>(
    createDefaultWorkload,
  );
  const [run, setRun] = useState<SimulationRun>();
  const [runError, setRunError] = useState<string>();

  const validation = validateWorkload(toWorkloadInput(workload));

  // Each view opens at the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [run]);

  // Recomputes from the current configuration every time the simulation opens (FR-005).
  function handleRun() {
    if (!validation.valid) return;

    // Instance IDs follow list position; every instance runs the same programs (FR-006).
    const instances = workload.policies.map((draft, index) => {
      const policy = findPolicy(draft.policyName);
      const config = { ...policy.config, ...validation.policyConfigs[index] };
      return makePolicyInstance(policy, index, config);
    });
    const titles = labelPolicyInstances(instances);

    try {
      const results = runSimulations(validation.programs, instances);
      const statistics = calculateAllStatistics(results);
      setRun({
        instances: instances.map((instance, index) => ({
          id: instance.id,
          title: titles[index],
          policy: instance,
          processes: results[instance.id].processes,
          policyStateHistory: results[instance.id].policyStateHistory,
          statistics: statistics[instance.id],
        })),
      });
      setRunError(undefined);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error));
    }
  }

  // An earlier failure no longer describes the workload once it is edited.
  function handleChange(nextWorkload: WorkloadDraft) {
    setWorkload(nextWorkload);
    setRunError(undefined);
  }

  return (
    <main className="app">
      {run ? (
        <SimulationView run={run} onBack={() => setRun(undefined)} />
      ) : (
        <ConfigurationView
          workload={workload}
          errors={validation.valid ? undefined : validation.errors}
          runError={runError}
          onChange={handleChange}
          onRun={handleRun}
        />
      )}
    </main>
  );
}

export default App;
