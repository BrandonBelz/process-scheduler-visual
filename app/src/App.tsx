import { useEffect, useState } from "react";
import {
  calculateAllStatistics,
  makePolicyInstance,
  runSimulations,
} from "./core/api";
import { validateWorkload } from "./core/validation";
import ConfigurationView from "./views/ConfigurationView";
import SimulationView, { type SimulationRun } from "./views/SimulationView";
import {
  createDefaultWorkload,
  describePolicy,
  findPolicy,
  toWorkloadInput,
  type WorkloadDraft,
} from "./workloadDraft";
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

    const policy = findPolicy(workload.policyName);
    const config = { ...policy.config, ...validation.policyConfig };
    const instance = makePolicyInstance(policy, 0, config);

    try {
      const results = runSimulations(validation.programs, [instance]);
      const statistics = calculateAllStatistics(results);
      setRun({
        title: describePolicy(policy, config),
        policy,
        processes: results[instance.id],
        statistics: statistics[instance.id],
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
