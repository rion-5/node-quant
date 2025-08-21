// scripts/compute_momentum_data.ts
// Usage: npx tsx scripts/compute_momentum_data.ts [numDays]

import yahooFinance from 'yahoo-finance2';
import { RSI } from 'technicalindicators';
import { format, subDays } from 'date-fns';
import { query } from '../src/lib/server/db';

// 메인 함수
async function main(numDays: number = 123) {
  try {
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    // momentum_data 테이블 생성
    await query(`
      CREATE TABLE IF NOT EXISTS momentum_data (
        query_date DATE,
        ticker VARCHAR(20),
        first_date DATE,
        last_date DATE,
        first_close NUMERIC(15,4),
        last_close NUMERIC(15,4),
        avg_volume BIGINT,
        sortino_ratio NUMERIC(15,4),
        return_rate NUMERIC(15,4),
        rsi NUMERIC(15,4),
        revenue_growth NUMERIC(15,4),
        debt_to_equity NUMERIC(15,4),
        pbr NUMERIC(15,4),
        six_month_change NUMERIC(15,4),
        PRIMARY KEY (query_date, ticker)
      );
    `);

    // 거래일 데이터 가져오기 (ohlc 테이블에서)
    const tradingDaysRes = await query<{ trade_date: string }>(`
      SELECT DISTINCT date as trade_date
      FROM ohlc
      WHERE date <= $1
      ORDER BY date DESC
      LIMIT $2
    `, [currentDate, numDays]);

    if (tradingDaysRes.length < numDays * 0.9) {
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

    for (const { ticker, avg_volume } of candidates) {
      try {
        // OHLC 데이터 가져오기 (Sortino Ratio 및 Return Rate 계산용)
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

        // Return Rate 및 Sortino Ratio 계산
        const firstClose = series[0].adjclose;
        const lastClose = series[series.length - 1].adjclose;
        const returnRate = (lastClose - firstClose) / firstClose;

        if (returnRate < 0.1) {
          console.log(`Skipping ${ticker}: return rate too low (${returnRate})`);
          continue;
        }

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
        const sortino = downsideDev > 0 ? meanRet / downsideDev : (meanRet >= 0 ? 9999 : -9999);

        if (sortino <= -0.5) {
          console.log(`Skipping ${ticker}: sortino ratio too low (${sortino})`);
          continue;
        }

        // Yahoo Finance 데이터 가져오기 (RSI 및 펀더멘털 데이터)
        const historical = await yahooFinance.historical(ticker, {
          period1: startDate,
          period2: endDate,
        });

        if (historical.length < 15) {
          console.log(`Skipping ${ticker}: insufficient Yahoo Finance data (${historical.length}/15)`);
          continue;
        }

        const closes = historical.map((d) => d.close);

        // RSI 계산 (14일)
        const rsiValues = RSI.calculate({ period: 14, values: closes });
        const rsi = rsiValues[rsiValues.length - 1];

        // 6M Change 계산
        const latestClose = closes[closes.length - 1];
        const sixMonthAgoClose = closes[0];
        if (sixMonthAgoClose === 0 || isNaN(sixMonthAgoClose)) {
          console.log(`Skipping ${ticker}: invalid six-month-ago close price`);
          continue;
        }
        const sixMonthChange = ((latestClose / sixMonthAgoClose - 1) * 100).toFixed(4);

        // 펀더멘털 데이터
        const summary = await yahooFinance.quoteSummary(ticker, {
          modules: ['financialData', 'earnings', 'defaultKeyStatistics'],
        });

        const revenueGrowth = summary.financialData?.revenueGrowth ?? null;
        const debtToEquity = summary.financialData?.debtToEquity ?? null;
        const pbr = summary.defaultKeyStatistics?.priceToBook ?? null;

        if (revenueGrowth === null || debtToEquity === null || pbr === null) {
          console.log(`Skipping ${ticker}: missing fundamentals (Revenue Growth=${revenueGrowth}, Debt to Equity=${debtToEquity}, PBR=${pbr})`);
          continue;
        }

        // 데이터 저장
        await query(`
          INSERT INTO momentum_data (
            query_date, ticker, first_date, last_date, first_close, last_close,
            avg_volume, sortino_ratio, return_rate, rsi, revenue_growth,
            debt_to_equity, pbr, six_month_change
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (query_date, ticker) DO UPDATE SET
            first_date = EXCLUDED.first_date,
            last_date = EXCLUDED.last_date,
            first_close = EXCLUDED.first_close,
            last_close = EXCLUDED.last_close,
            avg_volume = EXCLUDED.avg_volume,
            sortino_ratio = EXCLUDED.sortino_ratio,
            return_rate = EXCLUDED.return_rate,
            rsi = EXCLUDED.rsi,
            revenue_growth = EXCLUDED.revenue_growth,
            debt_to_equity = EXCLUDED.debt_to_equity,
            pbr = EXCLUDED.pbr,
            six_month_change = EXCLUDED.six_month_change
        `, [
          currentDate, ticker, startDate, endDate, firstClose, lastClose,
          avg_volume, sortino, returnRate, rsi, revenueGrowth,
          debtToEquity, pbr, sixMonthChange
        ]);

        console.log(`Saved ${ticker}: RSI=${rsi}, Revenue Growth=${revenueGrowth}, Debt to Equity=${debtToEquity}, PBR=${pbr}, 6M Change=${sixMonthChange}%, Sortino=${sortino}, Return Rate=${returnRate}`);
      } catch (error) {
        console.error(`Error processing ${ticker}:`, error);
      }
    }

    console.log('Completed momentum data computation');
  } catch (error) {
    console.error('Error:', error);
  }
}

// 명령줄 인자 처리
const numDaysArg = process.argv[2];
const numDays = numDaysArg ? parseInt(numDaysArg, 10) : 123;

if (isNaN(numDays) || numDays <= 0) {
  console.error('Usage: npx tsx compute_momentum_data.ts [numDays]');
  console.error('numDays must be a positive integer');
  process.exit(1);
}

main(numDays).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});