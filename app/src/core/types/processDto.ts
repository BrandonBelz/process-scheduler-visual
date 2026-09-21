import type { ProcessState } from "./processState";

/**
 * Observable process snapshot for realistic policies that cannot predict future execution.
 */
export interface StandardProcessDto {
  readonly programId: number;
  readonly currentState: ProcessState;
}

/**
 * Process snapshot for policies that rely on future knowledge (e.g. SJF, STCF).
 */
export interface FutureTellingProcessDto extends StandardProcessDto {
  /** Total CPU cycles remaining until program completion. */
  readonly remainingExecutionTime: number;
  /**
   * Cycles remaining in the current CPU burst (until the next I/O block
   * or program completion, whichever comes first).
   */
  readonly remainingBurstTime: number;
}

export type PolicyProcessDto = StandardProcessDto | FutureTellingProcessDto;
