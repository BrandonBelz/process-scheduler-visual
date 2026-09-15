import type Process from "./process";

export interface SchedulerDecision<TState> {
  selectedProgramId: number;
  nextState: TState;
}

export interface SchedulerContext {
  tick: number;
  canPreempt: boolean;
  runningProcessId?: number;
}

export default interface Policy<TState = unknown> {
  id: number;
  name: string;
  description: string;
  isPreemptive: boolean;
  initialState: () => TState;
  scheduler: (
    processes: readonly Process[],
    state: TState,
    context: SchedulerContext,
  ) => SchedulerDecision<TState>;
}
