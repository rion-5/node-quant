// src/routes/api/get-momentum-ranking/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import { json } from '@sveltejs/kit';

interface MomentumRawData {
  ticker: string;
  return_rate_1m: number;
  return_rate_3m: number;
  return_rate_6m: number;
  sortino_ratio_1m: number;
  sortino_ratio_3m: number;
  sortino_ratio_6m: number;
  rsi: number;
  revenue_growth: number;
  debt_to_equity: number;
  pbr: number;
  first_date_1m: string;
  last_date_1m: string;
  first_date_3m: string;
  last_date_3m: string;
  first_date_6m: string;
  last_date_6m: string;
  first_close_1m: number;
  last_close_1m: number;
  first_close_3m: number;
  last_close_3m: number;
  first_close_6m: number;
  last_close_6m: number;
  avg_volume_1m: number;
  avg_volume_3m: number;
  avg_volume_6m: number;
  score_1m: number;
  score_3m: number;
  score_6m: number;
  final_momentum_score: number;
  created_at: string;
  updated_at: string;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { queryDate } = await request.json();

    if (!queryDate) {
      return json({ error: 'queryDate is required' }, { status: 400 });
    }

    // 해당 날짜의 모든 데이터 조회
    const data = await query<MomentumRawData>(`
      SELECT 
        ticker,
        return_rate_1m,
        return_rate_3m,
        return_rate_6m,
        sortino_ratio_1m,
        sortino_ratio_3m,
        sortino_ratio_6m,
        rsi,
        revenue_growth,
        debt_to_equity,
        pbr,
        first_date_1m,
        last_date_1m,
        first_date_3m,
        last_date_3m,
        first_date_6m,
        last_date_6m,
        first_close_1m,
        last_close_1m,
        first_close_3m,
        last_close_3m,
        first_close_6m,
        last_close_6m,
        avg_volume_1m,
        avg_volume_3m,
        avg_volume_6m,
        score_1m,
        score_3m,
        score_6m,
        final_momentum_score,
        created_at,
        updated_at
      FROM momentum_data
      WHERE query_date = $1
      AND final_momentum_score IS NOT NULL
      ORDER BY final_momentum_score DESC
      LIMIT 100
    `, [queryDate]);

    if (data.length === 0) {
      return json({ error: 'No data found for the selected date' }, { status: 404 });
    }

    // 숫자 변환 및 데이터 정리
    const processedData = data.map(row => ({
      ticker: row.ticker,
      // 1개월 데이터
      return_rate_1m: Number(row.return_rate_1m) || 0,
      sortino_ratio_1m: Number(row.sortino_ratio_1m) || 0,
      first_date_1m: row.first_date_1m,
      last_date_1m: row.last_date_1m,
      first_close_1m: Number(row.first_close_1m) || 0,
      last_close_1m: Number(row.last_close_1m) || 0,
      avg_volume_1m: Number(row.avg_volume_1m) || 0,
      score_1m: Number(row.score_1m) || 0,
      // 3개월 데이터
      return_rate_3m: Number(row.return_rate_3m) || 0,
      sortino_ratio_3m: Number(row.sortino_ratio_3m) || 0,
      first_date_3m: row.first_date_3m,
      last_date_3m: row.last_date_3m,
      first_close_3m: Number(row.first_close_3m) || 0,
      last_close_3m: Number(row.last_close_3m) || 0,
      avg_volume_3m: Number(row.avg_volume_3m) || 0,
      score_3m: Number(row.score_3m) || 0,
      // 6개월 데이터
      return_rate_6m: Number(row.return_rate_6m) || 0,
      sortino_ratio_6m: Number(row.sortino_ratio_6m) || 0,
      first_date_6m: row.first_date_6m,
      last_date_6m: row.last_date_6m,
      first_close_6m: Number(row.first_close_6m) || 0,
      last_close_6m: Number(row.last_close_6m) || 0,
      avg_volume_6m: Number(row.avg_volume_6m) || 0,
      score_6m: Number(row.score_6m) || 0,
      // 기본 지표
      rsi: Number(row.rsi) || 50,
      revenue_growth: Number(row.revenue_growth) || 0,
      debt_to_equity: Number(row.debt_to_equity) || 1,
      pbr: Number(row.pbr) || 1.5,
      final_momentum_score: Number(row.final_momentum_score) || 0,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    // 통계 정보 계산
    const stats = {
      total_count: processedData.length,
      avg_final_score: processedData.reduce((sum, r) => sum + r.final_momentum_score, 0) / processedData.length,
      avg_return_1m: processedData.reduce((sum, r) => sum + r.return_rate_1m, 0) / processedData.length,
      avg_return_3m: processedData.reduce((sum, r) => sum + r.return_rate_3m, 0) / processedData.length,
      avg_return_6m: processedData.reduce((sum, r) => sum + r.return_rate_6m, 0) / processedData.length,
      top_10_avg_return_6m: processedData.slice(0, 10).reduce((sum, r) => sum + r.return_rate_6m, 0) / Math.min(10, processedData.length),
      top_score: processedData.length > 0 ? processedData[0].final_momentum_score : 0
    };

    return json({
      data: processedData,
      stats,
      query_date: queryDate
    }, { status: 200 });

  } catch (error) {
    console.error('Momentum ranking API error:', error);
    return json({
      error: 'Failed to get momentum ranking',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};