// src/routes/api/get-query-dates/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import { format } from 'date-fns';

interface QueryDateRaw {
  query_date: Date;
  min_price: number;
  max_price: number;
  min_trading_amount: number;
  count: number;
  avg_final_score: number;
  first_date_6m: Date;
  last_date_6m: Date;
  start_date: Date;  // 추가
  end_date: Date;  // 추가
}

export const GET: RequestHandler = async () => {
  try {
    // 모든 조회 가능한 날짜와 기본 통계 정보 조회
    const dates = await query<QueryDateRaw>(`
      SELECT 
        query_date,
        min_price,
        max_price,
        min_trading_amount,
        COUNT(*) as count,
        AVG(final_momentum_score) as avg_final_score,
        MIN(first_date_6m) as first_date_6m,
        MAX(last_date_6m) as last_date_6m,
        MIN(start_date) as start_date,
        MAX(end_date) as end_date 
      FROM momentum_data 
      WHERE final_momentum_score IS NOT NULL
      GROUP BY query_date, min_price, max_price, min_trading_amount, start_date, end_date 
      ORDER BY query_date DESC
      `);

    console.log('Fetched dates:', dates); // 디버깅 로그

    if (dates.length === 0) {
      return json({
        dates: [],
        message: 'No momentum data found. Please run the momentum calculation first.'
      }, { status: 200 });
    }

    // 날짜 포맷팅 및 추가 정보 처리
    const formattedDates = dates.map(date => ({
      query_date: format(date.query_date, 'yyyy-MM-dd'),
      min_price: Number(date.min_price),
      max_price: Number(date.max_price),
      min_trading_amount: Number(date.min_trading_amount),
      count: Number(date.count),
      avg_final_score: Number(date.avg_final_score).toFixed(4),
      first_date: format(date.start_date, 'yyyy-MM-dd'),  // start_date로 변경
      last_date: format(date.end_date, 'yyyy-MM-dd'),  // end_date로 변경
      display_text: `${format(date.start_date, 'yyyy-MM-dd')} ~ ${format(date.end_date, 'yyyy-MM-dd')} (주가:$${Number(date.min_price).toLocaleString()} - $${Number(date.max_price).toLocaleString()}, 거래:$${Number(date.min_trading_amount).toLocaleString()} 이상, ${date.count}개 종목, 평균점수: ${Number(date.avg_final_score).toFixed(4)})`
    }));

    return json({
      dates: formattedDates,
      total_query_dates: formattedDates.length,
      latest_date: formattedDates[0]?.query_date,
      oldest_date: formattedDates[formattedDates.length - 1]?.query_date
    }, { status: 200 });

  } catch (error) {
    console.error('get-query-dates error:', error);
    return json({
      error: 'Failed to fetch query dates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};