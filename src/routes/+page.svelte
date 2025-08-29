<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import * as Plot from '@observablehq/plot';
	import { fetchIndicatorData, fetchFredData } from '$lib/api';

	// 타입 정의
	interface IndicatorAlpha {
		name: string;
		symbol: string;
		type: 'alpha';
	}
	interface IndicatorFred {
		name: string;
		seriesId: string;
		type: 'fred';
	}
	type Indicator = IndicatorAlpha | IndicatorFred;

	// 데이터 타입
	interface ChartDataPoint {
		date: Date;
		value: number;
	}

	let chartsData: Record<string, ChartDataPoint[]> = {};
	const indicators: Indicator[] = [
		// { name: '달러원환율', symbol: 'FX:USDKRW', type: 'alpha' },
		{ name: '미국 소비자물가지수', seriesId: 'CPIAUCSL', type: 'fred' },
		{ name: '미국실업률', seriesId: 'UNRATE', type: 'fred' },
		{ name: '미국 금리변동', seriesId: 'FEDFUNDS', type: 'fred' },
		// { name: '금 가격 변동', symbol: 'GOLD', type: 'alpha' },
		// { name: '유가변동', symbol: 'WTI', type: 'alpha' },
		// { name: '나스닥 변동', symbol: 'IXIC', type: 'alpha' },
		// { name: 'VIX 변동성 지수', symbol: 'VIX', type: 'alpha' },
		// { name: 'S&P 500 지수 변동', symbol: 'SPX', type: 'alpha' },
		{ name: '10년 만기 미국 국채 수익률', seriesId: 'GS10', type: 'fred' },
		// { name: 'DXY (미 달러 인덱스)', symbol: 'DXY', type: 'alpha' },
		{ name: '제조업 PMI', seriesId: 'NAPM', type: 'fred' },
		{ name: 'GDP 성장률', seriesId: 'A191RL1Q225SBEA', type: 'fred' }
	];

	onMount(async () => {
		for (const ind of indicators) {
			try {
				if (ind.type === 'alpha') {
					chartsData[ind.name] = await fetchIndicatorData(ind.symbol);
				} else if (ind.type === 'fred') {
					chartsData[ind.name] = await fetchFredData(ind.seriesId);
				}
				chartsData = { ...chartsData }; // 강제로 반응성 트리거
			} catch (error) {
				console.error(`Error fetching data for ${ind.name}:`, error);
				chartsData[ind.name] = []; // 에러 발생 시 빈 배열로 설정
				chartsData = { ...chartsData };
			}
		}

		// 차트 렌더링
		if (chartsData['미국 소비자물가지수']) {
			const data = chartsData['미국 소비자물가지수'].filter((d) => {
				const threeMonthsAgo = new Date();
				threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
				return d.date >= threeMonthsAgo;
			});

			const plot = Plot.plot({
				title: '미국 소비자물가지수 (최근 3개월)',
				x: { label: '날짜', type: 'time' },
				y: { label: 'CPI 값', grid: true },
				marks: [
					Plot.line(data, { x: 'date', y: 'value', stroke: '#4682b4' }),
					Plot.dot(data, { x: 'date', y: 'value', fill: '#4682b4' })
				]
			});

			const chartContainer = document.getElementById('cpi-chart');
			if (chartContainer) {
				chartContainer.appendChild(plot);
			}
		}
	});
</script>
<div id="cpi-chart"></div>

<div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
	{#each indicators as ind}
		<div class="rounded bg-white p-4 shadow">
			<h2 class="mb-2 text-lg font-bold">{ind.name} (3개월 데이터)</h2>
			{#if chartsData[ind.name]?.length}
				<table class="w-full text-sm">
					<thead>
						<tr>
							<th class="p-2 text-left">Date</th>
							<th class="p-2 text-right">Value</th>
						</tr>
					</thead>
					<tbody>
						{#each chartsData[ind.name] as point}
							<tr>
								<td class="p-2">{point.date.toISOString().split('T')[0]}</td>
								<td class="p-2 text-right">{point.value.toFixed(2)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<div class="p-4 text-center">
					{chartsData[ind.name] ? 'No data available' : 'Loading...'}
				</div>
			{/if}
		</div>
	{/each}
</div>
<style>
  #cpi-chart {
    width: 100%;
    max-width: 800px;
    height: 400px;
    margin: 0 auto;
  }
</style>