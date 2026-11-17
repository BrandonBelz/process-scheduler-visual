import type { CSSProperties } from "react";
import { summarizeCpuCycles, type CpuCycle } from "../core/cpuTimeline";
import type Process from "../core/types/process";
import { processFillStyle, processMarkerStyle } from "../utils/processColors";
import styles from "./PolicyOverview.module.css";

/** One policy instance's run, labeled for display. */
export interface OverviewInstance {
  id: number;
  title: string;
  processes: Process[];
}

interface PolicyOverviewProps {
  instances: OverviewInstance[];
  onSelect: (instanceId: number) => void;
}

// Shows one row per policy with the process on the CPU each cycle, on a shared cycle axis.
export default function PolicyOverview({
  instances,
  onSelect,
}: PolicyOverviewProps) {
  const totalCycles = Math.max(
    0,
    ...instances.flatMap(({ processes }) =>
      processes.map((process) => process.stateHistory.length),
    ),
  );
  // Labels mark moments between cycles, so N cycles have N + 1 moments.
  const moments = Array.from(
    { length: totalCycles + 1 },
    (_, moment) => moment,
  );

  return (
    <section>
      <div className={styles.scroller}>
        <div
          className={styles.grid}
          style={{
            // The zero-width last column anchors the final moment's label and line.
            gridTemplateColumns: `max-content repeat(${totalCycles}, 2.5rem) 0`,
            gridTemplateRows: `auto repeat(${instances.length}, minmax(2.5rem, auto))`,
          }}
        >
          {/* One backdrop for the whole label column, gaps included, hides the lines behind it. */}
          <span
            className={styles.stickyColumn}
            style={{ gridRow: "1 / -1", gridColumn: 1 }}
          />
          {moments.map((moment) => (
            <span
              key={`label-${moment}`}
              className={`${styles.momentLabel} ${moment === 0 ? styles.firstMoment : ""}`}
              style={{ gridRow: 1, gridColumn: moment + 2 }}
            >
              {moment}
            </span>
          ))}
          {/* A line at every moment runs through all policies so their times line up. */}
          {moments.map((moment) => (
            <span
              key={`line-${moment}`}
              className={styles.momentLine}
              aria-hidden="true"
              style={{ gridRow: "2 / -1", gridColumn: moment + 2 }}
            />
          ))}
          {instances.map((instance, index) => (
            <OverviewRow
              key={instance.id}
              instance={instance}
              row={index + 2}
              totalCycles={totalCycles}
              onSelect={() => onSelect(instance.id)}
            />
          ))}
        </div>
      </div>
      <OverviewLegend
        programIds={
          instances[0]?.processes.map((process) => process.program.id) ?? []
        }
      />
    </section>
  );
}

function OverviewRow({
  instance,
  row,
  totalCycles,
  onSelect,
}: {
  instance: OverviewInstance;
  row: number;
  totalCycles: number;
  onSelect: () => void;
}) {
  const cycles = summarizeCpuCycles(instance.processes, totalCycles);

  return (
    <>
      <div
        className={`${styles.policyLabel} ${styles.stickyColumn}`}
        style={{ gridRow: row, gridColumn: 1 }}
      >
        <button
          type="button"
          className={styles.policyButton}
          onClick={onSelect}
          title="Show every process"
        >
          {instance.title}
        </button>
      </div>
      {cycles.map((cycle, index) => (
        <CycleCell
          key={index}
          cycle={cycle}
          title={`${instance.title}, time ${index}–${index + 1}`}
          style={{ gridRow: row, gridColumn: index + 2 }}
        />
      ))}
    </>
  );
}

// Shows up to this many blocked processes before summarizing the rest.
const MAX_BLOCKED_SHOWN = 2;

function describeCycle(cycle: CpuCycle): string {
  switch (cycle.kind) {
    case "running":
      return `Running P${cycle.programId}`;
    case "blocked":
      return `CPU idle; blocked: ${cycle.programIds.map((id) => `P${id}`).join(", ")}`;
    case "idle":
      return "CPU idle";
    case "completed":
      return "All processes completed";
  }
}

function CycleCell({
  cycle,
  title,
  style,
}: {
  cycle: CpuCycle;
  title?: string;
  style?: CSSProperties;
}) {
  const description = describeCycle(cycle);
  const label = title ? `${title}: ${description}` : description;

  return (
    <span
      className={`${styles.cell} ${styles[cycle.kind]}`}
      // A running cell takes its process's color; the label still names it.
      style={
        cycle.kind === "running"
          ? { ...processFillStyle(cycle.programId), ...style }
          : style
      }
      title={label}
      aria-label={label}
    >
      <CycleContent cycle={cycle} />
    </span>
  );
}

function CycleContent({ cycle }: { cycle: CpuCycle }) {
  switch (cycle.kind) {
    case "running":
      return `P${cycle.programId}`;
    case "blocked": {
      const shown = cycle.programIds.slice(0, MAX_BLOCKED_SHOWN);
      const hidden = cycle.programIds.length - shown.length;
      return (
        <span className={styles.blockedList}>
          {shown.map((id) => (
            <span key={id} className={styles.blockedEntry}>
              <span
                className={styles.marker}
                style={processMarkerStyle(id)}
                aria-hidden="true"
              />
              P{id}
            </span>
          ))}
          {hidden > 0 && <span>+{hidden}</span>}
        </span>
      );
    }
    case "idle":
      return "–";
    case "completed":
      return "✓";
  }
}

const STATE_LEGEND: { cycle: CpuCycle; label: string }[] = [
  {
    cycle: { kind: "blocked", programIds: [0] },
    label: "CPU idle, processes blocked on I/O",
  },
  { cycle: { kind: "idle" }, label: "CPU idle, nothing to run" },
  { cycle: { kind: "completed" }, label: "All processes completed" },
];

// Keys each process's color, then the cells that show no running process.
function OverviewLegend({ programIds }: { programIds: number[] }) {
  return (
    <div className={styles.legend}>
      <ul aria-label="Running process colors">
        {programIds.map((programId) => (
          <li key={programId}>
            <CycleCell cycle={{ kind: "running", programId }} />
          </li>
        ))}
        <li>Running process</li>
      </ul>
      <ul aria-label="Other cells">
        {STATE_LEGEND.map(({ cycle, label }) => (
          <li key={cycle.kind}>
            <CycleCell cycle={cycle} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
