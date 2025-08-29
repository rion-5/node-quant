import type { RequestHandler } from '@sveltejs/kit';
import axios from 'axios';

const FRED_API_KEY = process.env.FRED_API_KEY;

export const GET: RequestHandler = async ({ url }) => {
  const seriesId = url.searchParams.get('series_id');
  if (!seriesId) {
    return new Response(JSON.stringify({ error: 'series_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!FRED_API_KEY) {
    return new Response(JSON.stringify({ error: 'FRED API key is missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const response = await axios.get(
      `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json`
    );
    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`Error fetching FRED data for ${seriesId}:`, error);
    return new Response(JSON.stringify({ error: 'Failed to fetch data from FRED API' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};