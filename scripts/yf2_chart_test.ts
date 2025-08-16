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
  }
}
