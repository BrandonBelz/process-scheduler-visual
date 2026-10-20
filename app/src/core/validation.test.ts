import { describe, it, expect } from "vitest";
import { getPolicies } from "./api";
import {
  CONFIG_FIELD_LIMITS,
  parseWholeNumber,
  validateWorkload,
  type ProgramInput,
} from "./validation";

const validProgram: ProgramInput = { executionTime: "3", arrivalTime: "0" };

describe("parseWholeNumber", () => {
  const range = { min: 1, max: 20 };

  it("should accept whole numbers within the range, ignoring whitespace", () => {
    expect(parseWholeNumber("1", range)).toEqual({ value: 1 });
    expect(parseWholeNumber(" 20 ", range)).toEqual({ value: 20 });
  });

  it("should reject missing, nonnumeric, fractional, and out-of-range values", () => {
    expect(parseWholeNumber("", range).error).toBe("Required.");
    expect(parseWholeNumber("   ", range).error).toBe("Required.");
    expect(parseWholeNumber("abc", range).error).toBe("Must be a number.");
    expect(parseWholeNumber("2.5", range).error).toBe(
      "Must be a whole number.",
    );
    expect(parseWholeNumber("0", range).error).toBe(
      "Must be between 1 and 20.",
    );
    expect(parseWholeNumber("21", range).error).toBe(
      "Must be between 1 and 20.",
    );
    expect(parseWholeNumber("-3", range).error).toBe(
      "Must be between 1 and 20.",
    );
  });

  it("should reject number forms other than plain decimal digits", () => {
    ["1e1", "0x14", "0b11", "5.", "+5", "Infinity"].forEach((raw) => {
      expect(parseWholeNumber(raw, range).error).toBe("Must be a number.");
    });
    expect(parseWholeNumber(".5", range).error).toBe("Must be a whole number.");
  });

  it("should read negative zero as zero", () => {
    expect(parseWholeNumber("-0", { min: 0, max: 20 }).value).toBe(0);
  });
});

describe("validateWorkload", () => {
  it("should convert valid input to programs numbered by position", () => {
    const result = validateWorkload({
      programs: [
        { executionTime: "3", arrivalTime: "0" },
        {
          executionTime: "4",
          arrivalTime: "2",
          io: { interval: "2", length: "3" },
        },
      ],
      policyConfig: { timeSlice: "2" },
    });

    expect(result).toEqual({
      valid: true,
      programs: [
        { id: 0, executionTime: 3, arrivalTime: 0 },
        {
          id: 1,
          executionTime: 4,
          arrivalTime: 2,
          ioSetting: { interval: 2, length: 3 },
        },
      ],
      policyConfig: { timeSlice: 2 },
    });
  });

  it("should report errors beside the affected program fields", () => {
    const result = validateWorkload({
      programs: [
        validProgram,
        {
          executionTime: "0",
          arrivalTime: "x",
          io: { interval: "1.5", length: "" },
        },
      ],
      policyConfig: {},
    });

    expect(result).toEqual({
      valid: false,
      errors: {
        programs: [
          {},
          {
            executionTime: "Must be between 1 and 20.",
            arrivalTime: "Must be a number.",
            ioInterval: "Must be a whole number.",
            ioLength: "Required.",
          },
        ],
        policyConfig: {},
      },
    });
  });

  it("should ignore I/O fields when I/O is disabled", () => {
    const result = validateWorkload({
      programs: [validProgram],
      policyConfig: {},
    });

    expect(result.valid).toBe(true);
    if (result.valid) expect(result.programs[0].ioSetting).toBeUndefined();
  });

  it("should require between 1 and 10 programs", () => {
    const empty = validateWorkload({ programs: [], policyConfig: {} });
    const tooMany = validateWorkload({
      programs: Array(11).fill(validProgram),
      policyConfig: {},
    });
    const atLimit = validateWorkload({
      programs: Array(10).fill(validProgram),
      policyConfig: {},
    });

    expect(empty.valid).toBe(false);
    if (!empty.valid) {
      expect(empty.errors.programCount).toBe("Add between 1 and 10 processes.");
    }
    expect(tooMany.valid).toBe(false);
    expect(atLimit.valid).toBe(true);
  });

  it("should validate policy config fields against their limits", () => {
    const result = validateWorkload({
      programs: [validProgram],
      policyConfig: { timeSlice: "21", unknownField: "1" },
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.policyConfig).toEqual({
        timeSlice: "Must be between 1 and 20.",
        unknownField: 'No limits are defined for "unknownField".',
      });
    }
  });
});

describe("policy config fields", () => {
  it("should report only fields that exist in the policy config and have limits", () => {
    getPolicies().forEach((policy) => {
      policy.getConfigFields().forEach((field) => {
        expect(policy.config).toHaveProperty(field);
        expect(CONFIG_FIELD_LIMITS).toHaveProperty(field);
      });
    });
  });

  it("should expose the time slice for Round Robin only", () => {
    const fields = Object.fromEntries(
      getPolicies().map((policy) => [policy.name, policy.getConfigFields()]),
    );

    expect(fields).toEqual({
      FIFO: [],
      SJF: [],
      STCF: [],
      "Round Robin": ["timeSlice"],
    });
  });

  it("should default Round Robin to a two-cycle time slice (FR-022)", () => {
    const roundRobin = getPolicies().find(
      (policy) => policy.name === "Round Robin",
    );

    expect(roundRobin?.config).toEqual({ timeSlice: 2 });
  });
});
