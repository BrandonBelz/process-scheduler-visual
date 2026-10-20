/* eslint-disable @typescript-eslint/no-explicit-any */
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

interface BasePolicy<TState = any, TConfig = any> {
  name: string;
  description: string;
  isPreemptive: boolean;
  config: TConfig;
  initialState: () => TState;
}

export interface StandardPolicy<TState = any, TConfig = any> extends BasePolicy<
  TState,
  TConfig
> {
  canTellTheFuture: false;
  scheduler: (
    processes: readonly StandardProcessDto[],
    state: TState,
    config: TConfig,
    context: SchedulerContext,
  ) => SchedulerDecision<TState>;
}

export interface FutureTellingPolicy<
  TState = any,
  TConfig = any,
> extends BasePolicy<TState, TConfig> {
  canTellTheFuture: true;
  scheduler: (
    processes: readonly FutureTellingProcessDto[],
    state: TState,
    config: TConfig,
    context: SchedulerContext,
  ) => SchedulerDecision<TState>;
}

export interface StandardPolicyInstance<
  TState = any,
  TConfig = any,
> extends StandardPolicy<TState, TConfig> {
  id: number;
}

export interface FutureTellingPolicyInstance<
  TState = any,
  TConfig = any,
> extends FutureTellingPolicy<TState, TConfig> {
  id: number;
}

export type PolicyInstance<TState = any, TConfig = any> =
  | StandardPolicyInstance<TState, TConfig>
  | FutureTellingPolicyInstance<TState, TConfig>;

export type Policy<TState = any, TConfig = any> =
  | StandardPolicy<TState, TConfig>
  | FutureTellingPolicy<TState, TConfig>;
export type { Policy as default };
