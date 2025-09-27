<!-- src/routes/momentum/calculator/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { format, subDays, parseISO, isValid } from 'date-fns';
	import { ko } from 'date-fns/locale';

	let startDate = format(subDays(new Date(), 180), 'yyyy-MM-dd');
	let endDate = format(new Date(), 'yyyy-MM-dd');
	let results: any[] = [];
	let loading = false;
	let error: string | null = null;
	let sortBy = 'final_momentum_score';
	let sortOrder = 'desc';

	interface MomentumData {
		ticker: string;
		first_date_1m: string;
		last_date_1m: string;
		first_date_3m: string;
		last_date_3m: string;
		first_date_6m: string;
		last_date_6m: string;
		return_rate_1m: number;
		return_rate_3m: number;
		return_rate_6m: number;
		sortino_ratio_1m: number;
		sortino_ratio_3m: number;
		sortino_ratio_6m: number;
		rsi: number;
		revenue_growth: number;
		debt_to_equity: number;
		pbr: number;
		score_1m: number;
		score_3m: number;
		score_6m: number;
		final_momentum_score: number;
		avg_volume_1m: number;
		avg_volume_3m: number;
		avg_volume_6m: number;
	}

	function getKSTDate(date: Date | string = new Date()): Date {
		const input = typeof date === 'string' ? parseISO(date) : date;
		if (!isValid(input)) throw new Error('유효하지 않은 날짜입니다.');
		return new Date(input.getTime() + 9 * 60 * 60 * 1000);
	}

	function toKSTDateString(date: Date | string): string {
		const kst = getKSTDate(date);
		return format(kst, 'yyyy-MM-dd', { locale: ko });
	}

	function formatPercentage(value: number): string {
		return (value * 100).toFixed(2) + '%';
	}

	function formatNumber(value: number, decimals: number = 2): string {
		return value?.toFixed(decimals) || '0.00';
	}

	function formatVolume(value: number): string {
		return Math.round(value)?.toLocaleString() || '0';
	}

	function getScoreColor(score: number): string {
		if (score >= 0.7) return 'text-green-600 font-semibold';
		if (score >= 0.5) return 'text-blue-600 font-medium';
		if (score >= 0.3) return 'text-yellow-600';
		return 'text-red-600';
	}

	function sortResults(field: string) {
		if (sortBy === field) {
			sortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
		} else {
			sortBy = field;
			sortOrder = 'desc';
		}

		results = [...results].sort((a, b) => {
			const aVal = a[field];
			const bVal = b[field];
			if (sortOrder === 'desc') {
				return bVal - aVal;
			} else {
				return aVal - bVal;
			}
		});
	}

	async function fetchMomentumData() {
		loading = true;
		error = null;
		results = [];

		try {
			const response = await fetch('/api/compute-momentum', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ startDate, endDate })
			});

			const data = await response.json();

			if (response.ok) {
				// Convert numeric fields from strings to numbers
				results = data.data.map((row: any) => ({
					...row,
					return_rate_1m: parseFloat(row.return_rate_1m) || 0,
					return_rate_3m: parseFloat(row.return_rate_3m) || 0,
					return_rate_6m: parseFloat(row.return_rate_6m) || 0,
					sortino_ratio_1m: parseFloat(row.sortino_ratio_1m) || 0,
					sortino_ratio_3m: parseFloat(row.sortino_ratio_3m) || 0,
					sortino_ratio_6m: parseFloat(row.sortino_ratio_6m) || 0,
					rsi: parseFloat(row.rsi) || 0,
					revenue_growth: parseFloat(row.revenue_growth) || 0,
					debt_to_equity: parseFloat(row.debt_to_equity) || 0,
					pbr: parseFloat(row.pbr) || 0,
					score_1m: parseFloat(row.score_1m) || 0,
					score_3m: parseFloat(row.score_3m) || 0,
					score_6m: parseFloat(row.score_6m) || 0,
					final_momentum_score: parseFloat(row.final_momentum_score) || 0,
					avg_volume_1m: parseFloat(row.avg_volume_1m) || 0,
					avg_volume_3m: parseFloat(row.avg_volume_3m) || 0,
					avg_volume_6m: parseFloat(row.avg_volume_6m) || 0
				}));
			} else {
				error = data.error || 'Failed to fetch data';
			}
		} catch (err) {
			error =
				'An unexpected error occurred: ' + (err instanceof Error ? err.message : 'Unknown error');
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		// Optionally fetch data on page load
	});
</script>

<div class="mx-auto max-w-full px-4 py-6">
	<div class="mb-6">
		<h1 class="mb-2 text-3xl font-bold text-gray-900">모멘텀 투자 분석기</h1>
		<p class="text-gray-600">1개월, 3개월, 6개월 기간별 모멘텀 분석을 통한 종목 평가</p>
	</div>

	<!-- 입력 폼 -->
	<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
		<h2 class="mb-4 text-xl font-semibold">분석 기간 설정</h2>
		<form on:submit|preventDefault={fetchMomentumData} class="space-y-4">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<label for="startDate" class="mb-1 block text-sm font-medium text-gray-700"
						>시작 날짜</label
					>
					<input
						type="date"
						id="startDate"
						bind:value={startDate}
						class="w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						disabled={loading}
					/>
				</div>
				<div>
					<label for="endDate" class="mb-1 block text-sm font-medium text-gray-700">종료 날짜</label
					>
					<input
						type="date"
						id="endDate"
						bind:value={endDate}
						class="w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						disabled={loading}
					/>
				</div>
			</div>
			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-md bg-blue-600 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 md:w-auto"
			>
				{loading ? '분석 중...' : '모멘텀 분석 실행'}
			</button>
		</form>
	</div>

	{#if error}
		<div class="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">오류 발생</h3>
					<div class="mt-2 text-sm text-red-700">{error}</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- 로딩 상태 -->
	{#if loading}
		<div class="rounded-lg bg-white p-8 text-center shadow-md">
			<div class="inline-flex items-center">
				<svg class="mr-3 -ml-1 h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				<span class="text-lg font-medium text-gray-700">모멘텀 데이터를 분석하고 있습니다...</span>
			</div>
			<p class="mt-2 text-sm text-gray-500">잠시만 기다려주세요. 수 분이 소요될 수 있습니다.</p>
		</div>
	{/if}

	<!-- 결과 테이블 -->
	{#if results.length > 0 && !loading}
		<div class="overflow-hidden rounded-lg bg-white shadow-md">
			<div class="border-b border-gray-200 px-6 py-4">
				<h2 class="text-xl font-semibold text-gray-900">분석 결과 ({results.length}개 종목)</h2>
				<p class="mt-1 text-sm text-gray-600">
					최종 점수 기준으로 정렬되어 있습니다. 컬럼 헤더를 클릭하면 정렬 기준을 변경할 수 있습니다.
				</p>
			</div>

			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								종목
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
								on:click={() => sortResults('final_momentum_score')}
							>
								최종 점수 {sortBy === 'final_momentum_score'
									? sortOrder === 'desc'
										? '↓'
										: '↑'
									: ''}
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
								on:click={() => sortResults('score_1m')}
							>
								1개월 점수 {sortBy === 'score_1m' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
								on:click={() => sortResults('score_3m')}
							>
								3개월 점수 {sortBy === 'score_3m' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
								on:click={() => sortResults('score_6m')}
							>
								6개월 점수 {sortBy === 'score_6m' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
								on:click={() => sortResults('return_rate_1m')}
							>
								1개월 수익률 {sortBy === 'return_rate_1m' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
								on:click={() => sortResults('return_rate_3m')}
							>
								3개월 수익률 {sortBy === 'return_rate_3m' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
							</th>
							<th
								class="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
								on:click={() => sortResults('return_rate_6m')}
							>
								6개월 수익률 {sortBy === 'return_rate_6m' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
							</th>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								RSI
							</th>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								매출 성장률
							</th>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								부채비율
							</th>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								PBR
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each results as row, index}
							<tr class="hover:bg-gray-50 {index < 10 ? 'bg-blue-50' : ''}">
								<td
									class="sticky left-0 bg-inherit px-4 py-4 text-sm font-medium whitespace-nowrap text-gray-900"
								>
									{row.ticker}
									{#if index < 10}
										<span
											class="ml-2 inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
										>
											Top {index + 1}
										</span>
									{/if}
								</td>
								<td
									class="px-4 py-4 text-sm whitespace-nowrap {getScoreColor(
										row.final_momentum_score
									)}"
								>
									{formatNumber(row.final_momentum_score, 4)}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap {getScoreColor(row.score_1m)}">
									{formatNumber(row.score_1m, 4)}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap {getScoreColor(row.score_3m)}">
									{formatNumber(row.score_3m, 4)}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap {getScoreColor(row.score_6m)}">
									{formatNumber(row.score_6m, 4)}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									<span class={row.return_rate_1m >= 0 ? 'text-green-600' : 'text-red-600'}>
										{formatPercentage(row.return_rate_1m)}
									</span>
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									<span class={row.return_rate_3m >= 0 ? 'text-green-600' : 'text-red-600'}>
										{formatPercentage(row.return_rate_3m)}
									</span>
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									<span class={row.return_rate_6m >= 0 ? 'text-green-600' : 'text-red-600'}>
										{formatPercentage(row.return_rate_6m)}
									</span>
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									{formatNumber(row.rsi)}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									{formatPercentage(row.revenue_growth)}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									{formatNumber(row.debt_to_equity)}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									{formatNumber(row.pbr)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- 통계 요약 -->
		<div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
			<div class="rounded-lg bg-white p-4 shadow">
				<div class="text-sm font-medium text-gray-500">평균 최종 점수</div>
				<div class="mt-1 text-xl font-semibold text-gray-900">
					{formatNumber(
						results.reduce((sum, r) => sum + r.final_momentum_score, 0) / results.length,
						4
					)}
				</div>
			</div>
			<div class="rounded-lg bg-white p-4 shadow">
				<div class="text-sm font-medium text-gray-500">평균 1개월 수익률</div>
				<div class="mt-1 text-xl font-semibold text-gray-900">
					{formatPercentage(results.reduce((sum, r) => sum + r.return_rate_1m, 0) / results.length)}
				</div>
			</div>
			<div class="rounded-lg bg-white p-4 shadow">
				<div class="text-sm font-medium text-gray-500">평균 3개월 수익률</div>
				<div class="mt-1 text-xl font-semibold text-gray-900">
					{formatPercentage(results.reduce((sum, r) => sum + r.return_rate_3m, 0) / results.length)}
				</div>
			</div>
			<div class="rounded-lg bg-white p-4 shadow">
				<div class="text-sm font-medium text-gray-500">평균 6개월 수익률</div>
				<div class="mt-1 text-xl font-semibold text-gray-900">
					{formatPercentage(results.reduce((sum, r) => sum + r.return_rate_6m, 0) / results.length)}
				</div>
			</div>
		</div>
	{:else if !loading && !error}
		<div class="rounded-lg bg-white p-8 text-center shadow-md">
			<svg
				class="mx-auto h-16 w-16 text-gray-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
				/>
			</svg>
			<h3 class="mt-4 text-lg font-medium text-gray-900">분석 결과가 없습니다</h3>
			<p class="mt-2 text-gray-600">
				날짜 범위를 선택하고 "모멘텀 분석 실행" 버튼을 클릭하여 시작하세요.
			</p>
		</div>
	{/if}
</div>

<style>
	/* 스크롤바 스타일링 */
	.overflow-x-auto::-webkit-scrollbar {
		height: 8px;
	}

	.overflow-x-auto::-webkit-scrollbar-track {
		background: #f1f5f9;
	}

	.overflow-x-auto::-webkit-scrollbar-thumb {
		background: #cbd5e1;
		border-radius: 4px;
	}

	.overflow-x-auto::-webkit-scrollbar-thumb:hover {
		background: #94a3b8;
	}
</style>
