import { describe, it, expect } from "vitest";
import { calculateAllStatistics, getPolicies, runSimulations } from "./api";
import fifoPolicyFactory from "./schedulers/fifo";
import mlfqPolicyFactory from "./schedulers/mlfq";
import roundRobinPolicyFactory from "./schedulers/roundRobin";
import sjfPolicyFactory from "./schedulers/sjf";
import stcfPolicyFactory from "./schedulers/stcf";
import { ProcessState } from "./types/processState";
import type Program from "./types/program";
import type Process from "./types/process";
import type { PolicyInstance } from "./types/policy";
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
  it("should run frontend-configured policy instances by unique ID", () => {
    const policies = getPolicies();
    const roundRobinPolicy = policies.find(
      (policy) => policy.name === "Round Robin",
    );
    expect(roundRobinPolicy).toBeDefined();

    const roundRobinInstance: PolicyInstance = {
      ...roundRobinPolicy!,
      id: 42,
      config: { timeSlice: 1 },
    };
    const results = runSimulations(
      [
        { id: 1, executionTime: 2, arrivalTime: 0 },
        { id: 2, executionTime: 2, arrivalTime: 0 },
      ],
      [roundRobinInstance],
    );

    expect(results[42]).toBeDefined();
    expect(results[42][0].stateHistory[0]).toBe(ProcessState.RUNNING);
    expect(results[42][1].stateHistory[0]).toBe(ProcessState.READY);
  });

  it("should supply StandardProcessDto with programId and currentState to policies where canTellTheFuture is false", () => {
    const receivedSnapshots: StandardProcessDto[][] = [];

    const testStandardPolicy: PolicyInstance<void> = {
      id: 99,
      name: "TestStandard",
      description: "Inspects StandardProcessDto snapshots",
      isPreemptive: false,
      canTellTheFuture: false,
      initialState: () => undefined,
      config: {},
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

  it("should preempt a longer running process when a shorter process arrives", () => {
    const programs: Program[] = [
      { id: 1, executionTime: 4, arrivalTime: 0 },
      { id: 2, executionTime: 1, arrivalTime: 1 },
    ];

    const stcfPolicy: PolicyInstance<object> = {
      ...stcfPolicyFactory(),
      id: 5,
    };
    const results = runSimulations(programs, [stcfPolicy]);
    const [p1, p2] = results[stcfPolicy.id];

    expect(p1.stateHistory).toEqual([
      ProcessState.RUNNING,
      ProcessState.READY,
      ProcessState.RUNNING,
      ProcessState.RUNNING,
      ProcessState.RUNNING,
      ProcessState.COMPLETED,
    ]);
    expect(p2.stateHistory).toEqual([
      ProcessState.NOT_STARTED,
      ProcessState.RUNNING,
      ProcessState.COMPLETED,
      ProcessState.COMPLETED,
      ProcessState.COMPLETED,
      ProcessState.COMPLETED,
    ]);
    expect(p1.stateHistory[1]).toBe(ProcessState.READY);
    expect(p2.stateHistory[1]).toBe(ProcessState.RUNNING);
  });

  it("should supply FutureTellingProcessDto with accurate remainingExecutionTime and remainingBurstTime to future-telling policies", () => {
    const recordedTicks: {
      tick: number;
      processes: FutureTellingProcessDto[];
    }[] = [];

    const testFuturePolicy: PolicyInstance<void> = {
      id: 100,
      name: "TestFuture",
      description: "Inspects FutureTellingProcessDto snapshots",
      isPreemptive: false,
      canTellTheFuture: true,
      initialState: () => undefined,
      config: {},
      scheduler: (processes, state, _config, context) => {
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

  it("should set remainingBurstTime to remainingExecutionTime when the job finishes before the next I/O interval", () => {
    let recordedSnapshot: FutureTellingProcessDto | undefined;

    const testFuturePolicy: PolicyInstance<void> = {
      id: 101,
      name: "TestFuturePrecedence",
      description: "Checks burst calculation when executionTime < interval",
      isPreemptive: false,
      canTellTheFuture: true,
      config: {},
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

  it("should keep unarrived processes in NOT_STARTED until their arrival time", () => {
    const programs: Program[] = [
      { id: 1, executionTime: 2, arrivalTime: 0 },
      { id: 2, executionTime: 2, arrivalTime: 1 },
      { id: 3, executionTime: 1, arrivalTime: 5 },
    ];

    const fifoPolicy: PolicyInstance = {
      ...fifoPolicyFactory(),
      id: 1,
    };
    const results = runSimulations(programs, [fifoPolicy]);
    const policyResults = results[fifoPolicy.id];

    expect(policyResults).toHaveLength(3);
    const [p1, p2, p3] = policyResults;

    // Contract: Synchronous clock — all processes have identical history lengths
    expect(p1.stateHistory.length).toBe(p2.stateHistory.length);
    expect(p2.stateHistory.length).toBe(p3.stateHistory.length);

    // Contract: Processes are in NOT_STARTED before their arrivalTime
    // P1 arrived at tick 0: never NOT_STARTED
    expect(
      p1.stateHistory.filter((s) => s === ProcessState.NOT_STARTED),
    ).toHaveLength(0);

    // P2 arrived at tick 1: NOT_STARTED at tick 0
    expect(p2.stateHistory[0]).toBe(ProcessState.NOT_STARTED);
    // P2 arrives at tick 1 while P1 is RUNNING, so P2 becomes READY
    expect(p2.stateHistory[1]).toBe(ProcessState.READY);

    // P3 arrived at tick 5: NOT_STARTED for ticks 0, 1, 2, 3, 4
    for (let tick = 0; tick < 5; tick++) {
      expect(p3.stateHistory[tick]).toBe(ProcessState.NOT_STARTED);
    }
    // P3 arrives at tick 5 when CPU is idle, so it immediately runs
    expect(p3.stateHistory[5]).toBe(ProcessState.RUNNING);

    // Contract: Exact state history verification across the entire simulation
    expect(p1.stateHistory).toEqual([
      ProcessState.RUNNING,
      ProcessState.RUNNING,
      ProcessState.COMPLETED,
      ProcessState.COMPLETED,
      ProcessState.COMPLETED,
      ProcessState.COMPLETED,
      ProcessState.COMPLETED,
    ]);

    expect(p2.stateHistory).toEqual([
      ProcessState.NOT_STARTED,
      ProcessState.READY,
      ProcessState.RUNNING,
      ProcessState.RUNNING,
      ProcessState.COMPLETED,
      ProcessState.COMPLETED,
      ProcessState.COMPLETED,
    ]);

    expect(p3.stateHistory).toEqual([
      ProcessState.NOT_STARTED,
      ProcessState.NOT_STARTED,
      ProcessState.NOT_STARTED,
      ProcessState.NOT_STARTED,
      ProcessState.NOT_STARTED,
      ProcessState.RUNNING,
      ProcessState.COMPLETED,
    ]);

    // Contract: Total RUNNING ticks match executionTime for each process
    const p1RunningTicks = p1.stateHistory.filter(
      (s) => s === ProcessState.RUNNING,
    ).length;
    const p2RunningTicks = p2.stateHistory.filter(
      (s) => s === ProcessState.RUNNING,
    ).length;
    const p3RunningTicks = p3.stateHistory.filter(
      (s) => s === ProcessState.RUNNING,
    ).length;
    expect(p1RunningTicks).toBe(2);
    expect(p2RunningTicks).toBe(2);
    expect(p3RunningTicks).toBe(1);

    // Contract: Mutual exclusion — at most one process is RUNNING on any tick
    for (let tick = 0; tick < p1.stateHistory.length; tick++) {
      const runningCount = [p1, p2, p3].filter(
        (p) => p.stateHistory[tick] === ProcessState.RUNNING,
      ).length;
      expect(runningCount).toBeLessThanOrEqual(1);
    }

    // Contract: All processes finish in COMPLETED
    expect(p1.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
    expect(p2.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
    expect(p3.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
  });
});

describe("calculateAllStatistics", () => {
  it("should calculate statistics for every policy result", () => {
    const simulationResults: Record<number, Process[]> = {
      7: [
        {
          program: { id: 1, executionTime: 2, arrivalTime: 0 },
          stateHistory: [
            ProcessState.RUNNING,
            ProcessState.RUNNING,
            ProcessState.COMPLETED,
          ],
        },
        {
          program: { id: 2, executionTime: 1, arrivalTime: 1 },
          stateHistory: [
            ProcessState.NOT_STARTED,
            ProcessState.RUNNING,
            ProcessState.COMPLETED,
          ],
        },
      ],
      8: [
        {
          program: { id: 3, executionTime: 1, arrivalTime: 2 },
          stateHistory: [
            ProcessState.NOT_STARTED,
            ProcessState.NOT_STARTED,
            ProcessState.RUNNING,
            ProcessState.COMPLETED,
          ],
        },
      ],
    };

    expect(calculateAllStatistics(simulationResults)).toEqual({
      7: [
        {
          name: "Response Time",
          results: {
            values: [
              { value: 0, programId: 1 },
              { value: 0, programId: 2 },
            ],
            average: 0,
          },
        },
        {
          name: "Turnaround Time",
          results: {
            values: [
              { value: 2, programId: 1 },
              { value: 1, programId: 2 },
            ],
            average: 1.5,
          },
        },
      ],
      8: [
        {
          name: "Response Time",
          results: {
            values: [{ value: 0, programId: 3 }],
            average: 0,
          },
        },
        {
          name: "Turnaround Time",
          results: {
            values: [{ value: 1, programId: 3 }],
            average: 1,
          },
        },
      ],
    });
  });
});

describe("integration with Round Robin", () => {
  it("should rotate processes after each round robin time slice", () => {
    const programs: Program[] = [
      { id: 1, executionTime: 5, arrivalTime: 0 },
      { id: 2, executionTime: 3, arrivalTime: 0 },
    ];
    const roundRobinPolicy: PolicyInstance = {
      ...roundRobinPolicyFactory({ timeSlice: 2 }),
      id: 43,
    };

    const results = runSimulations(programs, [roundRobinPolicy]);
    const policyResults = results[roundRobinPolicy.id];
    const [process1, process2] = policyResults;

    logSimulationTimeline("Round Robin Execution", policyResults);

    expect(process1.stateHistory).toEqual([
      ProcessState.RUNNING,
      ProcessState.RUNNING,
      ProcessState.READY,
      ProcessState.READY,
      ProcessState.RUNNING,
      ProcessState.RUNNING,
      ProcessState.READY,
      ProcessState.RUNNING,
      ProcessState.COMPLETED,
    ]);
    expect(process2.stateHistory).toEqual([
      ProcessState.READY,
      ProcessState.READY,
      ProcessState.RUNNING,
      ProcessState.RUNNING,
      ProcessState.READY,
      ProcessState.READY,
      ProcessState.RUNNING,
      ProcessState.COMPLETED,
      ProcessState.COMPLETED,
    ]);
  });

  it("should rotate processes every tick with a one-tick time slice", () => {
    const programs: Program[] = [
      { id: 1, executionTime: 5, arrivalTime: 0 },
      { id: 2, executionTime: 3, arrivalTime: 0 },
    ];
    const roundRobinPolicy: PolicyInstance = {
      ...roundRobinPolicyFactory({ timeSlice: 1 }),
      id: 44,
    };

    const results = runSimulations(programs, [roundRobinPolicy]);
    const policyResults = results[roundRobinPolicy.id];
    const [process1, process2] = policyResults;

    logSimulationTimeline(
      "Round Robin Execution (One-Tick Slice)",
      policyResults,
    );

    expect(process1.stateHistory).toEqual([
      ProcessState.RUNNING,
      ProcessState.READY,
      ProcessState.RUNNING,
      ProcessState.READY,
      ProcessState.RUNNING,
      ProcessState.READY,
      ProcessState.RUNNING,
      ProcessState.RUNNING,
      ProcessState.COMPLETED,
    ]);
    expect(process2.stateHistory).toEqual([
      ProcessState.READY,
      ProcessState.RUNNING,
      ProcessState.READY,
      ProcessState.RUNNING,
      ProcessState.READY,
      ProcessState.RUNNING,
      ProcessState.COMPLETED,
      ProcessState.COMPLETED,
      ProcessState.COMPLETED,
    ]);
  });
});

describe("integration with FIFO", () => {
  it("should simulate a single process to completion", () => {
    const programs: Program[] = [
      {
        id: 1,
        executionTime: 3,
        arrivalTime: 0,
      },
    ];

    const fifoPolicy: PolicyInstance = {
      ...fifoPolicyFactory(),
      id: 1,
    };
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

    const fifoPolicy: PolicyInstance = {
      ...fifoPolicyFactory(),
      id: 1,
    };
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

    const fifoPolicy: PolicyInstance = {
      ...fifoPolicyFactory(),
      id: 1,
    };
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

    const fifoPolicy: PolicyInstance = {
      ...fifoPolicyFactory(),
      id: 1,
    };
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
    const fifoPolicy: PolicyInstance = {
      ...fifoPolicyFactory(),
      id: 1,
    };
    const results = runSimulations([], [fifoPolicy]);
    const policyResults = results[fifoPolicy.id];

    logSimulationTimeline("Empty Programs List", policyResults);

    expect(policyResults).toBeDefined();
    expect(policyResults).toEqual([]);
  });

  it("should create a FIFO policy with the specified id and expected properties", () => {
    const fifoPolicy: PolicyInstance = {
      ...fifoPolicyFactory(),
      id: 42,
    };
    expect(fifoPolicy.name).toBe("FIFO");
    expect(fifoPolicy.isPreemptive).toBe(false);
    expect(fifoPolicy.canTellTheFuture).toBe(false);
    expect(fifoPolicy.initialState(fifoPolicy.config)).toEqual({ queue: [] });

    const programs: Program[] = [{ id: 1, executionTime: 1, arrivalTime: 0 }];
    const results = runSimulations(programs, [fifoPolicy]);
    logSimulationTimeline(
      "FIFO Policy Factory Integration",
      results[fifoPolicy.id],
    );
    expect(results[fifoPolicy.id]).toBeDefined();
    expect(results[fifoPolicy.id]).toHaveLength(1);
  });
});

describe("integration with SJF", () => {
  it("should run the shortest CPU-only job first with SJF", () => {
    const programs: Program[] = [
      { id: 1, executionTime: 5, arrivalTime: 0 },
      { id: 2, executionTime: 3, arrivalTime: 0 },
    ];

    const sjfPolicy: PolicyInstance = {
      ...sjfPolicyFactory(),
      id: 2,
    };
    const results = runSimulations(programs, [sjfPolicy]);
    logSimulationTimeline(
      "CPU-Only Shortest Job First (SJF)",
      results[sjfPolicy.id],
    );
    const [p1, p2] = results[sjfPolicy.id];

    expect(p2.stateHistory.slice(0, 3)).toEqual([
      ProcessState.RUNNING,
      ProcessState.RUNNING,
      ProcessState.RUNNING,
    ]);
    expect(p1.stateHistory.slice(0, 3)).toEqual([
      ProcessState.READY,
      ProcessState.READY,
      ProcessState.READY,
    ]);
    expect(
      p1.stateHistory.filter((state) => state === ProcessState.RUNNING),
    ).toHaveLength(5);
    expect(
      p2.stateHistory.filter((state) => state === ProcessState.RUNNING),
    ).toHaveLength(3);
    expect(p1.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
    expect(p2.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
  });

  it("should choose the shortest next CPU burst for SJF jobs, including I/O-aware timing", () => {
    const programs: Program[] = [
      {
        id: 1,
        executionTime: 4,
        ioSetting: { interval: 2, length: 1 },
        arrivalTime: 0,
      },
      { id: 2, executionTime: 3, arrivalTime: 0 },
    ];

    const sjfPolicy: PolicyInstance = {
      ...sjfPolicyFactory(),
      id: 3,
    };
    const results = runSimulations(programs, [sjfPolicy]);
    logSimulationTimeline(
      "I/O-Aware Shortest Job First (SJF)",
      results[sjfPolicy.id],
    );
    const [p1, p2] = results[sjfPolicy.id];

    expect(p1.stateHistory[0]).toBe(ProcessState.RUNNING);
    expect(p2.stateHistory[0]).toBe(ProcessState.READY);
    expect(p1.stateHistory[1]).toBe(ProcessState.RUNNING);
    expect(p1.stateHistory[2]).toBe(ProcessState.BLOCKED);
    expect(p2.stateHistory[2]).toBe(ProcessState.RUNNING);
    expect(
      p1.stateHistory.filter((state) => state === ProcessState.RUNNING),
    ).toHaveLength(4);
    expect(
      p2.stateHistory.filter((state) => state === ProcessState.RUNNING),
    ).toHaveLength(3);
    expect(p1.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
    expect(p2.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
  });
});

describe("integration with STCF", () => {
  it("should create an STCF policy with the expected properties and select the shortest burst", () => {
    const stcfPolicy: PolicyInstance = {
      ...stcfPolicyFactory(),
      id: 4,
    };
    expect(stcfPolicy.name).toBe("STCF");
    expect(stcfPolicy.isPreemptive).toBe(true);
    expect(stcfPolicy.canTellTheFuture).toBe(true);
    expect(stcfPolicy.initialState(stcfPolicy.config)).toEqual({});

    const programs: Program[] = [
      { id: 1, executionTime: 5, arrivalTime: 0 },
      { id: 2, executionTime: 3, arrivalTime: 0 },
    ];
    const results = runSimulations(programs, [stcfPolicy]);
    logSimulationTimeline(
      "Shortest Total CPU Burst (STCF)",
      results[stcfPolicy.id],
    );
    const [p1, p2] = results[stcfPolicy.id];

    expect(p1.stateHistory.slice(0, 3)).toEqual([
      ProcessState.READY,
      ProcessState.READY,
      ProcessState.READY,
    ]);
    expect(p2.stateHistory.slice(0, 3)).toEqual([
      ProcessState.RUNNING,
      ProcessState.RUNNING,
      ProcessState.RUNNING,
    ]);
    expect(
      p1.stateHistory.filter((state) => state === ProcessState.RUNNING),
    ).toHaveLength(5);
    expect(
      p2.stateHistory.filter((state) => state === ProcessState.RUNNING),
    ).toHaveLength(3);
    expect(p1.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
    expect(p2.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
  });
});

describe("integration with MLFQ", () => {
  it("should demote processes after their configured allotment", () => {
    const policy: PolicyInstance = {
      ...mlfqPolicyFactory({
        numberOfQueues: 2,
        timeSlice: 1,
        allotmentPerProcess: 2,
      }),
      id: 5,
    };

    const results = runSimulations(
      [
        { id: 1, executionTime: 4, arrivalTime: 0 },
        { id: 2, executionTime: 4, arrivalTime: 0 },
      ],
      [policy],
    );
    const [process1, process2] = results[policy.id];
    logSimulationTimeline("MLFQ Allotment Demotion", results[policy.id]);

    expect(process1.stateHistory.slice(0, 4)).toEqual([
      ProcessState.RUNNING,
      ProcessState.READY,
      ProcessState.RUNNING,
      ProcessState.READY,
    ]);
    expect(process2.stateHistory.slice(0, 4)).toEqual([
      ProcessState.READY,
      ProcessState.RUNNING,
      ProcessState.READY,
      ProcessState.RUNNING,
    ]);
  });

  it("should place arrivals in the highest-priority queue", () => {
    const policy: PolicyInstance = {
      ...mlfqPolicyFactory({
        numberOfQueues: 2,
        timeSlice: 1,
        allotmentPerProcess: 2,
      }),
      id: 6,
    };

    const results = runSimulations(
      [
        { id: 1, executionTime: 4, arrivalTime: 0 },
        { id: 2, executionTime: 1, arrivalTime: 2 },
      ],
      [policy],
    );
    const [process1, process2] = results[policy.id];
    logSimulationTimeline("MLFQ High-Priority Arrival", results[policy.id]);

    expect(process1.stateHistory.slice(0, 3)).toEqual([
      ProcessState.RUNNING,
      ProcessState.RUNNING,
      ProcessState.READY,
    ]);
    expect(process2.stateHistory[2]).toBe(ProcessState.RUNNING);
  });

  it("should retain priority across an I/O block and re-entry", () => {
    const policy: PolicyInstance = {
      ...mlfqPolicyFactory({
        numberOfQueues: 2,
        timeSlice: 1,
        allotmentPerProcess: 3,
      }),
      id: 7,
    };

    const results = runSimulations(
      [
        {
          id: 1,
          executionTime: 3,
          arrivalTime: 0,
          ioSetting: { interval: 1, length: 1 },
        },
        { id: 2, executionTime: 2, arrivalTime: 0 },
      ],
      [policy],
    );
    const [process1] = results[policy.id];
    logSimulationTimeline("MLFQ I/O Re-entry", results[policy.id]);

    expect(process1.stateHistory[0]).toBe(ProcessState.RUNNING);
    expect(process1.stateHistory[1]).toBe(ProcessState.BLOCKED);
    expect(process1.stateHistory[2]).toBe(ProcessState.RUNNING);
  });

  it("should boost known processes without resetting queue rotation state", () => {
    const policy: PolicyInstance = {
      ...mlfqPolicyFactory({
        numberOfQueues: 2,
        timeSlice: 1,
        allotmentPerProcess: 1,
        priorityBoostInterval: 3,
      }),
      id: 8,
    };

    const results = runSimulations(
      [
        { id: 1, executionTime: 5, arrivalTime: 0 },
        { id: 2, executionTime: 5, arrivalTime: 0 },
      ],
      [policy],
    );
    const [process1, process2] = results[policy.id];
    logSimulationTimeline("MLFQ Priority Boost", results[policy.id]);

    expect(process1.stateHistory[3]).toBe(ProcessState.RUNNING);
    expect(process2.stateHistory[3]).toBe(ProcessState.READY);
    expect(process1.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
    expect(process2.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
  });
});
