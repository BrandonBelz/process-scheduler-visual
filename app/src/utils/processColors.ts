import type { CSSProperties } from "react";

// The palette in App.css has this many distinct process colors.
const PROCESS_COLOR_COUNT = 8;

// Picks the CSS variable slot for a process; later processes share a neutral slot.
function colorSlot(programId: number): string {
  return programId < PROCESS_COLOR_COUNT ? String(programId) : "other";
}

/** A fill in the process's color with a label color that reads on it. */
export function processFillStyle(programId: number): CSSProperties {
  const slot = colorSlot(programId);
  return {
    background: `var(--process-${slot}-bg)`,
    color: `var(--process-${slot}-fg)`,
  };
}

/** A small marker in the process's color, for use beside text. */
export function processMarkerStyle(programId: number): CSSProperties {
  return { background: `var(--process-${colorSlot(programId)}-bg)` };
}
