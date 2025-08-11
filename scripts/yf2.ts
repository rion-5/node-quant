import yahooFinance from 'yahoo-finance2';

// Yahoo Finance quote 응답 타입 정의 (간소화)
interface Quote {
  symbol: string;
  regularMarketPrice: number;
  currency: string;
  marketCap: number;
}

async function getYahooData(): Promise<void> {
  try {
    yahooFinance.suppressNotices(['yahooSurvey']);
    const quote = await yahooFinance.quote('AAPL') as Quote;
    console.log(quote);
  } catch (error: unknown) {
    console.error('Error fetching data:', error instanceof Error ? error.message : 'Unknown error');
  }
}

getYahooData();
