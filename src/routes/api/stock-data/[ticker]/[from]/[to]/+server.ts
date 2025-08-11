import { json } from '@sveltejs/kit';
import yahooFinance from 'yahoo-finance2';
import type { HistoricalQuote,ChartQuote } from '$lib/types';

// historical() 경고 억제
yahooFinance.suppressNotices(['ripHistorical']);

export async function GET({ params }) {
  const { ticker, from, to } = params;

  try {
    // 입력 유효성 검사
    if (!from || !to) {
      return json({ success: false, error: 'From and To dates are required' }, { status: 400 });
    }

    // 날짜 형식 유효성 검사
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return json({ success: false, error: 'Invalid date format' }, { status: 400 });
    }

    const result = await yahooFinance.chart(ticker, {
      period1: from,
      period2: to,
      interval: from === to ? '1h' : '1d', // 같은 날짜면 시간별, 아니면 일별
    });

    // 데이터가 없는 경우 처리
    if (!result.quotes || result.quotes.length === 0) {
      return json({ success: false, error: 'No data available for the selected ticker or period' }, { status: 404 });
    }

    const quotes = result.quotes.map((quote: ChartQuote) => ({
      date: new Date(quote.date),
      open: quote.open ?? 0,
      high: quote.high ?? 0,
      low: quote.low ?? 0,
      close: quote.close ?? 0,
      volume: quote.volume ?? 0,
    }));

    return json({
      success: true,
      data: quotes,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ success: false, error: errorMessage }, { status: 500 });
  }
}