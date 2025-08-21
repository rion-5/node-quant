// scripts/fetch_momentum.ts
// Usage: npx tsx scripts/fetch_momentum.ts

import yahooFinance from 'yahoo-finance2';
import { query } from '../src/lib/server/db';
import { format, subDays, parseISO, isWeekend, addDays } from 'date-fns';
import { mean, std } from 'mathjs';

// Suppress notices
yahooFinance.suppressNotices(['ripHistorical']);

// Interfaces
interface StockInfo {
  ticker: string;
}

interface OHLC {
  date: string;
  close: number;
  volume: number;
}

// Delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Calculate Sortino Ratio
function calculateSortino(returns: number[], rf: number = 0): number {
  if (returns.length === 0) return 0;
  const downsideReturns = returns.filter(r => r < rf);
  const expectedReturn = Number(mean(returns)) || 0;
  const downsideStd = downsideReturns.length > 0 ? Number(std(downsideReturns)) : 0;
  return downsideStd !== 0 ? (expectedReturn - rf) / downsideStd : 0;
}

// Fetch last 120 trading days OHLC from DB or API
async function getRecentOHLC(ticker: string, days: number = 120): Promise<OHLC[]> {
  const endDate = new Date();
  const startDate = subDays(endDate, days * 2); // Buffer for trading days
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Try from DB
  let ohlcData = await query<OHLC>(
    `SELECT date, close, volume FROM ohlc WHERE ticker = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC LIMIT $4`,
    [ticker, startDateStr, endDateStr, days]
  );

  if (ohlcData.length < days) {
    // Fetch from API if not enough
    try {
      const chartData = await yahooFinance.chart(ticker, {
        period1: startDateStr,
        period2: endDateStr,
        interval: '1d',
      });
      ohlcData = chartData.quotes
        .filter(q => q.close != null && q.volume != null)
        .map(q => ({
          date: q.date.toISOString().split('T')[0],
          close: q.close as number,
          volume: q.volume as number,
        }))
        .slice(-days);
    } catch (error) {
      if (error.message.includes('No data found, symbol may be delisted')) {
        console.log(`Symbol ${ticker} may be delisted`);
      } else {
        console.error(`Error fetching OHLC for ${ticker}:`, error);
      }
      return []; // Return empty array on error
    }
  }

  return ohlcData.reverse(); // Oldest to newest
}

// Process ticker for momentum criteria
async function processTicker(ticker: string, queryDate: string) {
  try {
    const data = await getRecentOHLC(ticker);
    if (data.length < 120) {
      console.log(`Insufficient data for ${ticker}: ${data.length} days available`);
      return;
    }

    const closes = data.map(d => d.close).filter(c => c != null);
    const volumes = data.map(d => d.volume).filter(v => v != null);

    if (closes.length < 120 || volumes.length < 120) {
      console.log(`Invalid data for ${ticker}: missing close or volume`);
      return;
    }

    const lastClose = closes[closes.length - 1];
    if (lastClose < 50 || lastClose > 1000) return;

    const avgVolume = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;
    if (avgVolume <= 10000000 || !isFinite(avgVolume)) return;

    const firstClose = closes[0];
    const returnRate = (lastClose - firstClose) / firstClose;
    if (returnRate < 0.2 || !isFinite(returnRate)) return;

    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      const ret = (closes[i] - closes[i-1]) / closes[i-1];
      if (isFinite(ret)) returns.push(ret);
    }
    const sortino = calculateSortino(returns);
    if (sortino <= -0.5 || !isFinite(sortino)) return;

    // Save to table
    await query(
      `
      INSERT INTO momentum_stocks (query_date, ticker, first_close, last_close, avg_volume, sortino_ratio, return_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (query_date, ticker) DO UPDATE SET
        first_close = EXCLUDED.first_close,
        last_close = EXCLUDED.last_close,
        avg_volume = EXCLUDED.avg_volume,
        sortino_ratio = EXCLUDED.sortino_ratio,
        return_rate = EXCLUDED.return_rate
      `,
      [queryDate, ticker, firstClose, lastClose, avgVolume, sortino, returnRate]
    );

    console.log(`Saved momentum data for ${ticker}`);
  } catch (error) {
    console.error(`Error processing ${ticker}:`, error);
  }
}

// Main function
async function main() {
  const queryDate = format(new Date(), 'yyyy-MM-dd');

  const stocks = await query<StockInfo>(
    `SELECT ticker FROM stock_info WHERE active = true`
  );

  for (const stock of stocks) {
    await processTicker(stock.ticker, queryDate);
    await delay(1000); // Rate limit
  }

  console.log('베이스라인 모멘텀 데이터 수집 완료');
}

main().catch(err => {
  console.error('치명적 오류:', err);
  process.exit(1);
});