export const ProcessState = {
  NOT_STARTED: "NOT_STARTED",
  READY: "READY",
  BLOCKED: "BLOCKED",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
} as const;

export type ProcessState = (typeof ProcessState)[keyof typeof ProcessState];
