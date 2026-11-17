import type { Statistic } from "../core/types/statistic";
import styles from "./ComparisonTable.module.css";

/** One policy instance's statistics, labeled for display. */
export interface ComparisonInstance {
  id: number;
  title: string;
  statistics: Statistic[];
}

interface ComparisonTableProps {
  instances: ComparisonInstance[];
}

// Compares the same workload across policy instances (FR-006): means first, then each process.
export default function ComparisonTable({ instances }: ComparisonTableProps) {
  // Every instance reports the same statistics in API order.
  const statisticNames =
    instances[0]?.statistics.map((statistic) => statistic.name) ?? [];

  if (statisticNames.length === 0) {
    return <p>No results available.</p>;
  }

  return (
    <>
      <h2>Averages</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Policy</th>
            {statisticNames.map((name) => (
              <th scope="col" key={name}>
                Mean {name.toLowerCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {instances.map((instance) => (
            <tr key={instance.id}>
              <th scope="row">{instance.title}</th>
              {statisticNames.map((name) => (
                <td key={name}>
                  {findStatistic(instance, name)?.results.average.toFixed(2) ??
                    "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {statisticNames.map((name) => (
        <section key={name}>
          <h2>{name} by process</h2>
          <ProcessComparison instances={instances} statisticName={name} />
        </section>
      ))}
    </>
  );
}

function findStatistic(
  instance: ComparisonInstance,
  name: string,
): Statistic | undefined {
  return instance.statistics.find((statistic) => statistic.name === name);
}

// One statistic per process, with a column per instance.
function ProcessComparison({
  instances,
  statisticName,
}: {
  instances: ComparisonInstance[];
  statisticName: string;
}) {
  const columns = instances.map((instance) => ({
    instance,
    statistic: findStatistic(instance, statisticName),
  }));
  const programIds = [
    ...new Set(
      columns.flatMap(
        ({ statistic }) =>
          statistic?.results.values.map(({ programId }) => programId) ?? [],
      ),
    ),
  ];

  return (
    <div className={styles.scroller}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Process</th>
            {columns.map(({ instance }) => (
              <th scope="col" key={instance.id}>
                {instance.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {programIds.map((programId) => (
            <tr key={programId}>
              <th scope="row" className={styles.process}>
                P{programId}
              </th>
              {columns.map(({ instance, statistic }) => (
                <td key={instance.id}>
                  {statistic?.results.values.find(
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
            {columns.map(({ instance, statistic }) => (
              <td key={instance.id}>
                {statistic?.results.average.toFixed(2) ?? "—"}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
