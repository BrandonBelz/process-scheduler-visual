import PolicyTags from "../components/PolicyTags";
import ProcessTimeline from "../components/ProcessTimeline";
import ResultsTable from "../components/ResultsTable";
import type Policy from "../core/types/policy";
import type Process from "../core/types/process";
import type { Statistic } from "../core/types/statistic";
import styles from "./SimulationView.module.css";

export interface SimulationRun {
  title: string;
  policy: Policy;
  processes: Process[];
  statistics: Statistic[];
}

interface SimulationViewProps {
  run: SimulationRun;
  onBack: () => void;
}

export default function SimulationView({ run, onBack }: SimulationViewProps) {
  return (
    <>
      <button type="button" onClick={onBack}>
        ← Back to configuration
      </button>
      <header className={styles.header}>
        <h1>{run.title}</h1>
        <PolicyTags policy={run.policy} />
      </header>
      <ProcessTimeline processes={run.processes} />
      <h2>Results</h2>
      <ResultsTable statistics={run.statistics} />
    </>
  );
}
