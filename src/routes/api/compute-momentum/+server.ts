// src/routes/api/compute-momentum/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { computeMomentumData } from '$lib/server/compute_momentum_data';
import { query } from '$lib/server/db';
import { json } from '@sveltejs/kit';

interface MomentumDataResult {
	ticker: string;
	first_date_1m: string;
	last_date_1m: string;
	first_date_3m: string;
	last_date_3m: string;
	first_date_6m: string;
	last_date_6m: string;
	first_close_1m: number;
	last_close_1m: number;
	first_close_3m: number;
	last_close_3m: number;
	first_close_6m: number;
	last_close_6m: number;
	return_rate_1m: number;
	return_rate_3m: number;
	return_rate_6m: number;
	sortino_ratio_1m: number;
	sortino_ratio_3m: number;
	sortino_ratio_6m: number;
	avg_volume_1m: number;
	avg_volume_3m: number;
	avg_volume_6m: number;
	rsi: number;
	revenue_growth: number;
	debt_to_equity: number;
	pbr: number;
	score_1m: number;
	score_3m: number;
	score_6m: number;
	final_momentum_score: number;
	created_at: string;
	updated_at: string;
}

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

		// Validate date range
		const start = new Date(startDate);
		const end = new Date(endDate);
		if (start >= end) {
			return json({ error: 'Start date must be before end date' }, { status: 400 });
		}

		console.log(`Starting momentum computation for period: ${startDate} to ${endDate}`);

		// Run the momentum computation
		await computeMomentumData(startDate, endDate);

		console.log('Momentum computation completed. Fetching results...');

		// Fetch the results from the database with proper error handling
		const results = await query<MomentumDataResult>(`
			SELECT 
				ticker,
				first_date_1m,
				last_date_1m,
				first_date_3m,
				last_date_3m,
				first_date_6m,
				last_date_6m,
				first_close_1m,
				last_close_1m,
				first_close_3m,
				last_close_3m,
				first_close_6m,
				last_close_6m,
				return_rate_1m,
				return_rate_3m,
				return_rate_6m,
				sortino_ratio_1m,
				sortino_ratio_3m,
				sortino_ratio_6m,
				avg_volume_1m,
				avg_volume_3m,
				avg_volume_6m,
				rsi,
				revenue_growth,
				debt_to_equity,
				pbr,
				score_1m,
				score_3m,
				score_6m,
				final_momentum_score,
				created_at,
				updated_at
			FROM momentum_data
			WHERE query_date = $1
			AND final_momentum_score IS NOT NULL
			ORDER BY final_momentum_score DESC
			LIMIT 100
		`, [endDate]);

		console.log(`Found ${results.length} momentum results`);

		if (results.length === 0) {
			return json({ 
				error: 'No momentum data found for the specified date range. Please check if the computation was successful.',
				data: []
			}, { status: 200 });
		}

		// 점수 계산 검증 및 업데이트 (필요한 경우)
		const updateScoresQuery = `
			UPDATE momentum_data 
			SET 
				score_1m = COALESCE(
					(COALESCE(return_rate_1m, 0) * 0.40 + 
					 COALESCE(sortino_ratio_1m, 0) * 0.20 + 
					 COALESCE(revenue_growth, 0) * 0.15 + 
					 COALESCE(rsi, 0) * 0.15 + 
					 COALESCE(debt_to_equity, 0) * 0.05 + 
					 COALESCE(pbr, 0) * 0.05), 0),
				score_3m = COALESCE(
					(COALESCE(return_rate_3m, 0) * 0.35 + 
					 COALESCE(sortino_ratio_3m, 0) * 0.25 + 
					 COALESCE(revenue_growth, 0) * 0.20 + 
					 COALESCE(rsi, 0) * 0.10 + 
					 COALESCE(debt_to_equity, 0) * 0.05 + 
					 COALESCE(pbr, 0) * 0.05), 0),
				score_6m = COALESCE(
					(COALESCE(return_rate_6m, 0) * 0.25 + 
					 COALESCE(sortino_ratio_6m, 0) * 0.30 + 
					 COALESCE(revenue_growth, 0) * 0.25 + 
					 COALESCE(rsi, 0) * 0.05 + 
					 COALESCE(debt_to_equity, 0) * 0.10 + 
					 COALESCE(pbr, 0) * 0.05), 0),
				updated_at = CURRENT_TIMESTAMP
			WHERE query_date = $1 
			AND (score_1m IS NULL OR score_3m IS NULL OR score_6m IS NULL)
		`;

		await query(updateScoresQuery, [endDate]);

		// 최종 점수 계산 및 업데이트
		const updateFinalScoreQuery = `
			UPDATE momentum_data 
			SET 
				final_momentum_score = COALESCE(
					(COALESCE(score_1m, 0) * 0.4 + 
					 COALESCE(score_3m, 0) * 0.35 + 
					 COALESCE(score_6m, 0) * 0.25), 0),
				updated_at = CURRENT_TIMESTAMP
			WHERE query_date = $1 
			AND final_momentum_score IS NULL
		`;

		await query(updateFinalScoreQuery, [endDate]);

		// 업데이트된 결과 다시 조회
		const finalResults = await query<MomentumDataResult>(`
			SELECT 
				ticker,
				first_date_1m,
				last_date_1m,
				first_date_3m,
				last_date_3m,
				first_date_6m,
				last_date_6m,
				first_close_1m,
				last_close_1m,
				first_close_3m,
				last_close_3m,
				first_close_6m,
				last_close_6m,
				return_rate_1m,
				return_rate_3m,
				return_rate_6m,
				sortino_ratio_1m,
				sortino_ratio_3m,
				sortino_ratio_6m,
				avg_volume_1m,
				avg_volume_3m,
				avg_volume_6m,
				rsi,
				revenue_growth,
				debt_to_equity,
				pbr,
				score_1m,
				score_3m,
				score_6m,
				final_momentum_score,
				created_at,
				updated_at
			FROM momentum_data
			WHERE query_date = $1
			AND final_momentum_score IS NOT NULL
			ORDER BY final_momentum_score DESC
			LIMIT 100
		`, [endDate]);

		console.log(`Returning ${finalResults.length} processed momentum results`);

		return json({ 
			data: finalResults,
			summary: {
				total_count: finalResults.length,
				query_date: endDate,
				date_range: `${startDate} to ${endDate}`,
				top_score: finalResults.length > 0 ? finalResults[0].final_momentum_score : 0,
				avg_score: finalResults.length > 0 ? 
					finalResults.reduce((sum, r) => sum + (r.final_momentum_score || 0), 0) / finalResults.length : 0
			}
		}, { status: 200 });

	} catch (error) {
		console.error('API error:', error);
		
		// 더 자세한 에러 정보 제공
		let errorMessage = 'Failed to compute momentum data';
		let statusCode = 500;

		if (error instanceof Error) {
			errorMessage = error.message;
			
			// 특정 에러 타입에 따른 상태 코드 조정
			if (error.message.includes('connection') || error.message.includes('database')) {
				statusCode = 503; // Service Unavailable
				errorMessage = 'Database connection error. Please try again later.';
			} else if (error.message.includes('timeout')) {
				statusCode = 504; // Gateway Timeout
				errorMessage = 'Request timeout. The computation is taking longer than expected.';
			}
		}

		return json({ 
			error: errorMessage,
			timestamp: new Date().toISOString(),
			data: []
		}, { status: statusCode });
	}
};