import { describe, it, expect } from "vitest";
import { runSimulations } from "./api";
import fifoPolicyFactory from "./schedulers/fifo";
import { ProcessState } from "./types/processState";
import type Program from "./types/program";
import type Process from "./types/process";
import type Policy from "./types/policy";
import type {
  StandardProcessDto,
  FutureTellingProcessDto,
} from "./types/processDto";

/**
 * Pretty-prints simulation results as a readable ASCII timeline grid.
 */
function logSimulationTimeline(title: string, processes: Process[]): void {
  console.log(`\n=== Simulation: ${title} ===`);
  if (processes.length === 0) {
    console.log("(No processes simulated)");
    return;
  }

  const maxTicks = Math.max(...processes.map((p) => p.stateHistory.length));
  const headerCols = processes.map((p) => {
    const ioDesc = p.program.ioSetting
      ? `, io: interval ${p.program.ioSetting.interval}/len ${p.program.ioSetting.length}`
      : "";
    return `P${p.program.id} (exec: ${p.program.executionTime}${ioDesc})`;
  });

  const colWidths = headerCols.map((col) => Math.max(col.length, 12));
  const tickColWidth = 6;

  const header =
    "Tick".padEnd(tickColWidth) +
    " | " +
    headerCols.map((c, i) => c.padEnd(colWidths[i])).join(" | ");
  const separator = "-".repeat(header.length);

  console.log(header);
  console.log(separator);

  for (let tick = 0; tick < maxTicks; tick++) {
    const tickStr = String(tick).padStart(tickColWidth - 1);
    const states = processes.map((p, i) => {
      const state = p.stateHistory[tick] ?? "-";
      return state.padEnd(colWidths[i]);
    });
    console.log(`${tickStr} | ${states.join(" | ")}`);
  }
  console.log(separator);
}

describe("runSimulations", () => {
  it("should simulate a single process to completion", () => {
    const programs: Program[] = [
      {
        id: 1,
        executionTime: 3,
        arrivalTime: 0,
      },
    ];

    const fifoPolicy = fifoPolicyFactory(1);
    const results = runSimulations(programs, [fifoPolicy]);
    const policyResults = results[fifoPolicy.id];

    expect(policyResults).toBeDefined();
    expect(policyResults).toHaveLength(1);

    const [process] = policyResults;
    logSimulationTimeline("Single Process Execution", policyResults);

    // Contract: Process must end in COMPLETED
    expect(process.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);

    // Contract: Total RUNNING ticks must match execution time exactly
    const runningTicks = process.stateHistory.filter(
      (s) => s === ProcessState.RUNNING,
    ).length;
    expect(runningTicks).toBe(3);
  });

  it("should maintain mutual exclusion and synchronous history lengths across multiple processes", () => {
    const programs: Program[] = [
      { id: 1, executionTime: 2, arrivalTime: 0 },
      { id: 2, executionTime: 3, arrivalTime: 0 },
    ];

    const fifoPolicy = fifoPolicyFactory(1);
    const results = runSimulations(programs, [fifoPolicy]);
    const policyResults = results[fifoPolicy.id];

    logSimulationTimeline("Multi-Process Execution (FIFO)", policyResults);

    expect(policyResults).toHaveLength(2);
    const [p1, p2] = policyResults;

    // Contract: Synchronous clock — all processes share identical history length
    expect(p1.stateHistory.length).toBe(p2.stateHistory.length);

    // Contract: Each process receives its configured CPU execution time
    const p1RunningTicks = p1.stateHistory.filter(
      (s) => s === ProcessState.RUNNING,
    ).length;
    const p2RunningTicks = p2.stateHistory.filter(
      (s) => s === ProcessState.RUNNING,
    ).length;
    expect(p1RunningTicks).toBe(2);
    expect(p2RunningTicks).toBe(3);

    // Contract: Both processes eventually complete
    expect(p1.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
    expect(p2.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);

    // Contract: Single-core mutual exclusion — at most one process is RUNNING at any tick
    const totalTicks = p1.stateHistory.length;
    for (let tick = 0; tick < totalTicks; tick++) {
      const runningAtTick = [p1, p2].filter(
        (p) => p.stateHistory[tick] === ProcessState.RUNNING,
      );
      expect(runningAtTick.length).toBeLessThanOrEqual(1);
    }
  });

  it("should transition to BLOCKED on I/O and yield CPU to another ready process", () => {
    const programs: Program[] = [
      {
        id: 1,
        executionTime: 3,
        ioSetting: { interval: 1, length: 2 },
        arrivalTime: 0,
      },
      {
        id: 2,
        executionTime: 2,
        arrivalTime: 0,
      },
    ];

    const fifoPolicy = fifoPolicyFactory(1);
    const results = runSimulations(programs, [fifoPolicy]);
    const policyResults = results[fifoPolicy.id];

    logSimulationTimeline("I/O Blocking and CPU Yielding", policyResults);

    const [p1, p2] = policyResults;

    // Contract: P1 has BLOCKED states in its history matching I/O behavior
    const p1BlockedTicks = p1.stateHistory.filter(
      (s) => s === ProcessState.BLOCKED,
    ).length;
    expect(p1BlockedTicks).toBeGreaterThan(0);

    // Contract: When P1 blocks after tick 0, P2 is able to run on the yielded CPU
    expect(p1.stateHistory[0]).toBe(ProcessState.RUNNING);
    expect(p1.stateHistory[1]).toBe(ProcessState.BLOCKED);
    expect(p2.stateHistory[1]).toBe(ProcessState.RUNNING);

    // Contract: Total execution times are respected
    const p1RunningTicks = p1.stateHistory.filter(
      (s) => s === ProcessState.RUNNING,
    ).length;
    const p2RunningTicks = p2.stateHistory.filter(
      (s) => s === ProcessState.RUNNING,
    ).length;
    expect(p1RunningTicks).toBe(3);
    expect(p2RunningTicks).toBe(2);

    // Contract: Both reach COMPLETED
    expect(p1.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
    expect(p2.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
  });

  it("should allow CPU to remain idle when all unfinished processes are blocked", () => {
    const programs: Program[] = [
      {
        id: 1,
        executionTime: 2,
        ioSetting: { interval: 1, length: 2 },
        arrivalTime: 0,
      },
    ];

    const fifoPolicy = fifoPolicyFactory(1);
    const results = runSimulations(programs, [fifoPolicy]);
    const policyResults = results[fifoPolicy.id];

    logSimulationTimeline("Idle CPU During I/O Block", policyResults);

    const [p1] = policyResults;

    // Contract: Simulation handles ticks where readyIndices is empty without hanging
    expect(
      p1.stateHistory.filter((s) => s === ProcessState.BLOCKED).length,
    ).toBe(2);
    expect(
      p1.stateHistory.filter((s) => s === ProcessState.RUNNING).length,
    ).toBe(2);
    expect(p1.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
  });

  it("should gracefully handle empty program list", () => {
    const fifoPolicy = fifoPolicyFactory(1);
    const results = runSimulations([], [fifoPolicy]);
    const policyResults = results[fifoPolicy.id];

    logSimulationTimeline("Empty Programs List", policyResults);

    expect(policyResults).toBeDefined();
    expect(policyResults).toEqual([]);
  });

  it("should create a FIFO policy with the specified id and expected properties", () => {
    const fifoPolicy = fifoPolicyFactory(42);
    expect(fifoPolicy.id).toBe(42);
    expect(fifoPolicy.name).toBe("FIFO");
    expect(fifoPolicy.isPreemptive).toBe(false);
    expect(fifoPolicy.canTellTheFuture).toBe(false);
    expect(fifoPolicy.initialState()).toEqual({ queue: [] });

    const programs: Program[] = [{ id: 1, executionTime: 1, arrivalTime: 0 }];
    const results = runSimulations(programs, [fifoPolicy]);
    expect(results[42]).toBeDefined();
    expect(results[42]).toHaveLength(1);
  });

  it("should supply StandardProcessDto with programId and currentState to policies where canTellTheFuture is false", () => {
    const receivedSnapshots: StandardProcessDto[][] = [];

    const testStandardPolicy: Policy<void> = {
      id: 99,
      name: "TestStandard",
      description: "Inspects StandardProcessDto snapshots",
      isPreemptive: false,
      canTellTheFuture: false,
      initialState: () => undefined,
      scheduler: (processes, state) => {
        receivedSnapshots.push([...processes]);
        return {
          selectedProgramId: processes[0].programId,
          nextState: state,
        };
      },
    };

    const programs: Program[] = [
      { id: 10, executionTime: 1, arrivalTime: 0 },
      { id: 20, executionTime: 1, arrivalTime: 0 },
    ];

    runSimulations(programs, [testStandardPolicy]);

    expect(receivedSnapshots.length).toBeGreaterThan(0);
    const firstTickProcesses = receivedSnapshots[0];
    expect(firstTickProcesses).toHaveLength(2);

    expect(firstTickProcesses[0].programId).toBe(10);
    expect(firstTickProcesses[0].currentState).toBe(ProcessState.READY);
    expect(
      (firstTickProcesses[0] as unknown as Record<string, unknown>)
        .remainingExecutionTime,
    ).toBeUndefined();
    expect(
      (firstTickProcesses[0] as unknown as Record<string, unknown>)
        .remainingBurstTime,
    ).toBeUndefined();

    expect(firstTickProcesses[1].programId).toBe(20);
    expect(firstTickProcesses[1].currentState).toBe(ProcessState.READY);
  });

  it("should supply FutureTellingProcessDto with accurate remainingExecutionTime and remainingBurstTime to future-telling policies", () => {
    const recordedTicks: {
      tick: number;
      processes: FutureTellingProcessDto[];
    }[] = [];

    const testFuturePolicy: Policy<void> = {
      id: 100,
      name: "TestFuture",
      description: "Inspects FutureTellingProcessDto snapshots",
      isPreemptive: false,
      canTellTheFuture: true,
      initialState: () => undefined,
      scheduler: (processes, state, context) => {
        recordedTicks.push({
          tick: context.tick,
          processes: processes.map((p) => ({ ...p })),
        });
        return {
          selectedProgramId: processes[0].programId,
          nextState: state,
        };
      },
    };

    const programs: Program[] = [
      {
        id: 1,
        executionTime: 3,
        ioSetting: { interval: 1, length: 2 },
        arrivalTime: 0,
      },
      { id: 2, executionTime: 2, arrivalTime: 0 },
    ];

    runSimulations(programs, [testFuturePolicy]);

    // At tick 0:
    // P1: remainingExecution 3, burst 1 (min(3, 1 - 0) = 1)
    // P2: remainingExecution 2, burst 2
    const tick0 = recordedTicks.find((r) => r.tick === 0);
    expect(tick0).toBeDefined();
    const p1Tick0 = tick0!.processes.find((p) => p.programId === 1);
    const p2Tick0 = tick0!.processes.find((p) => p.programId === 2);
    expect(p1Tick0).toEqual({
      programId: 1,
      currentState: ProcessState.READY,
      remainingExecutionTime: 3,
      remainingBurstTime: 1,
    });
    expect(p2Tick0).toEqual({
      programId: 2,
      currentState: ProcessState.READY,
      remainingExecutionTime: 2,
      remainingBurstTime: 2,
    });

    // At tick 1: P1 blocked on I/O, P2 ready
    // P2: remainingExecution 2, burst 2
    const tick1 = recordedTicks.find((r) => r.tick === 1);
    expect(tick1).toBeDefined();
    expect(tick1!.processes).toHaveLength(1);
    expect(tick1!.processes[0]).toEqual({
      programId: 2,
      currentState: ProcessState.READY,
      remainingExecutionTime: 2,
      remainingBurstTime: 2,
    });

    // At tick 2: P1 still blocked, P2 ran 1 cycle, so P2 remainingExecution 1, burst 1
    const tick2 = recordedTicks.find((r) => r.tick === 2);
    expect(tick2).toBeDefined();
    expect(tick2!.processes).toHaveLength(1);
    expect(tick2!.processes[0]).toEqual({
      programId: 2,
      currentState: ProcessState.READY,
      remainingExecutionTime: 1,
      remainingBurstTime: 1,
    });

    // At tick 3: P1 unblocks! P2 completed.
    // P1: remainingExecution 2, cpuTicksSinceIo is 0, burst is min(2, 1 - 0) = 1
    const tick3 = recordedTicks.find((r) => r.tick === 3);
    expect(tick3).toBeDefined();
    expect(tick3!.processes).toHaveLength(1);
    expect(tick3!.processes[0]).toEqual({
      programId: 1,
      currentState: ProcessState.READY,
      remainingExecutionTime: 2,
      remainingBurstTime: 1,
    });
  });

  it("should calculate remainingBurstTime as remainingExecutionTime when program completes before next I/O interval", () => {
    let recordedSnapshot: FutureTellingProcessDto | undefined;

    const testFuturePolicy: Policy<void> = {
      id: 101,
      name: "TestFuturePrecedence",
      description: "Checks burst calculation when executionTime < interval",
      isPreemptive: false,
      canTellTheFuture: true,
      initialState: () => undefined,
      scheduler: (processes, state) => {
        if (!recordedSnapshot) {
          recordedSnapshot = processes[0];
        }
        return {
          selectedProgramId: processes[0].programId,
          nextState: state,
        };
      },
    };

    const programs: Program[] = [
      {
        id: 1,
        executionTime: 2,
        ioSetting: { interval: 5, length: 1 },
        arrivalTime: 0,
      },
    ];

    runSimulations(programs, [testFuturePolicy]);

    expect(recordedSnapshot).toBeDefined();
    expect(recordedSnapshot!.remainingExecutionTime).toBe(2);
    expect(recordedSnapshot!.remainingBurstTime).toBe(2);
  });
});
