import type Policy from "../types/policy";
import type { SchedulerContext, SchedulerDecision } from "../types/policy";
import type Process from "../types/process";

interface FifoState {
    queue: number[];
}

function initialFifoState(): FifoState {
    return { queue: [] };
}

function fifo_scheduler(
    processes: readonly Process[],
    state: FifoState,
    context: SchedulerContext
): SchedulerDecision<FifoState> {
    processes.forEach((process) => {
        if (
            process.program.id !== context.runningProcessId &&
            !state.queue.includes(process.program.id)
        ) {
            state.queue.push(process.program.id);
        }
    });

    if (context.runningProcessId) {
        return {
            selectedProgramId: context.runningProcessId,
            nextState: state,
        };
    }

    const nextProgramId = state.queue.shift() ?? processes[0].program.id;

    return {
        selectedProgramId: nextProgramId,
        nextState: state,
    };
}

const FIFO_POLICY: Policy<FifoState> = {
    id: 1,
    name: "FIFO",
    description: "First In, First Out (FIFO) is the most basic algorithm. It runs processes to completion in the order that they arrive.",
    isPreemptive: false,
    initialState: initialFifoState,
    scheduler: fifo_scheduler
}

export default FIFO_POLICY;