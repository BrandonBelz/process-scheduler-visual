import type Policy from "../types/policy";
import type { SchedulerContext, SchedulerDecision } from "../types/policy";
import type { FutureTellingProcessDto } from "../types/processDto";

function sjfScheduler(
  processes: readonly FutureTellingProcessDto[],
  _state: object,
  _config: object,
  context: SchedulerContext,
): SchedulerDecision<object> {
  if (processes.length == 0) throw RangeError("Process list cannot be empty.");
  if (context.runningProcessId !== undefined)
    return { selectedProgramId: context.runningProcessId, nextState: {} };
  let shortest = processes[0];
  for (let index = 1; index < processes.length; index++) {
    if (processes[index].remainingBurstTime < shortest.remainingBurstTime)
      shortest = processes[index];
  }

  return { selectedProgramId: shortest.programId, nextState: {} };
}

export default function sjfPolicyFactory(): Policy<object> {
  return {
    name: "SJF",
    description:
      "Shortest Job First (SJF), as its name suggests, runs the shortest job first. It relies on knowing how long each process must run, which is unrealistic.",
    isPreemptive: false,
    canTellTheFuture: true,
    config: {},
    initialState: (_config: object) => ({}),
    scheduler: sjfScheduler,
  };
}
