import { describe, it, expect } from "vitest";
import { makePolicyInstance, runSimulations } from "./api";
import { summarizeCpuCycles } from "./cpuTimeline";
import fifoPolicyFactory from "./schedulers/fifo";
import type Process from "./types/process";
import { ProcessState } from "./types/processState";

const { RUNNING, READY, BLOCKED, COMPLETED, NOT_STARTED } = ProcessState;

function makeProcess(id: number, stateHistory: ProcessState[]): Process {
  return {
    program: { id, executionTime: 1, arrivalTime: 0 },
    stateHistory,
  };
}

describe("summarizeCpuCycles", () => {
  it("should report the running process each cycle", () => {
    const cycles = summarizeCpuCycles([
      makeProcess(0, [RUNNING, READY, COMPLETED]),
      makeProcess(1, [READY, RUNNING, COMPLETED]),
    ]);

    expect(cycles).toEqual([
      { kind: "running", programId: 0 },
      { kind: "running", programId: 1 },
      { kind: "completed" },
    ]);
  });

  it("should list every blocked process in ID order when none runs", () => {
    const cycles = summarizeCpuCycles([
      makeProcess(2, [BLOCKED, BLOCKED]),
      makeProcess(0, [BLOCKED, COMPLETED]),
      makeProcess(1, [COMPLETED, COMPLETED]),
    ]);

    expect(cycles).toEqual([
      { kind: "blocked", programIds: [0, 2] },
      { kind: "blocked", programIds: [2] },
    ]);
  });

  it("should report idle cycles before any process arrives", () => {
    const cycles = summarizeCpuCycles([
      makeProcess(0, [NOT_STARTED, RUNNING, COMPLETED]),
      makeProcess(1, [COMPLETED, COMPLETED, COMPLETED]),
    ]);

    expect(cycles[0]).toEqual({ kind: "idle" });
  });

  it("should pad cycles past the end of the run as completed", () => {
    const cycles = summarizeCpuCycles(
      [makeProcess(0, [RUNNING, COMPLETED])],
      4,
    );

    expect(cycles).toEqual([
      { kind: "running", programId: 0 },
      { kind: "completed" },
      { kind: "completed" },
      { kind: "completed" },
    ]);
  });

  it("should return no cycles for no processes", () => {
    expect(summarizeCpuCycles([])).toEqual([]);
  });

  it("should summarize a simulated run with I/O", () => {
    const fifo = makePolicyInstance(fifoPolicyFactory(), 0);
    const results = runSimulations(
      [
        {
          id: 0,
          executionTime: 2,
          arrivalTime: 0,
          ioSetting: { interval: 1, length: 2 },
        },
      ],
      [fifo],
    );

    expect(summarizeCpuCycles(results[0].processes)).toEqual([
      { kind: "running", programId: 0 },
      { kind: "blocked", programIds: [0] },
      { kind: "blocked", programIds: [0] },
      { kind: "running", programId: 0 },
      { kind: "completed" },
    ]);
  });
});
