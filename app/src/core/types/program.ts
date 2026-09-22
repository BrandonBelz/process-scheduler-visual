import type ioSetting from "./ioSetting";

export default interface Program {
  id: number;
  executionTime: number;
  arrivalTime: number;
  ioSetting?: ioSetting;
}
