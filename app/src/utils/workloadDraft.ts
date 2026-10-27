import { getPolicies, getPolicy } from "../core/api";
import type Policy from "../core/types/policy";
import type { WorkloadInput } from "../core/validation";

export const POLICIES = getPolicies();

/** Editable form state for one program; numbers stay as text until validated. */
export interface ProgramDraft {
  key: string;
  executionTime: string;
  arrivalTime: string;
  ioEnabled: boolean;
  ioInterval: string;
  ioLength: string;
}

export interface WorkloadDraft {
  programs: ProgramDraft[];
  policyName: string;
  policyConfig: Record<string, string>;
}

// A counter rather than crypto.randomUUID(), which only exists on HTTPS and localhost.
let nextProgramKey = 0;

export function createProgramDraft(
  values: Partial<Omit<ProgramDraft, "key">> = {},
): ProgramDraft {
  return {
    key: String(nextProgramKey++),
    executionTime: "5",
    arrivalTime: "0",
    ioEnabled: false,
    ioInterval: "2",
    ioLength: "2",
    ...values,
  };
}

// Falls back to the first policy so the form always has one selected.
export function findPolicy(name: string): Policy {
  return getPolicy(name) ?? POLICIES[0];
}

// Starts a policy's editable fields from its core defaults.
export function defaultPolicyConfig(policy: Policy): Record<string, string> {
  return Object.fromEntries(
    policy
      .getConfigFields()
      .map(({ key }) => [key, String(policy.config[key])]),
  );
}

// Prefilled example shown on a fresh visit (FR-019).
export function createDefaultWorkload(): WorkloadDraft {
  const policy = POLICIES[0];
  return {
    programs: [
      createProgramDraft({ executionTime: "3" }),
      createProgramDraft({ executionTime: "4", ioEnabled: true }),
      createProgramDraft({ executionTime: "2" }),
    ],
    policyName: policy.name,
    policyConfig: defaultPolicyConfig(policy),
  };
}

export function toWorkloadInput(draft: WorkloadDraft): WorkloadInput {
  return {
    programs: draft.programs.map((program) => ({
      executionTime: program.executionTime,
      arrivalTime: program.arrivalTime,
      io: program.ioEnabled
        ? { interval: program.ioInterval, length: program.ioLength }
        : undefined,
    })),
    configFields: findPolicy(draft.policyName).getConfigFields(),
    policyConfig: draft.policyConfig,
  };
}
