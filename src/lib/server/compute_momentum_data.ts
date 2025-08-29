// src/lib/server/compute_momentum_data.ts
import yahooFinance from 'yahoo-finance2';
import { RSI } from 'technicalindicators';
import { format, parse, subDays } from 'date-fns';
import { query } from './db';

yahooFinance.suppressNotices(['yahooSurvey']);
yahooFinance.suppressNotices(['ripHistorical']);

export async function computeMomentumData(  
  startDateStr: string = format(subDays(new Date(), 180), 'yyyy-MM-dd'),
  endDateStr: string = format(new Date(), 'yyyy-MM-dd')
): Promise<void> {
  const skippedTickers: { ticker: string; reason: string }[] = [];

  try {
    const currentDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = parse(startDateStr, 'yyyy-MM-dd', new Date());
    const endDate = parse(endDateStr, 'yyyy-MM-dd', new Date());

    if (startDate >= endDate) {
      throw new Error('startDate must be before endDate');
    }

    // Create momentum_data table
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

    // Get trading days
    const tradingDaysRes = await query<{ trade_date: string }>(`
      SELECT DISTINCT date as trade_date
      FROM ohlc
      WHERE date BETWEEN $1 AND $2
      ORDER BY date DESC
    `, [startDateStr, endDateStr]);

    const numDays = tradingDaysRes.length;
    if (numDays < 15) {
      throw new Error(`Not enough trading days data: ${numDays}/15`);
    }

    const firstDate = tradingDaysRes[tradingDaysRes.length - 1].trade_date;
    const lastDate = tradingDaysRes[0].trade_date;

    // Fetch candidate tickers
    const candidates = await query<{ ticker: string; avg_volume: number }>(`
      SELECT ticker, AVG(volume)::BIGINT AS avg_volume
      FROM ohlc
      WHERE date BETWEEN $1 AND $2
      AND close BETWEEN 50 AND 1000
      AND volume >= 10000000
      GROUP BY ticker
      HAVING COUNT(*) >= $3 * 0.9
      ORDER BY avg_volume DESC
    `, [startDateStr, endDateStr, numDays]);

    for (const { ticker, avg_volume } of candidates) {
      try {
        // Fetch OHLC data
        const series = await query<{ date: string; close: number; adjclose: number }>(`
          SELECT date, close, adjclose
          FROM ohlc
          WHERE ticker = $1 AND date BETWEEN $2 AND $3
          ORDER BY date ASC
        `, [ticker, startDateStr, endDateStr]);

        if (series.length < numDays * 0.9) {
          // console.log(`Skipping ${ticker}: incomplete data (${series.length}/${numDays})`);
          skippedTickers.push({ ticker, reason: `incomplete data (${series.length}/${numDays})` });
          continue;
        }

        // Calculate Return Rate and Sortino Ratio
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

        // Calculate RSI
        const closes = series.map((d) => d.close);
        const rsiValues = RSI.calculate({ period: 14, values: closes });
        const rsi = rsiValues[rsiValues.length - 1];

        // Calculate 6-month change
        const latestClose = closes[closes.length - 1];
        const sixMonthAgoClose = closes[0];
        if (sixMonthAgoClose === 0 || isNaN(sixMonthAgoClose)) {
          console.log(`Skipping ${ticker}: invalid six-month-ago close price`);
          continue;
        }
        const sixMonthChange = ((latestClose / sixMonthAgoClose - 1) * 100).toFixed(4);

        // Fetch fundamental data
        const summary = await yahooFinance.quoteSummary(ticker, {
          modules: ['financialData', 'earnings', 'defaultKeyStatistics'],
        });

        const revenueGrowth = summary.financialData?.revenueGrowth ?? null;
        const debtToEquity = summary.financialData?.debtToEquity ?? null;
        const pbr = summary.defaultKeyStatistics?.priceToBook ?? null;

        if (revenueGrowth === null || debtToEquity === null || pbr === null) {
          // console.log(`Skipping ${ticker}: missing fundamentals`);
          skippedTickers.push({ ticker, reason: `missing fundamentals` });
          continue;
        }

        // Save to database
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
          currentDate, ticker, firstDate, lastDate, firstClose, lastClose,
          avg_volume, sortino, returnRate, rsi, revenueGrowth,
          debtToEquity, pbr, sixMonthChange
        ]);

        if (skippedTickers.length > 0) {
          console.log(`Skipped ${skippedTickers.length} tickers:`);
          skippedTickers.forEach(({ ticker, reason }) => console.log(`- ${ticker}: ${reason}`));
        }
        console.log('Completed momentum data computation');
      } catch (error) {
        console.error(`Error processing ${ticker}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in computeMomentumData:', error);
    throw error;
  }
}