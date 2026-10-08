import type { Statistic } from "../core/types/statistic";
import styles from "./ResultsTable.module.css";

interface ResultsTableProps {
  statistics: Statistic[];
}

// Statistics are column-oriented; join their values by program ID for each row.
export default function ResultsTable({ statistics }: ResultsTableProps) {
  const programIds = [
    ...new Set(
      statistics.flatMap((statistic) =>
        statistic.results.values.map(({ programId }) => programId),
      ),
    ),
  ];

  if (programIds.length === 0) {
    return <p>No results available.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Process</th>
          {statistics.map((statistic) => (
            <th scope="col" key={statistic.name}>
              {statistic.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {programIds.map((programId) => (
          <tr key={programId}>
            <th scope="row">P{programId}</th>
            {statistics.map((statistic) => (
              <td key={statistic.name}>
                {statistic.results.values.find(
                  (value) => value.programId === programId,
                )?.value ?? "—"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row">Mean</th>
          {statistics.map((statistic) => (
            <td key={statistic.name}>{statistic.results.average.toFixed(2)}</td>
          ))}
        </tr>
      </tfoot>
    </table>
  );
}
