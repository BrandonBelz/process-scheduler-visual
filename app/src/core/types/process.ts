import type Program from "./program";
import type { ProcessState } from "./processState";

export default interface Process {
  program: Program;
  stateHistory: ProcessState[];
}
