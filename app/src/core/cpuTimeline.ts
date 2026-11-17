import type Process from "./types/process";
import { ProcessState } from "./types/processState";

/** What one policy's CPU did during one cycle. */
export type CpuCycle =
  | { kind: "running"; programId: number }
  /** Nothing ran because every unfinished, arrived process was waiting on I/O. */
  | { kind: "blocked"; programIds: number[] }
  /** Nothing ran and nothing was blocked, such as before any process arrives. */
  | { kind: "idle" }
  | { kind: "completed" };

// Summarizes a run one cycle at a time: the running process, or the blocked ones when none ran.
// Cycles past the end of the run report completed, so shorter runs pad to a shared length.
export function summarizeCpuCycles(
  processes: Process[],
  length = Math.max(
    0,
    ...processes.map((process) => process.stateHistory.length),
  ),
): CpuCycle[] {
  return Array.from({ length }, (_, cycle): CpuCycle => {
    const states = processes.map(
      (process) => process.stateHistory[cycle] ?? ProcessState.COMPLETED,
    );

    const runningIndex = states.indexOf(ProcessState.RUNNING);
    if (runningIndex !== -1) {
      return {
        kind: "running",
        programId: processes[runningIndex].program.id,
      };
    }

    const blockedIds = processes
      .filter((_, index) => states[index] === ProcessState.BLOCKED)
      .map((process) => process.program.id)
      .sort((a, b) => a - b);
    if (blockedIds.length > 0)
      return { kind: "blocked", programIds: blockedIds };

    return states.every((state) => state === ProcessState.COMPLETED)
      ? { kind: "completed" }
      : { kind: "idle" };
  });
}
