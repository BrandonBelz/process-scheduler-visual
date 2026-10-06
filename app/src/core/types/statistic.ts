export interface StatisticResult {
  values: {
    programId: number;
    value: number;
  }[];
  average: number;
}

export interface Statistic {
  name: string;
  results: StatisticResult;
}
