import { useState } from "react";
import ComparisonTable from "../components/ComparisonTable";
import PolicyOverview from "../components/PolicyOverview";
import PolicyTags from "../components/PolicyTags";
import ProcessTimeline from "../components/ProcessTimeline";
import ResultsTable from "../components/ResultsTable";
import type Policy from "../core/types/policy";
import type Process from "../core/types/process";
import type { Statistic } from "../core/types/statistic";
import type { SimulationResult } from "../core/api";
import styles from "./SimulationView.module.css";

/** One policy instance's results, labeled for display. */
export interface InstanceRun {
  id: number;
  title: string;
  policy: Policy;
  processes: Process[];
  policyStateHistory?: SimulationResult["policyStateHistory"];
  statistics: Statistic[];
}

export interface SimulationRun {
  /** In configuration order. */
  instances: InstanceRun[];
}

type SimulationTab = "timeline" | "comparison";

const TABS: { id: SimulationTab; label: string }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "comparison", label: "Comparison" },
];

interface SimulationViewProps {
  run: SimulationRun;
  onBack: () => void;
}

export default function SimulationView({ run, onBack }: SimulationViewProps) {
  const [tab, setTab] = useState<SimulationTab>("timeline");
  const [selectedId, setSelectedId] = useState<number>();
  const { instances } = run;
  const processCount = instances[0]?.processes.length ?? 0;
  const policyCount = instances.length;

  // A single policy has nothing to compare against, so it always shows in detail.
  const detailInstance =
    policyCount === 1
      ? instances[0]
      : instances.find((instance) => instance.id === selectedId);

  return (
    <>
      <button type="button" onClick={onBack}>
        ← Back to configuration
      </button>
      <header className={styles.header}>
        <h1>Simulation</h1>
        <p className={styles.summary}>
          {processCount} {processCount === 1 ? "process" : "processes"} under{" "}
          {policyCount} {policyCount === 1 ? "policy" : "policies"}
        </p>
        <div className={styles.tabs} role="group" aria-label="View">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={styles.tab}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {tab === "comparison" ? (
        <ComparisonTable instances={instances} />
      ) : detailInstance ? (
        <PolicyDetail
          instance={detailInstance}
          onShowAll={
            policyCount > 1 ? () => setSelectedId(undefined) : undefined
          }
        />
      ) : (
        <>
          <p className={styles.hint}>
            Each row shows the process running on that policy's CPU, or the
            blocked processes when nothing can run. Select a policy to see every
            process.
          </p>
          <PolicyOverview instances={instances} onSelect={setSelectedId} />
          <h2>Results</h2>
          {instances.map((instance) => (
            <section key={instance.id} className={styles.results}>
              <h3>{instance.title}</h3>
              <ResultsTable statistics={instance.statistics} />
            </section>
          ))}
        </>
      )}
    </>
  );
}

// Every process's states and results for one policy.
function PolicyDetail({
  instance,
  onShowAll,
}: {
  instance: InstanceRun;
  /** Omitted when there are no other policies to return to. */
  onShowAll?: () => void;
}) {
  return (
    <>
      {onShowAll && (
        <button type="button" onClick={onShowAll}>
          ← All policies
        </button>
      )}
      <div className={styles.detailHeader}>
        <h2 className={styles.detailTitle}>{instance.title}</h2>
        <PolicyTags policy={instance.policy} />
      </div>
      <ProcessTimeline processes={instance.processes} />
      <h2>Results</h2>
      <ResultsTable statistics={instance.statistics} />
    </>
  );
}
