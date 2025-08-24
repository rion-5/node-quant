// src/routes/momentum/compute-data/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { format, parse, subDays } from 'date-fns';
import yahooFinance from 'yahoo-finance2';
import { RSI } from 'technicalindicators';
import { query } from '../../../lib/server/db';

export const load: PageServerLoad = async () => {
  const defaultStartDate = format(subDays(new Date(), 180), 'yyyy-MM-dd');
  const defaultEndDate = format(new Date(), 'yyyy-MM-dd');
  return { startDate: defaultStartDate, endDate: defaultEndDate, momentumData: [], error: null };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const startDateStr = formData.get('startDate') as string;
    const endDateStr = formData.get('endDate') as string;

    const startDate = parse(startDateStr, 'yyyy-MM-dd', new Date());
    const endDate = parse(endDateStr, 'yyyy-MM-dd', new Date());

    if (startDate >= endDate) {
      return { error: 'Start date must be before end date', momentumData: [], startDate: startDateStr, endDate: endDateStr };
    }

    try {
      const tradingDaysRes = await query<{ trade_date: string }>(`
        SELECT DISTINCT date as trade_date
        FROM ohlc
        WHERE date BETWEEN $1 AND $2
        ORDER BY date DESC
      `, [startDateStr, endDateStr]);

      const numDays = tradingDaysRes.length;
      if (numDays < 15) {
        return { error: `Not enough trading days: ${numDays}/15`, momentumData: [], startDate: startDateStr, endDate: endDateStr };
      }

      const firstDate = tradingDaysRes[tradingDaysRes.length - 1].trade_date;
      const lastDate = tradingDaysRes[0].trade_date;

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

      const momentumData: {
        ticker: string;
        first_date: string;
        last_date: string;
        first_close: number;
        last_close: number;
        avg_volume: number;
        sortino_ratio: number;
        return_rate: number;
        rsi: number;
        revenue_growth: number;
        debt_to_equity: number;
        pbr: number;
      }[] = [];

      for (const { ticker, avg_volume } of candidates) {
        try {
          const series = await query<{ date: string; close: number; adjclose: number }>(`
            SELECT date, close, adjclose
            FROM ohlc
            WHERE ticker = $1 AND date BETWEEN $2 AND $3
            ORDER BY date ASC
          `, [ticker, startDateStr, endDateStr]);

          if (series.length < numDays * 0.9) continue;

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
          const sortino = downsideDev > 0 ? meanRet / downsideDev : meanRet >= 0 ? 9999 : -9999;
          if (sortino <= -0.5) continue;

          const closes = series.map((d) => d.close);
          const rsiValues = RSI.calculate({ period: 14, values: closes });
          const rsi = rsiValues[rsiValues.length - 1];

          const summary = await yahooFinance.quoteSummary(ticker, {
            modules: ['financialData', 'defaultKeyStatistics'],
          });
          const revenueGrowth = summary.financialData?.revenueGrowth ?? null;
          const debtToEquity = summary.financialData?.debtToEquity ?? null;
          const pbr = summary.defaultKeyStatistics?.priceToBook ?? null;

          if (revenueGrowth === null || debtToEquity === null || pbr === null) continue;

          await new Promise((resolve) => setTimeout(resolve, 1000));

          momentumData.push({
            ticker,
            first_date: firstDate,
            last_date: lastDate,
            first_close: firstClose,
            last_close: lastClose,
            avg_volume,
            sortino_ratio: sortino,
            return_rate: returnRate,
            rsi,
            revenue_growth: revenueGrowth,
            debt_to_equity: debtToEquity,
            pbr,
          });
        } catch (error) {
          console.error(`Error processing ${ticker}:`, error);
        }
      }

      return { momentumData, startDate: startDateStr, endDate: endDateStr, error: null };
    } catch (error) {
      console.error('Error:', error);
      return { error: 'Failed to compute data', momentumData: [], startDate: startDateStr, endDate: endDateStr };
    }
  },
};