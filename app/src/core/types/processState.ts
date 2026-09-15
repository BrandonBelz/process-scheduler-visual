export const ProcessState = {
  READY: "READY",
  BLOCKED: "BLOCKED",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
} as const;

export type ProcessState = (typeof ProcessState)[keyof typeof ProcessState];
