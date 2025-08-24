// src/routes/api/compute-momentum/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { computeMomentumData } from '$lib/server/compute_momentum_data';
import { query } from '$lib/server/db';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { startDate, endDate } = await request.json();

    if (!startDate || !endDate) {
      return json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    // Validate date format (yyyy-MM-dd)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return json({ error: 'Invalid date format. Use yyyy-MM-dd' }, { status: 400 });
    }

    // Run the momentum computation
    await computeMomentumData(startDate, endDate);

    // Fetch the results from the database
    const results = await query<{
      ticker: string;
      first_date: string;
      last_date: string;
      first_close: number;
      last_close: number;
      avg_volume: number;
      sortino_ratio: number;
      return_rate: number;
      rsi: number;
      revenue_growth: number;
      debt_to_equity: number;
      pbr: number;
      six_month_change: number;
    }>(`
      SELECT *
      FROM momentum_data
      WHERE query_date = $1
      ORDER BY return_rate DESC
    `, [endDate]);

    return json({ data: results }, { status: 200 });
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Failed to compute momentum data' }, { status: 500 });
  }
};