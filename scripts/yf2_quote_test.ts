import yahooFinance from 'yahoo-finance2';

interface StockData {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function getStockQuote(symbol: string){
  try{
    const quote = await yahooFinance.quote(symbol);
    console.log(`${symbol} 현재 정보:`);
    console.log(`현재가: $${quote.regularMarketPrice}`);
    console.log(`전일 종가: $${quote.regularMarketPreviousClose}`);

    return quote;
  }catch (error) {
    console.error('Quote 가져오기 실패:', error);
    throw error;
  }
}

async function main(){
  getStockQuote('AAPL');
}

main();
