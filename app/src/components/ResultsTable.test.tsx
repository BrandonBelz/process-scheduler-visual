import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ResultsTable from "./ResultsTable";

describe("ResultsTable", () => {
  it("renders per-process metrics and means rounded to two decimals", () => {
    const html = renderToStaticMarkup(
      <ResultsTable
        metrics={{
          processes: [
            { programId: 0, turnaroundTime: 3, responseTime: 0 },
            { programId: 1, turnaroundTime: 4, responseTime: 3 },
          ],
          meanTurnaroundTime: 7 / 2,
          meanResponseTime: 1 / 3,
        }}
      />,
    );

    expect(html).toContain('<th scope="row">P0</th><td>3</td><td>0</td>');
    expect(html).toContain('<th scope="row">P1</th><td>4</td><td>3</td>');
    expect(html).toContain(
      '<th scope="row">Mean</th><td>3.50</td><td>0.33</td>',
    );
  });
});
