import type Process from "./process";

export default interface Policy {
  id: number;
  name: string;
  description: string;
  isPreemptive: boolean;
  scheduler: (processes: readonly Process[]) => number;
}
