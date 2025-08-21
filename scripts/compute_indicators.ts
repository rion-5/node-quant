// scripts/compute_indicators.ts
// Usage: npx tsx scripts/compute_indicators.ts

import yahooFinance from 'yahoo-finance2';
import { RSI } from 'technicalindicators';
import { format, subDays } from 'date-fns';
import { query } from '../src/lib/server/db';

// 메인 함수
async function main(numDays: number = 180) { // [변경] 6M Change를 위해 기본값을 180일로 설정
  try {
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    // momentum_indicators 테이블 생성 (PBR, six_month_change 추가)
    await query(`
      CREATE TABLE IF NOT EXISTS momentum_indicators (
        query_date DATE,
        ticker VARCHAR(20),
        rsi NUMERIC(15,4),
        revenue_growth NUMERIC(15,4),
        debt_to_equity NUMERIC(15,4),
        pbr NUMERIC(15,4),
        six_month_change NUMERIC(15,4), -- [추가] 6M Change 컬럼
        PRIMARY KEY (query_date, ticker)
      );
    `);

    // momentum_candidates에서 오늘 날짜의 ticker 가져오기
    const candidates = await query<{ ticker: string }>(`
      SELECT ticker
      FROM momentum_candidates
      WHERE query_date = $1
    `, [currentDate]);

    if (candidates.length === 0) {
      console.log('No candidate tickers found for today.');
      return;
    }

    console.log(`Processing ${candidates.length} tickers`);

    const endDate = new Date();
    const startDate = subDays(endDate, numDays);

    for (const { ticker } of candidates) {
      try {
        // 역사적 데이터 가져오기
        const historical = await yahooFinance.historical(ticker, {
          period1: format(startDate, 'yyyy-MM-dd'),
          period2: format(endDate, 'yyyy-MM-dd'),
        });

        if (historical.length < 15) {
          console.log(`Skipping ${ticker}: insufficient data (${historical.length}/15)`);
          continue;
        }

        const closes = historical.map((d) => d.close);

        // RSI 계산 (14일)
        const rsiValues = RSI.calculate({ period: 14, values: closes });
        const rsi = rsiValues[rsiValues.length - 1];

        // 6M Change 계산 [추가]
        const latestClose = closes[closes.length - 1];
        const sixMonthAgoClose = closes[0]; // 180일 전 종가
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

        // 데이터 저장 (six_month_change 추가)
        await query(`
          INSERT INTO momentum_indicators (query_date, ticker, rsi, revenue_growth, debt_to_equity, pbr, six_month_change)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (query_date, ticker) DO UPDATE SET
            rsi = EXCLUDED.rsi,
            revenue_growth = EXCLUDED.revenue_growth,
            debt_to_equity = EXCLUDED.debt_to_equity,
            pbr = EXCLUDED.pbr,
            six_month_change = EXCLUDED.six_month_change
        `, [currentDate, ticker, rsi, revenueGrowth, debtToEquity, pbr, sixMonthChange]);

        console.log(`Saved ${ticker}: RSI=${rsi}, Revenue Growth=${revenueGrowth}, Debt to Equity=${debtToEquity}, PBR=${pbr}, 6M Change=${sixMonthChange}%`);
      } catch (error) {
        console.error(`Error processing ${ticker}:`, error);
      }
    }

    console.log('Completed indicators computation');
  } catch (error) {
    console.error('Error:', error);
  }
}

// 명령줄 인자 처리
const numDaysArg = process.argv[2];
const numDays = numDaysArg ? parseInt(numDaysArg, 10) : 180; // [변경] 기본값 180일

if (isNaN(numDays) || numDays <= 0) {
  console.error('Usage: npx tsx compute_indicators.ts [numDays]');
  console.error('numDays must be a positive integer');
  process.exit(1);
}

main(numDays).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});