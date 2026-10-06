import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import App from "./App";

describe("App", () => {
  it("renders the example timeline and calculated statistics", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('title="P1, cycle 8: Running"');
    expect(html).toContain('<th scope="row">P0</th><td>0</td><td>3</td>');
    expect(html).toContain('<th scope="row">P1</th><td>3</td><td>9</td>');
    expect(html).toContain('<th scope="row">P2</th><td>5</td><td>7</td>');
    expect(html).toContain(
      '<th scope="row">Mean</th><td>2.67</td><td>6.33</td>',
    );
  });
});
