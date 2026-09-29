import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ProcessTimeline from "./ProcessTimeline";
import { ProcessState } from "../core/types/processState";
import type Process from "../core/types/process";

const processes: Process[] = [
  {
    program: { id: 0, executionTime: 1, arrivalTime: 0 },
    stateHistory: [ProcessState.RUNNING, ProcessState.COMPLETED],
  },
  {
    program: { id: 1, executionTime: 1, arrivalTime: 0 },
    stateHistory: [ProcessState.READY, ProcessState.BLOCKED],
  },
];

describe("ProcessTimeline", () => {
  it("renders one labeled cell per process per cycle", () => {
    const html = renderToStaticMarkup(
      <ProcessTimeline processes={processes} />,
    );

    expect(html).toContain(">P0<");
    expect(html).toContain(">P1<");
    expect(html).toContain('title="P0, cycle 0: Running"');
    expect(html).toContain('title="P0, cycle 1: Completed"');
    expect(html).toContain('title="P1, cycle 0: Ready"');
    expect(html).toContain('title="P1, cycle 1: Blocked"');
  });

  it("sizes the grid to the longest history", () => {
    const html = renderToStaticMarkup(
      <ProcessTimeline processes={processes} />,
    );

    expect(html).toContain("repeat(2, 2rem)");
  });

  it("includes every state in the legend", () => {
    const html = renderToStaticMarkup(<ProcessTimeline processes={[]} />);

    for (const label of [
      "Running",
      "Ready",
      "Blocked",
      "Completed",
      "Not started",
    ]) {
      expect(html).toContain(`</span>${label}</li>`);
    }
  });
});
