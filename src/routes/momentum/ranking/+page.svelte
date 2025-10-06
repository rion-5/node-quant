<!-- src/routes/momentum/ranking/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';

	interface QueryDateInfo {
		query_date: string;
		min_price: number;
		max_price: number;
		min_trading_amount: number;
		count: number;
		avg_final_score: string;
		first_date: string;
		last_date: string;
		display_text: string;
	}
	interface QueryCondition {
		query_date: string;
		min_price: number;
		max_price: number;
		min_trading_amount: number;
	}
	interface MomentumResult {
		ticker: string;
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
		first_close_1m: number;
		last_close_1m: number;
		first_close_3m: number;
		last_close_3m: number;
		first_close_6m: number;
		last_close_6m: number;
		avg_volume_1m: number;
		avg_volume_3m: number;
		avg_volume_6m: number;
		score_1m: number;
		score_3m: number;
		score_6m: number;
		final_momentum_score: number;
	}

	let queryDates: QueryDateInfo[] = [];
	let selectedDate: string = '';
	let results: MomentumResult[] = [];
	let stats: any = {};
	let loading = false;
	let error: string | null = null;
	let showTop10Only = true;
	let selectedCondition: QueryCondition | null = null;

	async function fetchQueryDates() {
		try {
			const res = await fetch('/api/get-query-dates', { method: 'GET' });
			const data = await res.json();
			if (res.ok) {
				queryDates = data.dates;
				if (queryDates.length > 0) {
					selectedDate = queryDates[0].query_date;
					// 자동으로 첫 번째 날짜 데이터 로드
					await fetchRanking();
				}
			} else {
				error = data.error || '조회 기간을 불러오지 못했습니다';
			}
		} catch (err) {
			error = '조회 기간을 불러오는 중 오류가 발생했습니다';
		}
	}

	async function fetchRanking() {
		if (!selectedCondition) {
			error = '조회 날짜를 선택해주세요';
			return;
		}

		loading = true;
		error = null;

		try {
			const response = await fetch('/api/get-momentum-ranking', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				// body: JSON.stringify({ queryDate: selectedDate })
				body: JSON.stringify({
					queryDate: selectedCondition.query_date,
					minPrice: selectedCondition.min_price,
					maxPrice: selectedCondition.max_price,
					minTradingAmount: selectedCondition.min_trading_amount
				})
			});

			const data = await response.json();

			if (response.ok) {
				results = data.data;
				stats = data.stats;
			} else {
				error = data.error || '데이터를 불러오는데 실패했습니다';
			}
		} catch (err) {
			error = '예기치 않은 오류가 발생했습니다';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	// select 변경 핸들러
	function handleConditionChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		selectedCondition = target.value ? JSON.parse(target.value) : null;
		if (selectedCondition) {
			fetchRanking();
		}
	}

	function formatPercentage(value: number): string {
		return (value * 100).toFixed(2) + '%';
	}

	function formatNumber(value: number, decimals: number = 4): string {
		return value?.toFixed(decimals) || '0';
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

	// 날짜 변경시 자동으로 데이터 로드
	$: if (selectedDate) {
		fetchRanking();
	}

	onMount(async () => {
		await fetchQueryDates();
		if (queryDates.length > 0 && !selectedCondition) {
			selectedCondition = queryDates[0]; // 첫 번째 옵션 선택
			await fetchRanking(); // 선택 후 데이터 로드
		}
	});
</script>

<div class="mx-auto max-w-full px-4 py-6">
	<div class="mb-6">
		<h1 class="mb-2 text-3xl font-bold text-gray-900">모멘텀 랭킹</h1>
		<p class="text-gray-600">최종 모멘텀 스코어 기준으로 정렬된 종목 랭킹을 확인할 수 있습니다</p>
	</div>

	<!-- 조회 날짜 선택 -->
	<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<div>
				<label for="queryDate" class="mb-2 block text-sm font-medium text-gray-700">
					분석 기준일 선택
				</label>
				<select
					id="queryDate"
					on:change={handleConditionChange}
					class="w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
				>
					<!-- <option value="">날짜를 선택하세요</option> -->
					{#each queryDates as cond}
						<option
							value={JSON.stringify({
								query_date: cond.query_date,
								min_price: cond.min_price,
								max_price: cond.max_price,
								min_trading_amount: cond.min_trading_amount
							})}>{cond.display_text}</option
						>
					{/each}
				</select>
			</div>

			<div class="flex items-end">
				<label class="flex items-center">
					<input type="checkbox" bind:checked={showTop10Only} class="mr-2" />
					<span class="text-sm text-gray-700">상위 10개 종목만 표시</span>
				</label>
			</div>
		</div>
		{#if selectedCondition}
			<div class="mt-4 rounded bg-gray-100 p-4">
				조회 조건: 주가 ${selectedCondition.min_price.toLocaleString()} - ${selectedCondition.max_price.toLocaleString()},
				최소 거래금액 ${selectedCondition.min_trading_amount.toLocaleString()}
			</div>
		{/if}
	</div>

	<!-- 에러 메시지 -->
	{#if error}
		<div class="mb-6 rounded-md border border-red-200 bg-red-50 p-4">
			<div class="flex">
				<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">오류 발생</h3>
					<p class="mt-1 text-sm text-red-700">{error}</p>
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
				<span class="text-lg font-medium text-gray-700">데이터를 불러오고 있습니다...</span>
			</div>
		</div>
	{/if}

	<!-- 통계 요약 -->
	{#if stats && Object.keys(stats).length > 0 && !loading}
		<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
			<h2 class="mb-4 text-xl font-semibold">분석 요약</h2>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
				<div class="text-center">
					<div class="text-2xl font-bold text-blue-600">{stats.total_count}</div>
					<div class="text-sm text-gray-600">총 종목 수</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-purple-600">
						{formatNumber(stats.avg_final_score, 3)}
					</div>
					<div class="text-sm text-gray-600">평균 최종 점수</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-green-600">
						{formatPercentage(stats.avg_return_1m)}
					</div>
					<div class="text-sm text-gray-600">평균 1개월 수익률</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-yellow-600">
						{formatPercentage(stats.avg_return_3m)}
					</div>
					<div class="text-sm text-gray-600">평균 3개월 수익률</div>
				</div>
				<div class="text-center">
					<div class="text-2xl font-bold text-orange-600">
						{formatPercentage(stats.avg_return_6m)}
					</div>
					<div class="text-sm text-gray-600">평균 6개월 수익률</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- 랭킹 결과 테이블 -->
	{#if results.length > 0 && !loading}
		<div class="overflow-hidden rounded-lg bg-white shadow-md">
			<div class="border-b border-gray-200 px-6 py-4">
				<h2 class="text-xl font-semibold text-gray-900">
					모멘텀 랭킹 결과
					{#if showTop10Only}(상위 10개){:else}(전체 {results.length}개){/if}
				</h2>
				<p class="mt-1 text-sm text-gray-600">최종 모멘텀 스코어 기준으로 정렬되어 있습니다.</p>
			</div>

			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>순위</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>종목</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>최종 점수</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>1개월 점수</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>3개월 점수</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>6개월 점수</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>1개월 수익률</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>3개월 수익률</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>6개월 수익률</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>RSI</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>매출성장률</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>부채비율</th
							>
							<th
								class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>PBR</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each showTop10Only ? results.slice(0, 10) : results as result, index}
							<tr class="hover:bg-gray-50 {index < 3 ? 'bg-yellow-50' : ''}">
								<td class="px-4 py-4 whitespace-nowrap">
									<div class="flex items-center">
										<span class="text-sm font-medium text-gray-900">#{index + 1}</span>
										{#if index === 0}
											<span
												class="ml-2 inline-flex items-center rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800"
												>🥇</span
											>
										{:else if index === 1}
											<span
												class="ml-2 inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
												>🥈</span
											>
										{:else if index === 2}
											<span
												class="ml-2 inline-flex items-center rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800"
												>🥉</span
											>
										{/if}
									</div>
								</td>
								<td class="px-4 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">{result.ticker}</div>
								</td>
								<td class="px-4 py-4 whitespace-nowrap">
									<span class="text-sm font-semibold {getScoreColor(result.final_momentum_score)}">
										{formatNumber(result.final_momentum_score, 4)}
									</span>
								</td>
								<td class="px-4 py-4 whitespace-nowrap">
									<span class="text-sm {getScoreColor(result.score_1m)}">
										{formatNumber(result.score_1m, 4)}
									</span>
								</td>
								<td class="px-4 py-4 whitespace-nowrap">
									<span class="text-sm {getScoreColor(result.score_3m)}">
										{formatNumber(result.score_3m, 4)}
									</span>
								</td>
								<td class="px-4 py-4 whitespace-nowrap">
									<span class="text-sm {getScoreColor(result.score_6m)}">
										{formatNumber(result.score_6m, 4)}
									</span>
								</td>
								<td class="px-4 py-4 whitespace-nowrap">
									<span
										class="text-sm font-medium {result.return_rate_1m >= 0
											? 'text-green-600'
											: 'text-red-600'}"
									>
										{formatPercentage(result.return_rate_1m)}
									</span>
								</td>
								<td class="px-4 py-4 whitespace-nowrap">
									<span
										class="text-sm font-medium {result.return_rate_3m >= 0
											? 'text-green-600'
											: 'text-red-600'}"
									>
										{formatPercentage(result.return_rate_3m)}
									</span>
								</td>
								<td class="px-4 py-4 whitespace-nowrap">
									<span
										class="text-sm font-medium {result.return_rate_6m >= 0
											? 'text-green-600'
											: 'text-red-600'}"
									>
										{formatPercentage(result.return_rate_6m)}
									</span>
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									{formatNumber(result.rsi, 1)}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									<span class={result.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'}>
										{formatPercentage(result.revenue_growth)}
									</span>
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									{formatNumber(result.debt_to_equity, 2)}
								</td>
								<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
									{formatNumber(result.pbr, 2)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- 상위 10개 상세 정보 -->
		{#if results.length > 0}
			<div class="mt-6 overflow-hidden rounded-lg bg-white shadow-md">
				<div class="border-b border-gray-200 px-6 py-4">
					<h2 class="text-xl font-semibold text-gray-900">상위 10개 종목 상세 정보</h2>
					<p class="mt-1 text-sm text-gray-600">
						각 기간별 소르티노 비율과 거래금액 정보를 포함합니다.
					</p>
				</div>

				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>순위</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>종목</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>1개월 소르티노</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>3개월 소르티노</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>6개월 소르티노</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>1개월 평균거래금액</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>3개월 평균거래금액</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>6개월 평균거래금액</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each results.slice(0, 10) as result, index}
								<tr class="hover:bg-gray-50 {index < 3 ? 'bg-blue-50' : ''}">
									<td class="px-4 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
										#{index + 1}
									</td>
									<td class="px-4 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
										{result.ticker}
									</td>
									<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
										{formatNumber(result.sortino_ratio_1m, 2)}
									</td>
									<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
										{formatNumber(result.sortino_ratio_3m, 2)}
									</td>
									<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
										{formatNumber(result.sortino_ratio_6m, 2)}
									</td>
									<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
										{formatVolume(result.avg_volume_1m)}
									</td>
									<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
										{formatVolume(result.avg_volume_3m)}
									</td>
									<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-900">
										{formatVolume(result.avg_volume_6m)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
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
			<h3 class="mt-4 text-lg font-medium text-gray-900">랭킹 데이터가 없습니다</h3>
			<p class="mt-2 text-gray-600">
				분석 기준일을 선택하면 해당 날짜의 모멘텀 랭킹을 확인할 수 있습니다.
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
