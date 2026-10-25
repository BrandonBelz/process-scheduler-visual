import type Policy from "../types/policy";
import type { StandardPolicy } from "../types/policy";
import type { SchedulerContext, SchedulerDecision } from "../types/policy";
import type { StandardProcessDto } from "../types/processDto";
import type { RoundRobinState, RoundRobinConfig } from "./roundRobin";
import roundRobinPolicyFactory from "./roundRobin";

interface PerProcessState {
  ticksUsed: number;
  priority: number; // index in the array of queues
}

interface MLFQState {
  queues: StandardPolicy<RoundRobinState, RoundRobinConfig>[]; // higher indexes run first
  queueStates: RoundRobinState[];
  processStates: Record<number, PerProcessState>;
  lastRunningProcessId?: number;
}

function initialMLFQState(config: MLFQConfig): MLFQState {
  validateConfig(config);
  const queues = [];
  const queueStates = [];
  for (let i = 0; i < config.numberOfQueues; i++) {
    const queuePolicy = roundRobinPolicyFactory({
      timeSlice: config.timeSlice,
    }) as StandardPolicy<RoundRobinState, RoundRobinConfig>;
    queues.push(queuePolicy);
    queueStates.push(queuePolicy.initialState(queuePolicy.config));
  }

  return {
    queues,
    queueStates,
    processStates: {},
  };
}

interface MLFQConfig {
  numberOfQueues: number;
  timeSlice: number;
  allotmentPerProcess?: number;
  priorityBoostInterval?: number;
}

function validateConfig(config: MLFQConfig): void {
  if (!Number.isInteger(config.numberOfQueues) || config.numberOfQueues <= 0) {
    throw RangeError("Number of queues must be a positive integer.");
  }
  if (config.timeSlice <= 0) {
    throw RangeError("Time slice must be positive.");
  }
  if (
    config.allotmentPerProcess !== undefined &&
    config.allotmentPerProcess <= 0
  ) {
    throw RangeError("Allotment must be positive.");
  }
  if (
    config.priorityBoostInterval !== undefined &&
    config.priorityBoostInterval <= 0
  ) {
    throw RangeError("Priority boost interval must be positive.");
  }
}

function removeFromQueue(queue: RoundRobinState, programId: number): void {
  queue.queue = queue.queue.filter((id) => id !== programId);
  if (queue.lastRunningId === programId) {
    queue.lastRunningId = undefined;
    queue.runLength = 0;
  }
}

function addToQueue(queue: RoundRobinState, programId: number): void {
  if (!queue.queue.includes(programId)) {
    queue.queue.push(programId);
  }
}

function mlfqScheduler(
  processes: readonly StandardProcessDto[],
  state: MLFQState,
  config: MLFQConfig,
  context: SchedulerContext,
): SchedulerDecision<MLFQState> {
  if (processes.length === 0) throw RangeError("Process list cannot be empty.");
  validateConfig(config);

  const readyIds = processes.map((process) => process.programId);
  const topPriority = config.numberOfQueues - 1;

  state.queueStates.forEach((queue) => {
    queue.queue = queue.queue.filter((programId) =>
      readyIds.includes(programId),
    );
  });

  processes.forEach((process) => {
    if (state.processStates[process.programId] === undefined) {
      state.processStates[process.programId] = {
        ticksUsed: 0,
        priority: topPriority,
      };
    }

    const isQueued = state.queueStates.some((queue) =>
      queue.queue.includes(process.programId),
    );
    if (!isQueued) {
      addToQueue(
        state.queueStates[state.processStates[process.programId].priority],
        process.programId,
      );
    }
  });

  if (
    config.priorityBoostInterval !== undefined &&
    context.tick > 0 &&
    context.tick % config.priorityBoostInterval === 0
  ) {
    Object.entries(state.processStates).forEach(([programId, processState]) => {
      const id = Number(programId);
      processState.priority = topPriority;
      processState.ticksUsed = 0;
      state.queueStates.forEach((queue) => removeFromQueue(queue, id));
      if (readyIds.includes(id)) {
        addToQueue(state.queueStates[topPriority], id);
      }
    });
  }

  if (
    state.lastRunningProcessId !== undefined &&
    state.lastRunningProcessId !== context.runningProcessId &&
    config.allotmentPerProcess === undefined
  ) {
    state.processStates[state.lastRunningProcessId].ticksUsed = 0;
  }

  let selectedPriority: number | undefined;
  for (let priority = topPriority; priority >= 0; priority--) {
    if (state.queueStates[priority].queue.length > 0) {
      selectedPriority = priority;
      break;
    }
  }

  if (selectedPriority === undefined) {
    throw RangeError("No ready process is available in MLFQ queues.");
  }

  const selectedQueue = state.queueStates[selectedPriority];
  const selectedProcesses = processes.filter((process) =>
    selectedQueue.queue.includes(process.programId),
  );
  const decision = state.queues[selectedPriority].scheduler(
    selectedProcesses,
    selectedQueue,
    { timeSlice: config.timeSlice },
    context,
  );
  const selectedProcessState = state.processStates[decision.selectedProgramId];
  selectedProcessState.ticksUsed += 1;
  state.lastRunningProcessId = decision.selectedProgramId;

  const allotment = config.allotmentPerProcess ?? config.timeSlice;
  if (selectedProcessState.ticksUsed >= allotment) {
    selectedProcessState.ticksUsed = 0;
    if (config.allotmentPerProcess !== undefined) {
      const nextPriority = Math.max(0, selectedPriority - 1);
      if (nextPriority !== selectedPriority) {
        removeFromQueue(selectedQueue, decision.selectedProgramId);
        selectedProcessState.priority = nextPriority;
        addToQueue(state.queueStates[nextPriority], decision.selectedProgramId);
      }
    }
  }

  return {
    selectedProgramId: decision.selectedProgramId,
    nextState: state,
  };
}

const defaultConfig: MLFQConfig = {
  numberOfQueues: 3,
  timeSlice: 2,
};

export default function mlfqPolicyFactory(
  config: MLFQConfig = defaultConfig,
): Policy<MLFQState, MLFQConfig> {
  return {
    name: "Multi-Level Feedback Queue",
    description:
      "Multi-Level Feedback Queue is a scheduling algorithm that uses multiple queues with different priorities.",
    isPreemptive: true,
    canTellTheFuture: false,
    config: config,
    getConfigFields: () => [
      "numberOfQueues",
      "timeSlice",
      "allotmentPerProcess",
      "priorityBoostInterval",
    ],
    initialState: initialMLFQState,
    scheduler: mlfqScheduler,
  };
}
