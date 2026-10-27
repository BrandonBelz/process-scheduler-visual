import type { ConfigField } from "./types/policy";
import type Program from "./types/program";

export interface NumberRange {
  min: number;
  max: number;
}

export const PROGRAM_COUNT_LIMITS: NumberRange = { min: 1, max: 10 };

export const PROGRAM_FIELD_LIMITS = {
  executionTime: { min: 1, max: 20 },
  arrivalTime: { min: 0, max: 20 },
  ioInterval: { min: 1, max: 10 },
  ioLength: { min: 1, max: 10 },
} satisfies Record<string, NumberRange>;

/** Raw user input for one program; `io` is omitted when I/O is disabled. */
export interface ProgramInput {
  executionTime: string;
  arrivalTime: string;
  io?: { interval: string; length: string };
}

export type ProgramField = keyof typeof PROGRAM_FIELD_LIMITS;

export type ProgramErrors = Partial<Record<ProgramField, string>>;

export interface WorkloadInput {
  programs: ProgramInput[];
  /** The selected policy's fields, which `policyConfig` is checked against. */
  configFields: ConfigField[];
  policyConfig: Record<string, string>;
}

export interface WorkloadErrors {
  programCount?: string;
  /** Index-aligned with the input programs. */
  programs: ProgramErrors[];
  policyConfig: Record<string, string>;
}

export type WorkloadValidation =
  | {
      valid: true;
      programs: Program[];
      policyConfig: Record<string, number>;
    }
  | { valid: false; errors: WorkloadErrors };

interface ParsedNumber {
  value?: number;
  error?: string;
}

// Plain decimal notation only; Number() alone also accepts forms like "1e1", "0x14", and "5.".
const DECIMAL_PATTERN = /^-?(\d+|\d*\.\d+)$/;
const WHOLE_NUMBER_PATTERN = /^-?\d+$/;

export function parseWholeNumber(
  raw: string,
  range: NumberRange,
): ParsedNumber {
  const trimmed = raw.trim();
  if (trimmed === "") return { error: "Required." };
  if (!DECIMAL_PATTERN.test(trimmed)) return { error: "Must be a number." };
  if (!WHOLE_NUMBER_PATTERN.test(trimmed)) {
    return { error: "Must be a whole number." };
  }

  // Adding 0 turns "-0" into 0.
  const value = Number(trimmed) + 0;
  if (value < range.min || value > range.max) {
    return { error: `Must be between ${range.min} and ${range.max}.` };
  }
  return { value };
}

// Validates raw workload input and, when valid, converts it to programs numbered by position.
export function validateWorkload(input: WorkloadInput): WorkloadValidation {
  const errors: WorkloadErrors = { programs: [], policyConfig: {} };
  let hasErrors = false;

  const { min, max } = PROGRAM_COUNT_LIMITS;
  if (input.programs.length < min || input.programs.length > max) {
    errors.programCount = `Add between ${min} and ${max} processes.`;
    hasErrors = true;
  }

  const programs = input.programs.map((programInput, index) => {
    const fields: [ProgramField, string | undefined][] = [
      ["executionTime", programInput.executionTime],
      ["arrivalTime", programInput.arrivalTime],
      ["ioInterval", programInput.io?.interval],
      ["ioLength", programInput.io?.length],
    ];
    const programErrors: ProgramErrors = {};
    const values: Partial<Record<ProgramField, number>> = {};

    fields.forEach(([field, raw]) => {
      if (raw === undefined) return;
      const parsed = parseWholeNumber(raw, PROGRAM_FIELD_LIMITS[field]);
      if (parsed.error !== undefined) {
        programErrors[field] = parsed.error;
        hasErrors = true;
      } else {
        values[field] = parsed.value;
      }
    });
    errors.programs.push(programErrors);

    const program: Program = {
      id: index,
      executionTime: values.executionTime!,
      arrivalTime: values.arrivalTime!,
    };
    if (programInput.io !== undefined) {
      program.ioSetting = {
        interval: values.ioInterval!,
        length: values.ioLength!,
      };
    }
    return program;
  });

  const policyConfig: Record<string, number> = {};
  input.configFields.forEach((field) => {
    const parsed = parseWholeNumber(input.policyConfig[field.key] ?? "", field);
    if (parsed.error !== undefined) {
      errors.policyConfig[field.key] = parsed.error;
      hasErrors = true;
    } else {
      policyConfig[field.key] = parsed.value!;
    }
  });

  return hasErrors
    ? { valid: false, errors }
    : { valid: true, programs, policyConfig };
}
