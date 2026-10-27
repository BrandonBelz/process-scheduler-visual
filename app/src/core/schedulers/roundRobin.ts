import type Policy from "../types/policy";
import type { SchedulerContext, SchedulerDecision } from "../types/policy";
import type { StandardProcessDto } from "../types/processDto";

export interface RoundRobinState {
  queue: number[];
  lastRunningId?: number;
  // Number of ticks already assigned to the current process in its quantum.
  runLength: number;
}

function initialRoundRobinState(_config: RoundRobinConfig): RoundRobinState {
  return { queue: [], lastRunningId: -1, runLength: 0 };
}

export interface RoundRobinConfig {
  timeSlice: number;
}

function roundRobinScheduler(
  processes: readonly StandardProcessDto[],
  state: RoundRobinState,
  config: RoundRobinConfig,
  context: SchedulerContext,
): SchedulerDecision<RoundRobinState> {
  if (processes.length === 0) throw RangeError("Process list cannot be empty.");
  if (config.timeSlice <= 0) throw RangeError("Time slice must be positive.");

  const readyIds = processes.map((process) => process.programId);

  // Remove processes that completed or became blocked, then append new arrivals.
  // Queue order is preserved so new processes join at the back.
  state.queue = state.queue.filter((programId) => readyIds.includes(programId));
  processes.forEach((process) => {
    if (!state.queue.includes(process.programId)) {
      state.queue.push(process.programId);
    }
  });

  const currentProcessIsReady =
    state.lastRunningId !== undefined && readyIds.includes(state.lastRunningId);

  if (!currentProcessIsReady) {
    // The previous process yielded the CPU because it completed or blocked.
    state.runLength = 0;
    state.lastRunningId = undefined;
  }

  if (
    context.runningProcessId !== undefined &&
    context.runningProcessId !== state.lastRunningId
  ) {
    // The simulation changed processes outside this policy's quantum.
    state.runLength = 0;
  }

  if (state.lastRunningId !== undefined && state.runLength < config.timeSlice) {
    // Keep running until the configured time slice has been consumed.
    state.runLength += 1;
    return {
      selectedProgramId: state.lastRunningId,
      nextState: state,
    };
  }

  if (state.lastRunningId !== undefined) {
    // Move an expired process behind every other ready process.
    const currentIndex = state.queue.indexOf(state.lastRunningId);
    if (currentIndex >= 0) {
      state.queue.splice(currentIndex, 1);
      state.queue.push(state.lastRunningId);
    }
    state.lastRunningId = undefined;
  }

  // The queue head is the next process to receive a time slice.
  state.lastRunningId = state.queue[0];
  state.runLength = 1;

  return {
    selectedProgramId: state.lastRunningId,
    nextState: state,
  };
}

export default function roundRobinPolicyFactory(
  config: RoundRobinConfig = { timeSlice: 2 },
): Policy<RoundRobinState, RoundRobinConfig> {
  return {
    name: "Round Robin",
    description:
      "Round Robin is a pre-emptive scheduling algorithm that assigns a fixed time slice to each process.",
    isPreemptive: true,
    canTellTheFuture: false,
    config: config,
    getConfigFields: () => [
      { key: "timeSlice", label: "Time slice", min: 1, max: 20 },
    ],
    initialState: initialRoundRobinState,
    scheduler: roundRobinScheduler,
  };
}
