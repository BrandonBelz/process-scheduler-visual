import type Policy from './types/policy';
import type Program from './types/program';
import type Process from './types/process';
import { ProcessState } from './types/processState';

interface ProcessSimulationState {
	process: Process;
	remainingExecution: number;
	cpuTicksSinceIo: number;
	blockedTicksRemaining: number;
	completed: boolean;
	completionRecorded: boolean;
}

interface SimulationState {
	processes: ProcessSimulationState[];
	runningIndex?: number;
}

// Creates the mutable runtime state used to simulate one policy.
function createSimulationState(programs: Program[]): SimulationState {
	return {
		processes: programs.map((program) => ({
			process: {
				program,
				stateHistory: [],
			},
			remainingExecution: program.executionTime,
			cpuTicksSinceIo: 0,
			blockedTicksRemaining: 0,
			completed: program.executionTime <= 0,
			completionRecorded: false,
		})),
	};
}

// Returns the indices of processes that can be scheduled on the current tick.
function getReadyIndices(state: SimulationState): number[] {
	return state.processes.reduce<number[]>((indices, processState, index) => {
		if (!processState.completed && processState.blockedTicksRemaining === 0) {
			indices.push(index);
		}
		return indices;
	}, []);
}

interface SelectionResult<TState> {
	selectedIndex: number | undefined;
	nextPolicyState: TState;
}

// Selects the next process, invoking the policy scheduler and enforcing non-preemptive execution.
function selectProcessIndex<TState>(
	policy: Policy<TState>,
	state: SimulationState,
	readyIndices: number[],
	policyState: TState,
	tick: number,
): SelectionResult<TState> {
	if (readyIndices.length === 0) {
		return {
			selectedIndex: undefined,
			nextPolicyState: policyState,
		};
	}

	const canPreempt =
		policy.isPreemptive ||
		state.runningIndex === undefined ||
		!readyIndices.includes(state.runningIndex);

	const runningProcessId =
		state.runningIndex !== undefined
			? state.processes[state.runningIndex].process.program.id
			: undefined;

	const decision = policy.scheduler(
		readyIndices.map((index) => state.processes[index].process),
		policyState,
		{
			tick,
			canPreempt,
			runningProcessId,
		},
	);

	let selectedIndex: number;
	if (!canPreempt) {
		selectedIndex = state.runningIndex!;
	} else {
		const selectedReadyIndex = decision.selectedIndex;
		if (
			!Number.isInteger(selectedReadyIndex) ||
			selectedReadyIndex < 0 ||
			selectedReadyIndex >= readyIndices.length
		) {
			throw new RangeError(
				`Policy ${policy.id} selected an invalid process index: ${selectedReadyIndex}`,
			);
		}
		selectedIndex = readyIndices[selectedReadyIndex];
	}

	return {
		selectedIndex,
		nextPolicyState: decision.nextState,
	};
}

// Advances one process by one tick and records its resulting state.
function advanceProcess(
	processState: ProcessSimulationState,
	index: number,
	selectedIndex: number | undefined,
	state: SimulationState,
): void {
	const { process } = processState;

	if (processState.completionRecorded || processState.completed) {
		process.stateHistory.push(ProcessState.COMPLETED);
		processState.completionRecorded = true;
		return;
	}

	if (processState.blockedTicksRemaining > 0) {
		process.stateHistory.push(ProcessState.BLOCKED);
		processState.blockedTicksRemaining -= 1;
		return;
	}

	if (index !== selectedIndex) {
		process.stateHistory.push(ProcessState.READY);
		return;
	}

	process.stateHistory.push(ProcessState.RUNNING);
	processState.remainingExecution -= 1;
	processState.cpuTicksSinceIo += 1;
	state.runningIndex = index;

	if (processState.remainingExecution === 0) {
		processState.completed = true;
		state.runningIndex = undefined;
		return;
	}

	const ioSetting = process.program.ioSetting;
	if (
		ioSetting !== undefined &&
		ioSetting.interval > 0 &&
		processState.cpuTicksSinceIo === ioSetting.interval
	) {
		processState.blockedTicksRemaining = ioSetting.length;
		processState.cpuTicksSinceIo = 0;
		state.runningIndex = undefined;
	}
}

// Reports whether every process has recorded its terminal completion state.
function isSimulationComplete(state: SimulationState): boolean {
	return state.processes.every((processState) => processState.completionRecorded);
}

// Runs every program once under each policy and returns the resulting histories.
export function runSimulations(programs: Program[], policies: Policy[]): Record<number, Process[]> {
	return Object.fromEntries(
		policies.map((policy) => {
			const state = createSimulationState(programs);
			let policyState = policy.initialState();
			let tick = 0;

			while (!isSimulationComplete(state)) {
				const { selectedIndex, nextPolicyState } = selectProcessIndex(
					policy,
					state,
					getReadyIndices(state),
					policyState,
					tick,
				);

				policyState = nextPolicyState;

				state.processes.forEach((processState, index) => {
					advanceProcess(
						processState,
						index,
						selectedIndex,
						state,
					);
				});

				tick += 1;
			}

			return [policy.id, state.processes.map(({ process }) => process)];
		}),
	);
}
