import type Policy from "../types/policy";
import type { SchedulerContext, SchedulerDecision } from "../types/policy";
import type { StandardProcessDto } from "../types/processDto";

interface FifoState {
    queue: number[];
}

function initialFifoState(): FifoState {
    return { queue: [] };
}

function fifo_scheduler(
    processes: readonly StandardProcessDto[],
    state: FifoState,
    context: SchedulerContext
): SchedulerDecision<FifoState> {
    processes.forEach((process) => {
        if (
            process.programId !== context.runningProcessId &&
            !state.queue.includes(process.programId)
        ) {
            state.queue.push(process.programId);
        }
    });

    if (context.runningProcessId) {
        return {
            selectedProgramId: context.runningProcessId,
            nextState: state,
        };
    }

    const nextProgramId = state.queue.shift() ?? processes[0].programId;

    return {
        selectedProgramId: nextProgramId,
        nextState: state,
    };
}

export default function fifoPolicyFactory(id: number): Policy<FifoState> {
    return {
        id,
        name: "FIFO",
        description: "First In, First Out (FIFO) is the most basic algorithm. It runs processes to completion in the order that they arrive.",
        isPreemptive: false,
        canTellTheFuture: false,
        initialState: initialFifoState,
        scheduler: fifo_scheduler
    }
}