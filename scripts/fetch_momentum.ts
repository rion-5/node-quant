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
function calculateSortino(returns: number[], rf = 0): number {
  const downsideReturns = returns.filter(r => r < rf);
  const expectedReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const downsideStd = downsideReturns.length > 0 ? std(downsideReturns) : 0;
  return downsideStd !== 0 ? (expectedReturn - rf) / downsideStd : Infinity;
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
    const chartData = await yahooFinance.chart(ticker, {
      period1: startDateStr,
      period2: endDateStr,
      interval: '1d',
    });
    ohlcData = chartData.quotes.map(q => ({
      date: q.date.toISOString().split('T')[0],
      close: q.close,
      volume: q.volume,
    })).slice(-days);
  }

  return ohlcData.reverse(); // Oldest to newest
}

// Process ticker for momentum criteria
async function processTicker(ticker: string, queryDate: string) {
  try {
    const data = await getRecentOHLC(ticker);
    if (data.length < 120) return;

    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);

    const lastClose = closes[closes.length - 1];
    if (lastClose < 50 || lastClose > 1000) return;

    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    if (avgVolume <= 10000000) return;

    const firstClose = closes[0];
    const returnRate = (lastClose - firstClose) / firstClose;
    if (returnRate < 0.2) return;

    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i-1]) / closes[i-1]);
    }
    const sortino = calculateSortino(returns);
    if (sortino <= -0.5) return;

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

  console.log('Momentum stock selection completed');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});