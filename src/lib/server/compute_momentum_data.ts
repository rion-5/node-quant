// src/lib/server/compute_momentum_data.ts
import yahooFinance from 'yahoo-finance2';
import { RSI } from 'technicalindicators';
import { format, parse, subDays } from 'date-fns';
import { query } from './db';

yahooFinance.suppressNotices(['yahooSurvey']);
yahooFinance.suppressNotices(['ripHistorical']);

interface PeriodData {
  first_date: string;
  last_date: string;
  first_close: number;
  last_close: number;
  return_rate: number;
  sortino_ratio: number;
  avg_volume: number;
}

interface OHLCData {
  date: string;
  close: number;
  adjclose: number;
  volume: number;
}

function calculateSortinoRatio(dailyReturns: number[]): number {
  if (dailyReturns.length === 0) return 0;

  const meanRet = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  let downsideSum = 0;
  let downsideCount = 0;

  for (const ret of dailyReturns) {
    if (ret < 0) {
      downsideSum += ret * ret;
      downsideCount++;
    }
  }

  if (downsideCount === 0) {
    return meanRet >= 0 ? 5 : 0;
  }

  const downsideDev = Math.sqrt(downsideSum / downsideCount);
  return downsideDev > 0 ? meanRet / downsideDev : (meanRet >= 0 ? 5 : -5);
}

async function calculatePeriodMomentum(
  ticker: string,
  startDateStr: string,
  endDateStr: string,
  months: number
): Promise<PeriodData | null> {
  try {
    // Calculate period start date
    const endDate = parse(endDateStr, 'yyyy-MM-dd', new Date());
    const periodStartDate = new Date(endDate);
    periodStartDate.setMonth(periodStartDate.getMonth() - months);
    const periodStartStr = format(periodStartDate, 'yyyy-MM-dd');

    // Fetch OHLC data for the specific period
    const series = await query<OHLCData>(`
      SELECT date, close, adjclose, volume
      FROM ohlc
      WHERE ticker = $1 AND date BETWEEN $2 AND $3
      ORDER BY date ASC
    `, [ticker, periodStartStr, endDateStr]);

    if (series.length < 5) { // Need at least 5 data points
      return null;
    }

    // Calculate metrics
    const firstClose = series[0].adjclose;
    const lastClose = series[series.length - 1].adjclose;
    const returnRate = firstClose > 0 ? (lastClose - firstClose) / firstClose : 0;

    // Calculate daily returns
    const dailyReturns: number[] = [];
    for (let i = 1; i < series.length; i++) {
      const ret = (series[i].adjclose / series[i - 1].adjclose) - 1;
      dailyReturns.push(ret);
    }

    const sortinoRatio = calculateSortinoRatio(dailyReturns);

    const volumes = series.map(d => {
      const dollarVolume = Number(d.volume) * d.close;
      if (isNaN(dollarVolume) || dollarVolume < 0) {
        console.warn(`Invalid dollar volume for ${ticker}: volume=${d.volume}, close=${d.close}, using 0`);
        return 0;
      }
      return dollarVolume;
    });
    const totalVolume = volumes.reduce((sum, v) => sum + Math.round(v), 0);
    const rawAvgVolume = totalVolume / series.length;
    console.log(`${ticker}: volumes range ${Math.min(...volumes).toLocaleString()} - ${Math.max(...volumes).toLocaleString()}, avg: ${isFinite(rawAvgVolume) ? rawAvgVolume.toLocaleString() : 'Invalid (Infinity/NaN)'}`);
    const avgVolume = Math.round(rawAvgVolume); // 상한선 제거

    return {
      first_date: series[0].date,
      last_date: series[series.length - 1].date,
      first_close: firstClose,
      last_close: lastClose,
      return_rate: returnRate,
      sortino_ratio: sortinoRatio,
      avg_volume: avgVolume
    };

  } catch (error) {
    console.error(`Error calculating ${months}M momentum for ${ticker}:`, error);
    return null;
  }
}

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

    console.log(`Starting momentum computation from ${startDateStr} to ${endDateStr}`);

    // Delete existing data for this query date
    await query(`DELETE FROM momentum_data WHERE query_date = $1`, [endDateStr]);

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

    console.log(`Found ${numDays} trading days`);

    // Fetch candidate tickers with debugging
    const candidates = await query<{ ticker: string; avg_volume: number; min_volume: number; max_volume: number }>(`
  SELECT ticker, 
         AVG(volume * close) as avg_volume,
         MIN(volume * close) as min_volume,
         MAX(volume * close) as max_volume
  FROM ohlc
  WHERE date BETWEEN $1 AND $2
  AND close BETWEEN 50 AND 2000
  AND (volume * close) >= 1000000000
  GROUP BY ticker
  HAVING COUNT(*) >= $3 * 0.9
  ORDER BY avg_volume DESC
`, [startDateStr, endDateStr, numDays]);

    console.log('Volume statistics for top candidates:');
    candidates.slice(0, 5).forEach(c => {
      console.log(`${c.ticker}: avg=${c.avg_volume.toLocaleString()}, min=${c.min_volume.toLocaleString()}, max=${c.max_volume.toLocaleString()}`);
    });

    console.log(`Processing ${candidates.length} candidate tickers`);

    let processedCount = 0;
    let successCount = 0;

    for (const { ticker } of candidates) {
      try {
        processedCount++;
        console.log(`Processing ${ticker} (${processedCount}/${candidates.length})`);

        // Calculate momentum for all periods
        const [momentum1m, momentum3m, momentum6m] = await Promise.all([
          calculatePeriodMomentum(ticker, startDateStr, endDateStr, 1),
          calculatePeriodMomentum(ticker, startDateStr, endDateStr, 3),
          calculatePeriodMomentum(ticker, startDateStr, endDateStr, 6)
        ]);

        // Skip if any period data is missing
        if (!momentum1m || !momentum3m || !momentum6m) {
          skippedTickers.push({ ticker, reason: 'insufficient period data' });
          continue;
        }

        // Calculate RSI using 6-month data
        const rsiSeries = await query<{ close: number }>(`
          SELECT close
          FROM ohlc
          WHERE ticker = $1 AND date BETWEEN $2 AND $3
          ORDER BY date ASC
        `, [ticker, momentum6m.first_date, momentum6m.last_date]);

        const closes = rsiSeries.map(d => d.close);
        let rsi = 50; // 기본값
        if (closes.length >= 15) {
          const rsiValues = RSI.calculate({ period: 14, values: closes });
          rsi = rsiValues[rsiValues.length - 1] || 50;
          // RSI 값 검증
          if (rsi < 0 || rsi > 100) {
            console.log(`Warning: Invalid RSI value for ${ticker} (${rsi.toFixed(2)}), using default 50`);
            rsi = 50;
          }
        }

        // Fetch fundamental data from Yahoo Finance
        let revenueGrowth = 0;
        let debtToEquity = 1;
        let pbr = 1.5;

        try {
          const summary = await yahooFinance.quoteSummary(ticker, {
            modules: ['financialData', 'defaultKeyStatistics'],
          });
          revenueGrowth = summary.financialData?.revenueGrowth ?? 0;
          debtToEquity = summary.financialData?.debtToEquity ?? 1;
          pbr = summary.defaultKeyStatistics?.priceToBook ?? 1.5;

          // 이상치 캡핑
          if (debtToEquity > 100 || debtToEquity < 0) {
            console.log(`Warning: Extreme debt/equity ratio for ${ticker} (${debtToEquity.toFixed(2)}), capping at 10`);
            debtToEquity = 10;
          }
          if (pbr > 50 || pbr < 0) {
            console.log(`Warning: Extreme PBR for ${ticker} (${pbr.toFixed(2)}), capping at 20`);
            pbr = 20;
          }
        } catch (yahooError) {
          console.log(`Warning: Could not fetch fundamental data for ${ticker}, using defaults`);
        }

        // Data validation and logging
        console.log(`${ticker} metrics:`);
        console.log(`  1M: ${(momentum1m.return_rate * 100).toFixed(2)}% return, ${momentum1m.sortino_ratio.toFixed(2)} sortino`);
        console.log(`  3M: ${(momentum3m.return_rate * 100).toFixed(2)}% return, ${momentum3m.sortino_ratio.toFixed(2)} sortino`);
        console.log(`  6M: ${(momentum6m.return_rate * 100).toFixed(2)}% return, ${momentum6m.sortino_ratio.toFixed(2)} sortino`);
        console.log(`  Fundamentals: RSI=${rsi.toFixed(1)}, RevGrowth=${(revenueGrowth * 100).toFixed(1)}%, D/E=${debtToEquity.toFixed(2)}, PBR=${pbr.toFixed(2)}`);

        // Validate extreme values
        if (momentum6m.return_rate > 10) { // 1000% return seems unrealistic
          console.log(`  Warning: Extreme 6M return rate (${(momentum6m.return_rate * 100).toFixed(2)}%)`);
        }

        if (debtToEquity > 50) { // Very high debt ratio
          console.log(`  Warning: Extreme debt/equity ratio (${debtToEquity.toFixed(2)})`);
          debtToEquity = Math.min(debtToEquity, 10); // Cap at 10
        }

        if (pbr > 100) { // Very high PBR
          console.log(`  Warning: Extreme PBR (${pbr.toFixed(2)})`);
          pbr = Math.min(pbr, 20); // Cap at 20
        }

        try {
          const summary = await yahooFinance.quoteSummary(ticker, {
            modules: ['financialData', 'defaultKeyStatistics'],
          });

          revenueGrowth = summary.financialData?.revenueGrowth ?? 0;
          debtToEquity = summary.financialData?.debtToEquity ?? 1;
          pbr = summary.defaultKeyStatistics?.priceToBook ?? 1.5;
        } catch (yahooError) {
          console.log(`Warning: Could not fetch fundamental data for ${ticker}, using defaults`);
        }

        // Calculate scores with better normalization
        const normalizedRsi = Math.max(0, Math.min(100, rsi)) / 100; // Ensure RSI is 0-1
        const normalizedDebtRatio = Math.min(1.0 / Math.max(debtToEquity, 0.1), 10); // Cap at 10
        const normalizedPbrRatio = Math.min(1.0 / Math.max(pbr, 0.1), 10); // Cap at 10

        const calculateNormalizedScore = (
          returnRate: number,
          sortinoRatio: number,
          revenueGrowth: number,
          rsi: number,
          debtToEquity: number,
          pbr: number,
          weights: number[]
        ) => {
          // 수익률: -100% ~ +100% 범위로 정규화
          const normalizedReturn = Math.max(-1, Math.min(1, returnRate));
          // 소르티노: -3 ~ +3 범위로 정규화
          const normalizedSortino = Math.max(-3, Math.min(3, sortinoRatio));
          // 매출성장률: -50% ~ +50% 범위로 정규화
          const normalizedRevGrowth = Math.max(-0.5, Math.min(0.5, revenueGrowth));
          // RSI: 0-100을 0-1로 정규화
          const normalizedRsi = (100 - rsi) / 100;
          // 부채비율: 역수로 변환 후 0-1로 정규화
          const normalizedDebt = Math.min(1, 1 / Math.max(0.1, debtToEquity));
          // PBR: 역수로 변환 후 0-1로 정규화
          const normalizedPbr = Math.min(1, 1 / Math.max(0.1, pbr));

          // 점수 계산
          const score =
            normalizedReturn * weights[0] +
            normalizedSortino * weights[1] +
            normalizedRevGrowth * weights[2] +
            normalizedRsi * weights[3] +
            normalizedDebt * weights[4] +
            normalizedPbr * weights[5];

          // 점수가 0~1 범위를 벗어나지 않도록 검증
          const finalScore = Math.max(0, Math.min(1, score));
          return finalScore;
        };

        // 가중치 조정 예시
        const score1m = calculateNormalizedScore(
          momentum1m.return_rate, momentum1m.sortino_ratio, revenueGrowth,
          rsi, debtToEquity, pbr,
          [0.35, 0.20, 0.20, 0.15, 0.05, 0.05] // return_rate 비중을 0.40에서 0.35로 낮추고, revenue_growth를 0.15에서 0.20으로 높임
        );
        const score3m = calculateNormalizedScore(
          momentum3m.return_rate, momentum3m.sortino_ratio, revenueGrowth,
          rsi, debtToEquity, pbr,
          [0.30, 0.25, 0.25, 0.10, 0.05, 0.05] // return_rate 비중을 0.35에서 0.30으로 낮추고, revenue_growth를 0.20에서 0.25로 높임
        );
        const score6m = calculateNormalizedScore(
          momentum6m.return_rate, momentum6m.sortino_ratio, revenueGrowth,
          rsi, debtToEquity, pbr,
          [0.25, 0.25, 0.30, 0.05, 0.10, 0.05] // revenue_growth를 0.25에서 0.30으로 높임
        );

        // const finalScore = (score1m * 0.4) + (score3m * 0.35) + (score6m * 0.25);
        const finalScore = Math.max(0, (score1m * 0.4) + (score3m * 0.35) + (score6m * 0.25));
        console.log(`${ticker} scores: 1m=${score1m.toFixed(4)}, 3m=${score3m.toFixed(4)}, 6m=${score6m.toFixed(4)}, final=${finalScore.toFixed(4)}`);

        // Save to database
        await query(`
          INSERT INTO momentum_data (
            query_date, ticker,
            first_date_1m, last_date_1m, first_close_1m, last_close_1m,
            return_rate_1m, sortino_ratio_1m, avg_volume_1m,
            first_date_3m, last_date_3m, first_close_3m, last_close_3m,
            return_rate_3m, sortino_ratio_3m, avg_volume_3m,
            first_date_6m, last_date_6m, first_close_6m, last_close_6m,
            return_rate_6m, sortino_ratio_6m, avg_volume_6m,
            rsi, revenue_growth, debt_to_equity, pbr,
            score_1m, score_3m, score_6m, final_momentum_score,
            created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
          ON CONFLICT (query_date, ticker) DO UPDATE SET
            first_date_1m = EXCLUDED.first_date_1m,
            last_date_1m = EXCLUDED.last_date_1m,
            first_close_1m = EXCLUDED.first_close_1m,
            last_close_1m = EXCLUDED.last_close_1m,
            return_rate_1m = EXCLUDED.return_rate_1m,
            sortino_ratio_1m = EXCLUDED.sortino_ratio_1m,
            avg_volume_1m = EXCLUDED.avg_volume_1m,
            first_date_3m = EXCLUDED.first_date_3m,
            last_date_3m = EXCLUDED.last_date_3m,
            first_close_3m = EXCLUDED.first_close_3m,
            last_close_3m = EXCLUDED.last_close_3m,
            return_rate_3m = EXCLUDED.return_rate_3m,
            sortino_ratio_3m = EXCLUDED.sortino_ratio_3m,
            avg_volume_3m = EXCLUDED.avg_volume_3m,
            first_date_6m = EXCLUDED.first_date_6m,
            last_date_6m = EXCLUDED.last_date_6m,
            first_close_6m = EXCLUDED.first_close_6m,
            last_close_6m = EXCLUDED.last_close_6m,
            return_rate_6m = EXCLUDED.return_rate_6m,
            sortino_ratio_6m = EXCLUDED.sortino_ratio_6m,
            avg_volume_6m = EXCLUDED.avg_volume_6m,
            rsi = EXCLUDED.rsi,
            revenue_growth = EXCLUDED.revenue_growth,
            debt_to_equity = EXCLUDED.debt_to_equity,
            pbr = EXCLUDED.pbr,
            score_1m = EXCLUDED.score_1m,
            score_3m = EXCLUDED.score_3m,
            score_6m = EXCLUDED.score_6m,
            final_momentum_score = EXCLUDED.final_momentum_score,
            updated_at = EXCLUDED.updated_at
        `, [
          endDateStr, ticker,
          momentum1m.first_date, momentum1m.last_date, momentum1m.first_close, momentum1m.last_close,
          momentum1m.return_rate, momentum1m.sortino_ratio, momentum1m.avg_volume,
          momentum3m.first_date, momentum3m.last_date, momentum3m.first_close, momentum3m.last_close,
          momentum3m.return_rate, momentum3m.sortino_ratio, momentum3m.avg_volume,
          momentum6m.first_date, momentum6m.last_date, momentum6m.first_close, momentum6m.last_close,
          momentum6m.return_rate, momentum6m.sortino_ratio, momentum6m.avg_volume,
          rsi, revenueGrowth, debtToEquity, pbr,
          score1m, score3m, score6m, finalScore,
          new Date(), new Date()
        ]);

        successCount++;
        console.log(`✓ Saved ${ticker} (Final Score: ${finalScore.toFixed(4)})`);

      } catch (error) {
        console.error(`Error processing ${ticker}:`, error);
        skippedTickers.push({ ticker, reason: `processing error: ${error instanceof Error ? error.message : 'unknown'}` });
      }
    }

    // Summary
    console.log('\n=== Momentum Computation Summary ===');
    console.log(`Total candidates: ${candidates.length}`);
    console.log(`Successfully processed: ${successCount}`);
    console.log(`Skipped: ${skippedTickers.length}`);

    if (skippedTickers.length > 0) {
      console.log('\nSkipped tickers:');
      skippedTickers.slice(0, 10).forEach(({ ticker, reason }) =>
        console.log(`- ${ticker}: ${reason}`)
      );
      if (skippedTickers.length > 10) {
        console.log(`... and ${skippedTickers.length - 10} more`);
      }
    }

    console.log('=== Computation Completed ===\n');

  } catch (error) {
    console.error('Error in computeMomentumData:', error);
    throw error;
  }
}