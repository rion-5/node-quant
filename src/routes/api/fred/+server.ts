// src/routes/api/fred/+server.ts
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const seriesId = url.searchParams.get('series_id');
  const observationStart = url.searchParams.get('observation_start');
  const apiKey = import.meta.env.VITE_FRED_API_KEY as string;
  
  if (!seriesId) {
    return new Response(JSON.stringify({ error: 'series_id is required' }), {
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
    let fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=60`;
    
    if (observationStart) {
      fredUrl += `&observation_start=${observationStart}`;
    }

    const response = await fetch(fredUrl);
    
    if (!response.ok) {
      throw new Error(`FRED API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error fetching FRED data:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=4443d292d0468c659d2d71e4f8427522&file_type=json&observation_start=2025-01-01&limit=60

// https://api.stlouisfed.org/fred/series/observations?series_id=ISM_MAN_PMI&api_key=4443d292d0468c659d2d71e4f8427522&file_type=json&observation_start=2025-01-01&limit=60