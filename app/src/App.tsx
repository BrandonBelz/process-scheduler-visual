import { runSimulations } from "./core/api";
import fifoPolicyFactory from "./core/schedulers/fifo";
import type Program from "./core/types/program";
import ProcessTimeline from "./components/ProcessTimeline";
import ResultsTable, { type RunMetrics } from "./components/ResultsTable";
import "./App.css";

const programs: Program[] = [
  { id: 0, executionTime: 3, arrivalTime: 0 },
  {
    id: 1,
    executionTime: 4,
    arrivalTime: 0,
    ioSetting: { interval: 2, length: 2 },
  },
  { id: 2, executionTime: 2, arrivalTime: 0 },
];

const fifo = fifoPolicyFactory(1);
const processes = runSimulations(programs, [fifo])[fifo.id];

// Temporary until core provides a metrics function; values match the run above.
const mockMetrics: RunMetrics = {
  processes: [
    { programId: 0, turnaroundTime: 3, responseTime: 0 },
    { programId: 1, turnaroundTime: 9, responseTime: 3 },
    { programId: 2, turnaroundTime: 7, responseTime: 5 },
  ],
  meanTurnaroundTime: 19 / 3,
  meanResponseTime: 8 / 3,
};

function App() {
  return (
    <main className="app">
      <h1>{fifo.name}</h1>
      <ProcessTimeline processes={processes} />
      <h2>Results</h2>
      <ResultsTable metrics={mockMetrics} />
    </main>
  );
}

export default App;
