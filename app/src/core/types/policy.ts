import type { StandardProcessDto, FutureTellingProcessDto } from "./processDto";

export interface SchedulerDecision<TState> {
  selectedProgramId: number;
  nextState: TState;
}

export interface SchedulerContext {
  tick: number;
  canPreempt: boolean;
  runningProcessId?: number;
}

interface BasePolicy<TState> {
  id: number;
  name: string;
  description: string;
  isPreemptive: boolean;
  initialState: () => TState;
}

export interface StandardPolicy<TState = unknown> extends BasePolicy<TState> {
  canTellTheFuture: false;
  scheduler: (
    processes: readonly StandardProcessDto[],
    state: TState,
    context: SchedulerContext,
  ) => SchedulerDecision<TState>;
}

export interface FutureTellingPolicy<TState = unknown> extends BasePolicy<TState> {
  canTellTheFuture: true;
  scheduler: (
    processes: readonly FutureTellingProcessDto[],
    state: TState,
    context: SchedulerContext,
  ) => SchedulerDecision<TState>;
}

export type Policy<TState = unknown> = StandardPolicy<TState> | FutureTellingPolicy<TState>;
export type { Policy as default };

