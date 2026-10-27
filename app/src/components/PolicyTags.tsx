import type Policy from "../core/types/policy";
import styles from "./PolicyTags.module.css";

interface PolicyTag {
  label: string;
  explanation: string;
}

// Describes a policy's scheduling traits in plain language.
function describeTraits({
  isPreemptive,
  canTellTheFuture,
}: Pick<Policy, "isPreemptive" | "canTellTheFuture">): PolicyTag[] {
  return [
    isPreemptive
      ? {
          label: "Preemptive",
          explanation: "Can pause a running process to run a different one.",
        }
      : {
          label: "Non-preemptive",
          explanation: "Runs each process until it blocks for I/O or finishes.",
        },
    canTellTheFuture
      ? {
          label: "Uses future knowledge",
          explanation:
            "Knows how long each process will run before its next I/O or completion, which a real operating system cannot know.",
        }
      : {
          label: "No future knowledge",
          explanation:
            "Decides using only what a real operating system can observe.",
        },
  ];
}

export default function PolicyTags({ policy }: { policy: Policy }) {
  return (
    <ul className={styles.tags} aria-label="Policy traits">
      {describeTraits(policy).map(({ label, explanation }) => (
        <li key={label} className={styles.tag} title={explanation}>
          {label}
        </li>
      ))}
    </ul>
  );
}
