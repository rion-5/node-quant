<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
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
    // { name: '미국실업률', seriesId: 'UNRATE', type: 'fred' },
    // { name: '미국 금리변동', seriesId: 'FEDFUNDS', type: 'fred' },
    // { name: '금 가격 변동', symbol: 'GOLD', type: 'alpha' },
    // { name: '유가변동', symbol: 'WTI', type: 'alpha' },
    // { name: '나스닥 변동', symbol: 'IXIC', type: 'alpha' },
    // { name: 'VIX 변동성 지수', symbol: 'VIX', type: 'alpha' },
    // { name: 'S&P 500 지수 변동', symbol: 'SPX', type: 'alpha' },
    // { name: '10년 만기 미국 국채 수익률', seriesId: 'GS10', type: 'fred' },
    // { name: 'DXY (미 달러 인덱스)', symbol: 'DXY', type: 'alpha' },
    // { name: '제조업 PMI', seriesId: 'NAPM', type: 'fred' },
    // { name: 'GDP 성장률', seriesId: 'A191RL1Q225SBEA', type: 'fred' }
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
  });
</script>
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
  {#each indicators as ind}
    <div class="bg-white p-4 rounded shadow">
      <h2 class="text-lg font-bold mb-2">{ind.name} (3개월 데이터)</h2>
      {#if chartsData[ind.name]?.length}
        <table class="w-full text-sm">
          <thead>
            <tr>
              <th class="text-left p-2">Date</th>
              <th class="text-right p-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {#each chartsData[ind.name] as point}
              <tr>
                <td class="p-2">{point.date.toISOString().split('T')[0]}</td>
                <td class="text-right p-2">{point.value.toFixed(2)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <div class="text-center p-4">
          {chartsData[ind.name] ? 'No data available' : 'Loading...'}
        </div>
      {/if}
    </div>
  {/each}
</div>