import yahooFinance from 'yahoo-finance2';

yahooFinance.suppressNotices(['yahooSurvey']);

async function fetchStockData(ticker: string) {
  try {
    const quote = await yahooFinance.quote(ticker);
    console.log(`Price of ${ticker}: $${quote.regularMarketPrice}`);
  } catch (error) {
    console.error(`Error fetching ${ticker}:`, error);
  }
}

fetchStockData('AAPL');
