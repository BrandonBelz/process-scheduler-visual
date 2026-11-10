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

/** A user-editable whole-number setting in a policy's config. */
export interface ConfigField {
  /** Key of the setting in the policy's config. */
  key: string;
  /** Display name shown in the UI. */
  label: string;
  min: number;
  max: number;
}

interface BasePolicy<TState = any, TConfig = any> {
  name: string;
  description: string;
  config: TConfig;
  /** The user-editable config fields; empty when there are none. */
  getConfigFields: () => ConfigField[];
  initialState: (config: TConfig) => TState;
  /**
   * Creates an independent state snapshot for simulation history. When this
   * is omitted, the simulation does not retain policy state.
   */
  snapshotState?: (state: TState) => TState;
}

interface PreemptivePolicyFields {
  isPreemptive: true;
}

interface NonPreemptivePolicyFields {
  isPreemptive: false;
  returnControlOnBlock: boolean;
}

interface StandardScheduler<TState, TConfig> {
  canTellTheFuture: false;
  scheduler: (
    processes: readonly StandardProcessDto[],
    state: TState,
    config: TConfig,
    context: SchedulerContext,
  ) => SchedulerDecision<TState>;
}

interface FutureTellingScheduler<TState, TConfig> {
  canTellTheFuture: true;
  scheduler: (
    processes: readonly FutureTellingProcessDto[],
    state: TState,
    config: TConfig,
    context: SchedulerContext,
  ) => SchedulerDecision<TState>;
}

export type StandardPolicy<TState = any, TConfig = any> =
  | (BasePolicy<TState, TConfig> &
      PreemptivePolicyFields &
      StandardScheduler<TState, TConfig>)
  | (BasePolicy<TState, TConfig> &
      NonPreemptivePolicyFields &
      StandardScheduler<TState, TConfig>);

export type FutureTellingPolicy<TState = any, TConfig = any> =
  | (BasePolicy<TState, TConfig> &
      PreemptivePolicyFields &
      FutureTellingScheduler<TState, TConfig>)
  | (BasePolicy<TState, TConfig> &
      NonPreemptivePolicyFields &
      FutureTellingScheduler<TState, TConfig>);

export type StandardPolicyInstance<
  TState = any,
  TConfig = any,
> = StandardPolicy<TState, TConfig> & { id: number };

export type FutureTellingPolicyInstance<
  TState = any,
  TConfig = any,
> = FutureTellingPolicy<TState, TConfig> & { id: number };

export type PolicyInstance<TState = any, TConfig = any> =
  | StandardPolicyInstance<TState, TConfig>
  | FutureTellingPolicyInstance<TState, TConfig>;

export type Policy<TState = any, TConfig = any> =
  StandardPolicy<TState, TConfig> | FutureTellingPolicy<TState, TConfig>;
export type { Policy as default };
