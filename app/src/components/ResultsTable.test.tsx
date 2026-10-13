import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateAllStatistics, runSimulations } from "../core/api";
import fifoPolicyFactory from "../core/schedulers/fifo";
import ResultsTable from "./ResultsTable";

describe("ResultsTable", () => {
  it("joins values by program ID and displays supplied averages", () => {
    const html = renderToStaticMarkup(
      <ResultsTable
        statistics={[
          {
            name: "Turnaround Time",
            results: {
              values: [
                { programId: 7, value: 3 },
                { programId: 2, value: 4 },
              ],
              average: 3.5,
            },
          },
          {
            name: "Response Time",
            results: {
              values: [
                { programId: 2, value: 3 },
                { programId: 7, value: 0 },
              ],
              average: 1 / 3,
            },
          },
        ]}
      />,
    );
    expect(html).toContain('<th scope="col">Turnaround Time</th>');
    expect(html).toContain('<th scope="col">Response Time</th>');
    expect(html).toContain('<th scope="row">P7</th><td>3</td><td>0</td>');
    expect(html).toContain('<th scope="row">P2</th><td>4</td><td>3</td>');
    expect(html).toContain(
      '<th scope="row">Mean</th><td>3.50</td><td>0.33</td>',
    );
  });

  it("renders computed statistics for I/O and delayed arrivals", () => {
    const policy = fifoPolicyFactory(12);
    const runs = runSimulations(
      [
        {
          id: 7,
          arrivalTime: 2,
          executionTime: 3,
          ioSetting: { interval: 1, length: 1 },
        },
        { id: 2, arrivalTime: 3, executionTime: 2 },
      ],
      [policy],
    );
    const html = renderToStaticMarkup(
      <ResultsTable statistics={calculateAllStatistics(runs)[policy.id]} />,
    );
    // P7 runs at 2, 5, 7 and completes at 8; P2 runs at 3, 4.
    expect(html).toContain('<th scope="row">P7</th><td>0</td><td>6</td>');
    expect(html).toContain('<th scope="row">P2</th><td>0</td><td>2</td>');
    expect(html).toContain(
      '<th scope="row">Mean</th><td>0.00</td><td>4.00</td>',
    );
  });

  it("shows a placeholder for a missing process value", () => {
    const html = renderToStaticMarkup(
      <ResultsTable
        statistics={[
          { name: "Response Time", results: { values: [], average: 0 } },
          {
            name: "Turnaround Time",
            results: { values: [{ programId: 4, value: 2 }], average: 2 },
          },
        ]}
      />,
    );
    expect(html).toContain('<th scope="row">P4</th><td>—</td><td>2</td>');
  });

  it("handles absent statistics and empty simulation output", () => {
    for (const statistics of [[], calculateAllStatistics({ 12: [] })[12]]) {
      expect(
        renderToStaticMarkup(<ResultsTable statistics={statistics} />),
      ).toBe("<p>No results available.</p>");
    }
  });
});
