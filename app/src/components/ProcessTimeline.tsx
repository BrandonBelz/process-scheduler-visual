import type Process from "../core/types/process";
import { ProcessState } from "../core/types/processState";
import styles from "./ProcessTimeline.module.css";

interface StateDisplay {
  label: string;
  symbol: string;
  className: string;
}

// Pairs each state's color with a symbol so states are readable without color.
const STATE_DISPLAY: Record<ProcessState, StateDisplay> = {
  [ProcessState.RUNNING]: {
    label: "Running",
    symbol: "R",
    className: styles.running,
  },
  [ProcessState.READY]: {
    label: "Ready",
    symbol: "·",
    className: styles.ready,
  },
  [ProcessState.BLOCKED]: {
    label: "Blocked",
    symbol: "B",
    className: styles.blocked,
  },
  [ProcessState.COMPLETED]: {
    label: "Completed",
    symbol: "✓",
    className: styles.completed,
  },
  [ProcessState.NOT_STARTED]: {
    label: "Not started",
    symbol: "-",
    className: styles.notStarted,
  },
};

interface ProcessTimelineProps {
  processes: Process[];
}

// Renders a timeline of processes and their states over time.
export default function ProcessTimeline({ processes }: ProcessTimelineProps) {
  const totalCycles = Math.max(
    0,
    ...processes.map((process) => process.stateHistory.length),
  );
  const cycles = Array.from({ length: totalCycles }, (_, cycle) => cycle);

  return (
    <section className={styles.timeline}>
      <div className={styles.scroller}>
        <div
          className={styles.grid}
          style={{
            gridTemplateColumns: `max-content repeat(${totalCycles}, 2rem)`,
          }}
        >
          <span />
          {cycles.map((cycle) => (
            <span key={cycle} className={styles.cycleLabel}>
              {cycle}
            </span>
          ))}
          {processes.map((process) => (
            <TimelineRow key={process.program.id} process={process} />
          ))}
        </div>
      </div>
      <StateLegend />
    </section>
  );
}

function TimelineRow({ process }: { process: Process }) {
  const label = `P${process.program.id}`;

  return (
    <>
      <span className={styles.processLabel}>{label}</span>
      {process.stateHistory.map((state, cycle) => (
        <StateCell
          key={cycle}
          state={state}
          title={`${label}, cycle ${cycle}`}
        />
      ))}
    </>
  );
}

function StateCell({ state, title }: { state: ProcessState; title?: string }) {
  const { label, symbol, className } = STATE_DISPLAY[state];

  return (
    <span
      className={`${styles.cell} ${className}`}
      title={title ? `${title}: ${label}` : label}
    >
      {symbol}
    </span>
  );
}

function StateLegend() {
  return (
    <ul className={styles.legend}>
      {Object.entries(STATE_DISPLAY).map(([state, { label }]) => (
        <li key={state}>
          <StateCell state={state as ProcessState} />
          {label}
        </li>
      ))}
    </ul>
  );
}
