import type Policy from "../types/policy";
import type { SchedulerContext, SchedulerDecision } from "../types/policy";
import type { FutureTellingProcessDto } from "../types/processDto";

function stcfScheduler(
  processes: readonly FutureTellingProcessDto[],
  _state: object,
  _context: SchedulerContext,
): SchedulerDecision<object> {
  if (processes.length == 0) throw RangeError("Process list cannot be empty.");
  let shortest = processes[0];
  for (let index = 1; index < processes.length; index++) {
    if (processes[index].remainingBurstTime < shortest.remainingBurstTime)
      shortest = processes[index];
  }

  return { selectedProgramId: shortest.programId, nextState: {} };
}

export default function stcfPolicyFactory(id: number): Policy<object> {
  return {
    id,
    name: "STCF",
    description:
      "Shortest Time to Completion First (STCF) is a preemptive scheduling algorithm that selects the process with the shortest remaining burst time to execute next. It is the preemptive version of Shortest Job First (SJF) and can lead to better responsiveness for shorter processes.",
    isPreemptive: true,
    canTellTheFuture: true,
    initialState: () => ({}),
    scheduler: stcfScheduler,
  };
}
