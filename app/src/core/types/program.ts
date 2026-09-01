import type ioSetting from "./ioSetting";

export default interface Program {
  id: number;
  executionTime: number;
  ioSetting?: ioSetting;
}
