// scripts/fetch_ohlc.ts
// Usage: npx tsx scripts/fetch_ohlc.ts [start_date end_date]
import yahooFinance from 'yahoo-finance2';
import { query } from '../src/lib/server/db';
import { format, subDays, isWeekend, addDays, parseISO } from 'date-fns';

// 공지 메시지 억제
yahooFinance.suppressNotices(['ripHistorical']);

// 인터페이스 정의
interface StockInfo {
  ticker: string;
}

interface MarketHoliday {
  holiday_date: string;
}

// 지연 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 휴장일 확인
async function isMarketHoliday(date: string): Promise<boolean> {
  const holidays = await query<MarketHoliday>(
    `SELECT holiday_date FROM market_holidays WHERE country = 'us' AND holiday_date = $1`,
    [date]
  );
  return holidays.length > 0;
}

// 티커 상태 업데이트
async function updateTickerStatus(ticker: string, active: boolean) {
  await query(
    `UPDATE stock_info SET active = $1, updated_at = CURRENT_TIMESTAMP WHERE ticker = $2`,
    [active, ticker]
  );
}

// OHLC 데이터 수집 및 저장 (단일 날짜용)
async function fetchAndSaveOHLCForDate(ticker: string, date: string) {
  try {
    const nextDay = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
    const chartData = await yahooFinance.chart(ticker, {
      period1: date,
      period2: nextDay,
      interval: '1d',
    });

    const quotes = chartData.quotes;
    if (!quotes.length) {
      console.log(`No data for ${ticker} on ${date}`);
      await updateTickerStatus(ticker, false);
      return;
    }

    const entry = quotes.find(q => q.date.toISOString().split('T')[0] === date);
    if (!entry) {
      console.log(`No matching data for ${ticker} on ${date}`);
      await updateTickerStatus(ticker, false);
      return;
    }

    await query(
      `
      INSERT INTO ohlc (ticker, date, open, high, low, close, volume, adjclose)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (ticker, date) DO UPDATE
      SET open = EXCLUDED.open,
          high = EXCLUDED.high,
          low = EXCLUDED.low,
          close = EXCLUDED.close,
          volume = EXCLUDED.volume,
          adjclose = EXCLUDED.adjclose
      `,
      [
        ticker,
        entry.date.toISOString().split('T')[0],
        entry.open,
        entry.high,
        entry.low,
        entry.close,
        entry.volume,
        entry.adjclose || entry.close,
      ]
    );

    console.log(`OHLC data for ${ticker} on ${date} saved`);
    await updateTickerStatus(ticker, true);
  } catch (error) {
    if (error.message.includes('No data found, symbol may be delisted')) {
      console.log(`Symbol ${ticker} may be delisted`);
    } else {
      console.error(`Error fetching/saving ${ticker}:`, error);
    }
    await updateTickerStatus(ticker, false);
  }
}

// OHLC 데이터 수집 및 저장 (기간용)
async function fetchAndSaveOHLCForRange(ticker: string, startDate: string, endDate: string) {
  try {
    const chartData = await yahooFinance.chart(ticker, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    });

    const quotes = chartData.quotes;
    if (!quotes.length) {
      console.log(`No data for ${ticker} from ${startDate} to ${endDate}`);
      await updateTickerStatus(ticker, false);
      return;
    }

    for (const entry of quotes) {
      const entryDate = entry.date.toISOString().split('T')[0];
      await query(
        `
        INSERT INTO ohlc (ticker, date, open, high, low, close, volume, adjclose)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (ticker, date) DO UPDATE
        SET open = EXCLUDED.open,
            high = EXCLUDED.high,
            low = EXCLUDED.low,
            close = EXCLUDED.close,
            volume = EXCLUDED.volume,
            adjclose = EXCLUDED.adjclose
        `,
        [
          ticker,
          entryDate,
          entry.open,
          entry.high,
          entry.low,
          entry.close,
          entry.volume,
          entry.adjclose || entry.close,
        ]
      );
      console.log(`OHLC data for ${ticker} on ${entryDate} saved`);
    }
    await updateTickerStatus(ticker, true);
  } catch (error) {
    if (error.message.includes('No data found, symbol may be delisted')) {
      console.log(`Symbol ${ticker} may be delisted`);
    } else {
      console.error(`Error fetching/saving ${ticker}:`, error);
    }
    await updateTickerStatus(ticker, false);
  }
}

// 메인 함수
async function main() {
  try {
    const args = process.argv.slice(2);
    let startDateStr: string;
    let endDateStr: string;
    let isRange = false;

    if (args.length === 2) {
      // 특정 기간
      startDateStr = args[0];
      endDateStr = format(addDays(parseISO(args[1]), 1), 'yyyy-MM-dd'); // endDate 포함
      isRange = true;
    } else {
      // 기본: 전날
      const yesterday = subDays(new Date(), 1);
      startDateStr = endDateStr = format(yesterday, 'yyyy-MM-dd');
    }

    // active=true 티커 조회
    const stocks = await query<StockInfo>(
      `SELECT ticker FROM stock_info WHERE active = true`
    );
    console.log(`Found ${stocks.length} active tickers`);

    if (stocks.length === 0) {
      console.log('No active tickers found in stock_info');
      return;
    }

    for (const stock of stocks) {
      if (isRange) {
        // 기간 모드: 주말/휴장일 체크 없이 전체 데이터 가져오기
        await fetchAndSaveOHLCForRange(stock.ticker, startDateStr, endDateStr);
      } else {
        // 단일 날짜 모드: 휴장일/주말 체크
        if (isWeekend(parseISO(startDateStr))) {
          console.log(`Skipping: ${startDateStr} is a weekend`);
          continue;
        }
        if (await isMarketHoliday(startDateStr)) {
          console.log(`Skipping: ${startDateStr} is a market holiday`);
          continue;
        }
        await fetchAndSaveOHLCForDate(stock.ticker, startDateStr);
      }
      await delay(1000);
    }

    console.log('Completed OHLC data collection');
  } catch (error) {
    console.error('Error in main:', error);
  }
}

// 실행
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
