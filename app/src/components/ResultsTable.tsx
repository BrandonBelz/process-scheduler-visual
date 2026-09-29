import styles from "./ResultsTable.module.css";

// temporary until core provides a metrics function; values match the test run.
export interface ProcessMetrics {
  programId: number;
  turnaroundTime: number;
  responseTime: number;
}

export interface RunMetrics {
  processes: ProcessMetrics[];
  meanTurnaroundTime: number;
  meanResponseTime: number;
}

interface ResultsTableProps {
  metrics: RunMetrics;
}

// ResultsTable component displays the metrics of a run in a table format. It takes in a RunMetrics object as a prop and renders the turnaround time and response time for each process, as well as the mean values for both metrics at the bottom of the table.
export default function ResultsTable({ metrics }: ResultsTableProps) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Process</th>
          <th scope="col">Turnaround</th>
          <th scope="col">Response</th>
        </tr>
      </thead>
      <tbody>
        {metrics.processes.map((process) => (
          <tr key={process.programId}>
            <th scope="row">P{process.programId}</th>
            <td>{process.turnaroundTime}</td>
            <td>{process.responseTime}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Mean</th>
          <td>{metrics.meanTurnaroundTime.toFixed(2)}</td>
          <td>{metrics.meanResponseTime.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
