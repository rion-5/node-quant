export interface PageData {
  startDate: string;
  endDate: string;
  momentumData: {
    ticker: string;
    first_date: string;
    last_date: string;
    first_close: number;
    last_close: number;
    avg_volume: number;
    sortino_ratio: number;
    return_rate: number;
    rsi: number;
    revenue_growth: number;
    debt_to_equity: number;
    pbr: number;
  }[];
  error: string | null;
}