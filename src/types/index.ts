export interface KpiMetric {
  id: string;
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  prefix?: string;
  suffix?: string;
}

export interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}
