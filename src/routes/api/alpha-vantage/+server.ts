// src/routes/api/alpha-vantage/+server.ts
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const symbol = url.searchParams.get('symbol');
  const dataType = url.searchParams.get('type') || 'stock';
  const apiKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY as string;
  
  if (!symbol) {
    return new Response(JSON.stringify({ error: 'symbol is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    let alphaUrl: string;
    
    // 데이터 타입에 따라 다른 API 함수 사용
    switch (dataType) {
      case 'forex':
        // USD/KRW 환율의 경우
        if (symbol === 'USDKRW') {
          alphaUrl = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=USD&to_symbol=KRW&apikey=${apiKey}`;
        } else {
          alphaUrl = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${symbol.slice(0,3)}&to_symbol=${symbol.slice(3)}&apikey=${apiKey}`;
        }
        break;
      
      case 'commodity':
      case 'index':
      default:
        // 모든 ETF와 주식은 TIME_SERIES_DAILY 사용
        alphaUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;
        break;
    }

    const response = await fetch(alphaUrl);
    
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // API 에러 체크
    if (data['Error Message'] || data['Note']) {
      throw new Error(data['Error Message'] || data['Note'] || 'API limit reached');
    }
    
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching Alpha Vantage data:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to fetch data' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

//달러원 https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=USD&to_symbol=KRW&apikey=T2H18IQLW5IU564R
//금 https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=GLD&apikey=T2H18IQLW5IU564R
//유가 https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=USO&apikey=T2H18IQLW5IU564R
//QQQ https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=QQQ&apikey=T2H18IQLW5IU564R
