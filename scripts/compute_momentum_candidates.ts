// scripts/compute_momentum_candidates.ts
// Usage: npx tsx scripts/compute_momentum_candidates.ts [거래일, 기본 120]

import { query } from '../src/lib/server/db';
import { format } from 'date-fns';

// 메인 함수
async function main(numDays: number = 120) {
  try {
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    // 거래일 수로 기간 계산
    const tradingDaysRes = await query<{ trade_date: string }>(`
      SELECT DISTINCT date as trade_date
      FROM ohlc
      ORDER BY date DESC
      LIMIT $1
    `, [numDays]);

    if (tradingDaysRes.length < numDays) {
      console.log(`Not enough trading days data: ${tradingDaysRes.length}/${numDays}`);
      return;
    }

    const endDate = tradingDaysRes[0].trade_date;
    const startDate = tradingDaysRes[tradingDaysRes.length - 1].trade_date;

    // 후보 종목 필터링
    const candidates = await query<{ ticker: string; avg_volume: number }>(`
      SELECT ticker, AVG(volume)::BIGINT AS avg_volume
      FROM ohlc
      WHERE date BETWEEN $1 AND $2
      AND close BETWEEN 50 AND 1000
      AND volume >= 10000000
      GROUP BY ticker
      HAVING COUNT(*) >= $3 * 0.9
      ORDER BY avg_volume DESC
    `, [startDate, endDate, numDays]);

    console.log(`Found ${candidates.length} candidate tickers`);

    for (const cand of candidates) {
      const ticker = cand.ticker;
      const series = await query<{ date: string; adjclose: number }>(`
        SELECT date, adjclose
        FROM ohlc
        WHERE ticker = $1 AND date BETWEEN $2 AND $3
        ORDER BY date ASC
      `, [ticker, startDate, endDate]);

      if (series.length < numDays * 0.9) {
        console.log(`Skipping ${ticker}: incomplete data (${series.length}/${numDays})`);
        continue;
      }

      const firstClose = series[0].adjclose;
      const lastClose = series[series.length - 1].adjclose;
      const returnRate = (lastClose - firstClose) / firstClose;

      if (returnRate < 0.1) continue;

      const dailyReturns: number[] = [];
      for (let i = 1; i < series.length; i++) {
        const ret = (series[i].adjclose / series[i - 1].adjclose) - 1;
        dailyReturns.push(ret);
      }

      const meanRet = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;

      let downsideSum = 0;
      for (const ret of dailyReturns) {
        if (ret < 0) downsideSum += ret * ret;
      }
      const downsideDev = Math.sqrt(downsideSum / dailyReturns.length);
      let sortino = downsideDev > 0 ? meanRet / downsideDev : (meanRet >= 0 ? 9999 : -9999);

      if (sortino <= -0.5) continue;

      await query(`
        INSERT INTO momentum_candidates (query_date, ticker, first_date, last_date, first_close, last_close, avg_volume, sortino_ratio, return_rate)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (query_date, ticker) DO UPDATE SET
          first_date = EXCLUDED.first_date,
          last_date = EXCLUDED.last_date,
          first_close = EXCLUDED.first_close,
          last_close = EXCLUDED.last_close,
          avg_volume = EXCLUDED.avg_volume,
          sortino_ratio = EXCLUDED.sortino_ratio,
          return_rate = EXCLUDED.return_rate
      `, [currentDate, ticker, startDate, endDate, firstClose, lastClose, cand.avg_volume, sortino, returnRate]);

      console.log(`Saved ${ticker}`);
    }

    console.log('Completed momentum candidates computation');
  } catch (error) {
    console.error('Error:', error);
  }
}

// 명령줄 인자 처리
const numDaysArg = process.argv[2];
const numDays = numDaysArg ? parseInt(numDaysArg, 10) : 120;

if (isNaN(numDays) || numDays <= 0) {
  console.error('Usage: npx tsx compute_momentum_candidates.ts [numDays]');
  console.error('numDays must be a positive integer');
  process.exit(1);
}

main(numDays).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});