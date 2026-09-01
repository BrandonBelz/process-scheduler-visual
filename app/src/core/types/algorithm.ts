import type Program from './program';
import type { ProcessState } from './processState';

export default interface Algorithm {
  id: number;
  name: string;
  description: string;
  isPreemptive: boolean;
  scheduler: (programs: Program[]) => ProcessState[][];
}
