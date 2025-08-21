import yahooFinance from 'yahoo-finance2';
import { format } from 'date-fns';


async function getYahooChartData(ticker:string,startDate:string, endDate:string): Promise<void>{
  try{
    yahooFinance.suppressNotices(['yahooSurvey']);
    yahooFinance.suppressNotices(['ripHistorical']);
    const chart_data = await yahooFinance.chart(ticker, {
              period1: format(startDate, 'yyyy-MM-dd'),
              period2: format(endDate, 'yyyy-MM-dd'),
            });
    console.log (chart_data.quotes);
  } catch (error: unknown) {
    console.error('Error fetching data:', error instanceof Error ? error.message : 'Unknown error');

  }
}

getYahooChartData('MSFT','2025-07-23','2025-07-31');

