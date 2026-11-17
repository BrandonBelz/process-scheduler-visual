import { describe, it, expect } from "vitest";
import { getPolicies } from "./api";
import type { ConfigField } from "./types/policy";
import {
  parseWholeNumber,
  validateWorkload,
  type PolicyInput,
  type ProgramInput,
} from "./validation";

const validProgram: ProgramInput = { executionTime: "3", arrivalTime: "0" };
const timeSliceField: ConfigField = {
  key: "timeSlice",
  label: "Time slice",
  min: 1,
  max: 20,
};
const fifoInput: PolicyInput = { configFields: [], config: {} };

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
      policies: [
        fifoInput,
        { configFields: [timeSliceField], config: { timeSlice: "2" } },
      ],
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
      policyConfigs: [{}, { timeSlice: 2 }],
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
      policies: [fifoInput],
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
        policies: [{}],
      },
    });
  });

  it("should ignore I/O fields when I/O is disabled", () => {
    const result = validateWorkload({
      programs: [validProgram],
      policies: [fifoInput],
    });

    expect(result.valid).toBe(true);
    if (result.valid) expect(result.programs[0].ioSetting).toBeUndefined();
  });

  it("should require between 1 and 10 programs", () => {
    const empty = validateWorkload({
      programs: [],
      policies: [fifoInput],
    });
    const tooMany = validateWorkload({
      programs: Array(11).fill(validProgram),
      policies: [fifoInput],
    });
    const atLimit = validateWorkload({
      programs: Array(10).fill(validProgram),
      policies: [fifoInput],
    });

    expect(empty.valid).toBe(false);
    if (!empty.valid) {
      expect(empty.errors.programCount).toBe("Add between 1 and 10 processes.");
    }
    expect(tooMany.valid).toBe(false);
    expect(atLimit.valid).toBe(true);
  });

  it("should require between 1 and 5 policies, counting duplicates", () => {
    const empty = validateWorkload({ programs: [validProgram], policies: [] });
    const tooMany = validateWorkload({
      programs: [validProgram],
      policies: Array(6).fill(fifoInput),
    });
    const atLimit = validateWorkload({
      programs: [validProgram],
      policies: Array(5).fill(fifoInput),
    });

    expect(empty.valid).toBe(false);
    if (!empty.valid) {
      expect(empty.errors.policyCount).toBe("Add between 1 and 5 policies.");
    }
    expect(tooMany.valid).toBe(false);
    expect(atLimit.valid).toBe(true);
  });

  it("should validate each policy's config fields against their limits", () => {
    const quantumField = { ...timeSliceField, key: "quantum" };
    const result = validateWorkload({
      programs: [validProgram],
      policies: [
        {
          configFields: [timeSliceField, quantumField],
          config: { timeSlice: "21", unknownField: "x" },
        },
        fifoInput,
        { configFields: [timeSliceField], config: { timeSlice: "abc" } },
      ],
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.policies).toEqual([
        {
          timeSlice: "Must be between 1 and 20.",
          quantum: "Required.",
        },
        {},
        { timeSlice: "Must be a number." },
      ]);
    }
  });

  it("should keep identical policy instances separate", () => {
    const roundRobinInput: PolicyInput = {
      configFields: [timeSliceField],
      config: { timeSlice: "2" },
    };
    const result = validateWorkload({
      programs: [validProgram],
      policies: [roundRobinInput, roundRobinInput],
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.policyConfigs).toEqual([
        { timeSlice: 2 },
        { timeSlice: 2 },
      ]);
      expect(result.policyConfigs[0]).not.toBe(result.policyConfigs[1]);
    }
  });
});

describe("policy config fields", () => {
  it("should report only fields whose config defaults are within their limits", () => {
    getPolicies().forEach((policy) => {
      policy.getConfigFields().forEach(({ key, min, max }) => {
        expect(policy.config).toHaveProperty(key);
        expect(policy.config[key]).toBeGreaterThanOrEqual(min);
        expect(policy.config[key]).toBeLessThanOrEqual(max);
      });
    });
  });

  it("should expose a time slice config field for Round Robin", () => {
    const roundRobin = getPolicies().find(
      (policy) => policy.name === "Round Robin",
    );

    expect(roundRobin?.getConfigFields().map(({ key }) => key)).toEqual([
      "timeSlice",
    ]);
  });

  it("should default Round Robin to a two-cycle time slice (FR-022)", () => {
    const roundRobin = getPolicies().find(
      (policy) => policy.name === "Round Robin",
    );

    expect(roundRobin?.config).toEqual({ timeSlice: 2 });
  });
});
