// src/routes/api/get-momentum-ranking/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { queryDate, weights } = await request.json();
    if (!queryDate || !weights) {
      return json({ error: 'queryDate and weights required' }, { status: 400 });
    }

    const data = await query<{
      ticker: string;
      return_rate: number;
      sortino_ratio: number;
      rsi: number;
      revenue_growth: number;
      debt_to_equity: number;
      pbr: number;
      first_date: string;
      last_date: string;
      first_close: number;
      last_close: number;
      avg_volume: number;
      six_month_change: number;
    }>(`
      SELECT *
      FROM momentum_data
      WHERE query_date = $1
    `, [queryDate]);

    if (data.length === 0) {
      return json({ error: 'No data for selected date' }, { status: 404 });
    }

    // 문자열을 숫자로 변환
    const parsedData = data.map(row => ({
      ...row,
      return_rate: parseFloat(row.return_rate as any),
      sortino_ratio: parseFloat(row.sortino_ratio as any),
      rsi: parseFloat(row.rsi as any),
      revenue_growth: parseFloat(row.revenue_growth as any),
      debt_to_equity: parseFloat(row.debt_to_equity as any),
      pbr: parseFloat(row.pbr as any),
      first_close: parseFloat(row.first_close as any),
      last_close: parseFloat(row.last_close as any),
      avg_volume: parseFloat(row.avg_volume as any),
      six_month_change: parseFloat(row.six_month_change as any)
    }));

    // 각 지표 min/max 계산
    const minMax = {
      return_rate: { min: Math.min(...parsedData.map(r => r.return_rate)), max: Math.max(...parsedData.map(r => r.return_rate)) },
      sortino_ratio: { min: Math.min(...parsedData.map(r => r.sortino_ratio)), max: Math.max(...parsedData.map(r => r.sortino_ratio)) },
      revenue_growth: { min: Math.min(...parsedData.map(r => r.revenue_growth)), max: Math.max(...parsedData.map(r => r.revenue_growth)) },
      debt_to_equity: { min: Math.min(...parsedData.map(r => r.debt_to_equity)), max: Math.max(...parsedData.map(r => r.debt_to_equity)) },
      pbr: { min: Math.min(...parsedData.map(r => r.pbr)), max: Math.max(...parsedData.map(r => r.pbr)) },
      rsi: { min: 30, max: 70 } // RSI 특수: 30-70 매핑
    };

    // 정규화 함수
    const normalizePositive = (x: number, min: number, max: number) => (max - min) > 0 ? (x - min) / (max - min) : 0;
    const normalizeNegative = (x: number, min: number, max: number) => 1 - normalizePositive(x, min, max);
    const normalizeRSI = (x: number) => Math.min((x - 30) / 40, 1);

    // 정규화 및 점수 계산
    const ranked = parsedData.map(row => {
      const norm = {
        return_rate: normalizePositive(row.return_rate, minMax.return_rate.min, minMax.return_rate.max),
        sortino_ratio: normalizePositive(row.sortino_ratio, minMax.sortino_ratio.min, minMax.sortino_ratio.max),
        revenue_growth: normalizePositive(row.revenue_growth, minMax.revenue_growth.min, minMax.revenue_growth.max),
        debt_to_equity: normalizeNegative(row.debt_to_equity, minMax.debt_to_equity.min, minMax.debt_to_equity.max),
        pbr: normalizeNegative(row.pbr, minMax.pbr.min, minMax.pbr.max),
        rsi: normalizeRSI(row.rsi)
      };

      const score = 
        norm.return_rate * weights.return_rate +
        norm.sortino_ratio * weights.sortino_ratio +
        norm.revenue_growth * weights.revenue_growth +
        norm.debt_to_equity * weights.debt_to_equity +
        norm.pbr * weights.pbr +
        norm.rsi * weights.rsi;

      return { ...row, score, norm };
    }).sort((a, b) => b.score - a.score);

    return json({ data: ranked }, { status: 200 });
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Failed to get ranking' }, { status: 500 });
  }
};