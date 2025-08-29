// src/lib/api.ts
import axios from 'axios';

const ALPHA_VANTAGE_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY as string | undefined;
const FRED_API_KEY = import.meta.env.VITE_FRED_API_KEY as string | undefined;

if (!ALPHA_VANTAGE_KEY || !FRED_API_KEY) {
  throw new Error('API keys are missing. Check .env file.');
}

export async function fetchIndicatorData(symbol: string, interval: string = 'daily', months: number = 3) {
  const response = await axios.get(
    `https://www.alphavantage.co/query?function=TIME_SERIES_${interval.toUpperCase()}&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`
  );
  const data = response.data['Time Series (Daily)'];
  if (!data) throw new Error(`No data for symbol ${symbol}`);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - months);

  return Object.entries(data)
    .filter(([date]) => new Date(date) >= threeMonthsAgo)
    .map(([date, values]: [string, any]) => ({
      date: new Date(date), // Convert string to Date here
      value: parseFloat(values['4. close'])
    }));
}

// export async function fetchFredData(seriesId: string) {
//   const response = await axios.get(
//     `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json`
//   );
//   const data = response.data.observations;
//   if (!data) throw new Error(`No data for series ${seriesId}`);

//   return data.slice(-90).map((obs: any) => ({
//     date: new Date(obs.date), // Convert string to Date here
//     value: parseFloat(obs.value)
//   }));
// }

export async function fetchFredData(seriesId: string) {
  const response = await fetch(`/api/fred?seriesId=${seriesId}`);
  if (!response.ok) throw new Error(`No data for series ${seriesId}`);
  const data = await response.json();
  return data.map((item: { date: string | number | Date; }) => ({ ...item, date: new Date(item.date) }));
}

export async function fetchTechnicalIndicator(symbol: string, func: string, interval: string = 'daily') {
  const response = await axios.get(
    `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}&interval=${interval}&time_period=14&series_type=close&apikey=${ALPHA_VANTAGE_KEY}`
  );
  const data = response.data[`Technical Analysis: ${func}`];
  if (!data) throw new Error(`No data for ${func} on ${symbol}`);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  return Object.entries(data)
    .filter(([date]) => new Date(date) >= threeMonthsAgo)
    .map(([date, values]: [string, any]) => ({
      date: new Date(date), // Convert string to Date here
      value: parseFloat(func === 'RSI' ? values.RSI : values.MACD)
    }));
}