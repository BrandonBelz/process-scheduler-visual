import { describe, it, expect } from 'vitest';
import { runSimulations } from './api';
import FIFO_POLICY from './schedulers/fifo';
import { ProcessState } from './types/processState';
import type Program from './types/program';
import type Process from './types/process';

/**
 * Pretty-prints simulation results as a readable ASCII timeline grid.
 */
function logSimulationTimeline(title: string, processes: Process[]): void {
    console.log(`\n=== Simulation: ${title} ===`);
    if (processes.length === 0) {
        console.log('(No processes simulated)');
        return;
    }

    const maxTicks = Math.max(...processes.map((p) => p.stateHistory.length));
    const headerCols = processes.map((p) => {
        const ioDesc = p.program.ioSetting
            ? `, io: interval ${p.program.ioSetting.interval}/len ${p.program.ioSetting.length}`
            : '';
        return `P${p.program.id} (exec: ${p.program.executionTime}${ioDesc})`;
    });

    const colWidths = headerCols.map((col) => Math.max(col.length, 12));
    const tickColWidth = 6;

    const header = 'Tick'.padEnd(tickColWidth) + ' | ' + headerCols.map((c, i) => c.padEnd(colWidths[i])).join(' | ');
    const separator = '-'.repeat(header.length);

    console.log(header);
    console.log(separator);

    for (let tick = 0; tick < maxTicks; tick++) {
        const tickStr = String(tick).padStart(tickColWidth - 1);
        const states = processes.map((p, i) => {
            const state = p.stateHistory[tick] ?? '-';
            return state.padEnd(colWidths[i]);
        });
        console.log(`${tickStr} | ${states.join(' | ')}`);
    }
    console.log(separator);
}

describe('runSimulations', () => {
    it('should simulate a single process to completion', () => {
        const programs: Program[] = [
            {
                id: 1,
                executionTime: 3,
            },
        ];

        const results = runSimulations(programs, [FIFO_POLICY]);
        const policyResults = results[FIFO_POLICY.id];

        expect(policyResults).toBeDefined();
        expect(policyResults).toHaveLength(1);

        const [process] = policyResults;
        logSimulationTimeline('Single Process Execution', policyResults);

        // Contract: Process must end in COMPLETED
        expect(process.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);

        // Contract: Total RUNNING ticks must match execution time exactly
        const runningTicks = process.stateHistory.filter((s) => s === ProcessState.RUNNING).length;
        expect(runningTicks).toBe(3);
    });

    it('should maintain mutual exclusion and synchronous history lengths across multiple processes', () => {
        const programs: Program[] = [
            { id: 1, executionTime: 2 },
            { id: 2, executionTime: 3 },
        ];

        const results = runSimulations(programs, [FIFO_POLICY]);
        const policyResults = results[FIFO_POLICY.id];

        logSimulationTimeline('Multi-Process Execution (FIFO)', policyResults);

        expect(policyResults).toHaveLength(2);
        const [p1, p2] = policyResults;

        // Contract: Synchronous clock — all processes share identical history length
        expect(p1.stateHistory.length).toBe(p2.stateHistory.length);

        // Contract: Each process receives its configured CPU execution time
        const p1RunningTicks = p1.stateHistory.filter((s) => s === ProcessState.RUNNING).length;
        const p2RunningTicks = p2.stateHistory.filter((s) => s === ProcessState.RUNNING).length;
        expect(p1RunningTicks).toBe(2);
        expect(p2RunningTicks).toBe(3);

        // Contract: Both processes eventually complete
        expect(p1.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
        expect(p2.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);

        // Contract: Single-core mutual exclusion — at most one process is RUNNING at any tick
        const totalTicks = p1.stateHistory.length;
        for (let tick = 0; tick < totalTicks; tick++) {
            const runningAtTick = [p1, p2].filter((p) => p.stateHistory[tick] === ProcessState.RUNNING);
            expect(runningAtTick.length).toBeLessThanOrEqual(1);
        }
    });

    it('should transition to BLOCKED on I/O and yield CPU to another ready process', () => {
        const programs: Program[] = [
            {
                id: 1,
                executionTime: 3,
                ioSetting: { interval: 1, length: 2 },
            },
            {
                id: 2,
                executionTime: 2,
            },
        ];

        const results = runSimulations(programs, [FIFO_POLICY]);
        const policyResults = results[FIFO_POLICY.id];

        logSimulationTimeline('I/O Blocking and CPU Yielding', policyResults);

        const [p1, p2] = policyResults;

        // Contract: P1 has BLOCKED states in its history matching I/O behavior
        const p1BlockedTicks = p1.stateHistory.filter((s) => s === ProcessState.BLOCKED).length;
        expect(p1BlockedTicks).toBeGreaterThan(0);

        // Contract: When P1 blocks after tick 0, P2 is able to run on the yielded CPU
        expect(p1.stateHistory[0]).toBe(ProcessState.RUNNING);
        expect(p1.stateHistory[1]).toBe(ProcessState.BLOCKED);
        expect(p2.stateHistory[1]).toBe(ProcessState.RUNNING);

        // Contract: Total execution times are respected
        const p1RunningTicks = p1.stateHistory.filter((s) => s === ProcessState.RUNNING).length;
        const p2RunningTicks = p2.stateHistory.filter((s) => s === ProcessState.RUNNING).length;
        expect(p1RunningTicks).toBe(3);
        expect(p2RunningTicks).toBe(2);

        // Contract: Both reach COMPLETED
        expect(p1.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
        expect(p2.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
    });

    it('should allow CPU to remain idle when all unfinished processes are blocked', () => {
        const programs: Program[] = [
            {
                id: 1,
                executionTime: 2,
                ioSetting: { interval: 1, length: 2 },
            },
        ];

        const results = runSimulations(programs, [FIFO_POLICY]);
        const policyResults = results[FIFO_POLICY.id];

        logSimulationTimeline('Idle CPU During I/O Block', policyResults);

        const [p1] = policyResults;

        // Contract: Simulation handles ticks where readyIndices is empty without hanging
        expect(p1.stateHistory.filter((s) => s === ProcessState.BLOCKED).length).toBe(2);
        expect(p1.stateHistory.filter((s) => s === ProcessState.RUNNING).length).toBe(2);
        expect(p1.stateHistory.at(-1)).toBe(ProcessState.COMPLETED);
    });

    it('should gracefully handle empty program list', () => {
        const results = runSimulations([], [FIFO_POLICY]);
        const policyResults = results[FIFO_POLICY.id];

        logSimulationTimeline('Empty Programs List', policyResults);

        expect(policyResults).toBeDefined();
        expect(policyResults).toEqual([]);
    });
});
