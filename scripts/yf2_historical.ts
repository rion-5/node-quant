import yahooFinance from 'yahoo-finance2';
import { format } from 'date-fns';

const ticker = 'MSFT';
const startDate = '2025-07-23';
const endDate = '2025-07-31';

async function getYahooHistoricalData(): Promise<void>{
  try{
    yahooFinance.suppressNotices(['yahooSurvey']);
    yahooFinance.suppressNotices(['ripHistorical']);
    const h_data = await yahooFinance.historical(ticker, {
              period1: format(startDate, 'yyyy-MM-dd'),
              period2: format(endDate, 'yyyy-MM-dd'),
            });
    console.log (h_data);
  } catch (error: unknown) {
    console.error('Error fetching data:', error instanceof Error ? error.message : 'Unknown error');

  }
}

getYahooHistoricalData();

