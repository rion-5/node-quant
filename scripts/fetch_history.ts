import yahooFinance from 'yahoo-finance2';
import { query } from '../src/lib/server/db';
import { format, subDays, addDays, isWeekend } from 'date-fns';

// 공지 메시지 억제
yahooFinance.suppressNotices(['ripHistorical']);

// 인터페이스 정의
interface StockInfo {
  ticker: string;
}

interface MarketHoliday {
  holiday_date: string;
}

// 지연 함수 (API 요청 제한 방지)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 휴장일 확인
async function isMarketHoliday(date: string): Promise<boolean> {
  const holidays = await query<MarketHoliday>(
    `SELECT holiday_date FROM market_holidays WHERE country = 'us' AND holiday_date = $1`,
    [date]
  );
  return holidays.length > 0;
}

// OHLC 데이터 수집 및 저장
async function fetchAndSaveOHLC(ticker: string, date: string) {
  try {
    // 다음 날짜 계산 (chart는 period1과 period2 동일 불가)
    const nextDay = addDays(new Date(date), 1);
    const nextDayStr = format(nextDay, 'yyyy-MM-dd');

    const chartData = await yahooFinance.chart(ticker, {
      period1: date,
      period2: nextDayStr,
      interval: '1d',
    });

    const quotes = chartData.quotes;
    if (!quotes.length) {
      console.log(`No data for ${ticker} on ${date}`);
      return;
    }

    const entry = quotes.find(q => q.date.toISOString().split('T')[0] === date);
    if (!entry) {
      console.log(`No matching data for ${ticker} on ${date}`);
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
        date,
        entry.open,
        entry.high,
        entry.low,
        entry.close,
        entry.volume,
        entry.adjclose || entry.close, // adjclose 누락 시 close 대체
      ]
    );

    console.log(`OHLC data for ${ticker} on ${date} saved`);
  } catch (error) {
    console.error(`Error fetching/saving ${ticker}:`, error);
  }
}

// 메인 함수
async function main() {
  try {
    // 전날 날짜 (한국 시간 기준)
    const yesterday = subDays(new Date(), 1);
    const dateStr = format(yesterday, 'yyyy-MM-dd');

    // 주말 또는 휴장일 확인
    if (isWeekend(yesterday)) {
      console.log(`Skipping: ${dateStr} is a weekend`);
      return;
    }
    if (await isMarketHoliday(dateStr)) {
      console.log(`Skipping: ${dateStr} is a market holiday`);
      return;
    }

    // stock_info에서 티커 조회 (NASDAQ, NYSE만 포함)
    const stocks = await query<StockInfo>(
      `SELECT ticker FROM stock_info`
    );

    // 각 티커에 대해 OHLC 데이터 수집
    for (const stock of stocks) {
      await fetchAndSaveOHLC(stock.ticker, dateStr);
      await delay(1000); // 1초 지연
    }

    console.log(`Completed OHLC data collection for ${dateStr}`);
  } catch (error) {
    console.error('Error in main:', error);
  }
}

// 실행
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});