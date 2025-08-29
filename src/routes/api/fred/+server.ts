import { json } from '@sveltejs/kit';
import axios from 'axios';

const FRED_API_KEY = import.meta.env.VITE_FRED_API_KEY as string;

export async function GET({ url }) {
  const seriesId = url.searchParams.get('seriesId');
  try {
    const response = await axios.get(
      `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json`
    );
    const data = response.data.observations.slice(-90).map((obs: any) => ({
      date: new Date(obs.date),
      value: parseFloat(obs.value)
    }));
    return json(data);
  } catch (error) {
    return json({ error: `No data for series ${seriesId}` }, { status: 500 });
  }
}