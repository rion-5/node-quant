// src/routes/api/get-query-dates/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import { format } from 'date-fns';

export const GET: RequestHandler = async () => {
  try {
    const dates = await query<{
      query_date: Date;
      first_date: Date;
      last_date: Date;
    }>(`
      SELECT DISTINCT query_date, MIN(first_date) as first_date, MAX(last_date) as last_date
      FROM momentum_data
      GROUP BY query_date
      ORDER BY query_date DESC
    `);
    console.log('Fetched dates:', dates); // 디버깅 로그
    return json({
      dates: dates.map(d => ({
        query_date: format(d.query_date, 'yyyy-MM-dd'),
        first_date: format(d.first_date, 'yyyy-MM-dd'),
        last_date: format(d.last_date, 'yyyy-MM-dd')
      }))
    }, { status: 200 });
  } catch (error) {
    console.error('get-query-dates error:', error);
    return json({ error: 'Failed to get dates' }, { status: 500 });
  }
};