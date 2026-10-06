import { calculateAllStatistics, runSimulations } from "./core/api";
import fifoPolicyFactory from "./core/schedulers/fifo";
import type Program from "./core/types/program";
import ProcessTimeline from "./components/ProcessTimeline";
import ResultsTable from "./components/ResultsTable";
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
const simulationResults = runSimulations(programs, [fifo]);
const statistics = calculateAllStatistics(simulationResults);

function App() {
  return (
    <main className="app">
      <h1>{fifo.name}</h1>
      <ProcessTimeline processes={simulationResults[fifo.id]} />
      <h2>Results</h2>
      <ResultsTable statistics={statistics[fifo.id]} />
    </main>
  );
}

export default App;
