<!-- src/routes/plot/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as Plot from '@observablehq/plot';

  interface FredDataPoint {
    date: string;
    value: string;
  }

  interface FredResponse {
    observations: FredDataPoint[];
    realtime_start: string;
    realtime_end: string;
    count: number;
  }

  interface SeriesData {
    id: string;
    title: string;
    data: { date: Date; value: number }[];
    color: string;
  }

  let series: SeriesData[] = [];
  let loading = true;
  let error = '';

  // 주요 경제 지표 시리즈 ID들
  const ECONOMIC_INDICATORS = [
    { id: 'CPIAUCSL', title: '소비자 물가지수', color: '#10b981' },
    { id: 'UNRATE', title: '실업률 (%)', color: '#ef4444' },
    { id: 'FEDFUNDS', title: '연방기금금리 (%)', color: '#f59e0b' },
    { id: 'GS10', title: '10년 만기 미국 국채 수익률', color: '#06b6d4' },
    { id: 'GDP', title: '실질 GDP', color: '#3b82f6' },
    // { id: 'NAPM', title: '제조업 PMI', color: '#8b5cf6' }
    { id: 'A191RL1Q225SBEA', title: 'GDP 성장률', color: '#8b5cf6'}
  ];

  async function fetchFredData(seriesId: string): Promise<FredResponse> {
    const response = await fetch(`/api/fred?series_id=${seriesId}&observation_start=2022-01-01`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${seriesId}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data;
  }

  function processData(rawData: FredDataPoint[]): { date: Date; value: number }[] {
    return rawData
      .filter(d => d.value !== '.')
      .map(d => ({
        date: new Date(d.date),
        value: parseFloat(d.value)
      }))
      .filter(d => !isNaN(d.value));
  }

  async function loadData() {
    try {
      loading = true;
      error = '';
      
      const promises = ECONOMIC_INDICATORS.map(async (indicator) => {
        try {
          const response = await fetchFredData(indicator.id);
          const processedData = processData(response.observations || []);
          
          return {
            id: indicator.id,
            title: indicator.title,
            data: processedData,
            color: indicator.color
          };
        } catch (err) {
          console.warn(`Failed to load ${indicator.id}:`, err);
          return {
            id: indicator.id,
            title: indicator.title,
            data: [],
            color: indicator.color
          };
        }
      });

      series = await Promise.all(promises);
    } catch (err) {
      error = err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.';
      console.error('Error loading data:', err);
    } finally {
      loading = false;
    }
  }

  function createChart(container: HTMLElement, seriesData: SeriesData) {
    if (!container || seriesData.data.length === 0) return;
    
    // 컨테이너 초기화
    container.innerHTML = '';
    
    const plot = Plot.plot({
      title: seriesData.title,
      width: Math.min(600, container.clientWidth - 20),
      height: 300,
      marginLeft: 70,
      marginBottom: 60,
      marginRight: 20,
      style: {
        backgroundColor: "white",
        fontSize: "12px"
      },
      x: {
        type: "time",
        label: "날짜",
        grid: true,
        tickFormat: "%Y-%m"
      },
      y: {
        label: "값",
        grid: true,
        nice: true
      },
      marks: [
        Plot.line(seriesData.data, {
          x: "date",
          y: "value",
          stroke: seriesData.color,
          strokeWidth: 2.5,
          curve: "catmull-rom"
        }),
        Plot.dot(seriesData.data.slice(-1), {
          x: "date",
          y: "value",
          fill: seriesData.color,
          r: 5,
          stroke: "white",
          strokeWidth: 2
        }),
        Plot.ruleY([0], {
          stroke: "#ccc",
          strokeDasharray: "3,3"
        })
      ]
    });

    container.appendChild(plot);
  }

  function calculateGrowthRate(data: { date: Date; value: number }[]): number {
    if (data.length < 2) return 0;
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    return ((latest.value - previous.value) / previous.value) * 100;
  }

  onMount(() => {
    loadData();
  });

  $: if (series.length > 0) {
    // 차트 업데이트
    setTimeout(() => {
      series.forEach((seriesData, index) => {
        const container = document.getElementById(`chart-${index}`);
        if (container) {
          createChart(container, seriesData);
        }
      });
    }, 100);
  }
</script>

<svelte:head>
  <title>FRED 경제 지표 대시보드</title>
  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  <script src="https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6"></script>
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- 헤더 -->
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">
        📊 FRED 경제 지표 대시보드
      </h1>
      <p class="text-lg text-gray-600 mb-6">
        연방준비은행 경제 데이터(FRED)를 실시간으로 시각화합니다
      </p>
      <button 
        on:click={loadData}
        disabled={loading}
        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        {loading ? '📡 데이터 로딩 중...' : '🔄 데이터 새로고침'}
      </button>
    </div>

    <!-- 에러 메시지 -->
    {#if error}
      <div class="bg-red-100 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg mb-8 shadow">
        <div class="flex items-center">
          <span class="text-xl mr-2">⚠️</span>
          <div>
            <strong>오류 발생:</strong> {error}
            <p class="text-sm mt-1">
              환경변수 VITE_FRED_API_KEY가 설정되어 있는지 확인해주세요.
            </p>
          </div>
        </div>
      </div>
    {/if}

    <!-- 로딩 상태 -->
    {#if loading}
      <div class="flex flex-col justify-center items-center py-20">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
        <p class="text-gray-600">경제 데이터를 가져오는 중...</p>
      </div>
    {/if}

    <!-- 차트 그리드 -->
    {#if !loading && series.length > 0}
      <!-- 요약 카드 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {#each series as seriesData}
          {#if seriesData.data.length > 0}
            <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-medium text-gray-600 truncate">
                  {seriesData.title}
                </h3>
                <div class="w-3 h-3 rounded-full" style="background-color: {seriesData.color}"></div>
              </div>
              <div class="text-2xl font-bold text-gray-900 mb-1">
                {seriesData.data[seriesData.data.length - 1].value.toLocaleString('ko-KR', {
                  minimumFractionDigits: seriesData.id === 'UNRATE' || seriesData.id === 'FEDFUNDS' ? 1 : 1,
                  maximumFractionDigits: seriesData.id === 'UNRATE' || seriesData.id === 'FEDFUNDS' ? 1 : 1
                })}
                {seriesData.id === 'UNRATE' || seriesData.id === 'FEDFUNDS' ? '%' : ''}
              </div>
              <div class="text-xs text-gray-500">
                전월 대비: 
                {#if seriesData.data.length >= 2}
                  {@const growthRate = calculateGrowthRate(seriesData.data)}
                  <span class={growthRate > 0 ? 'text-red-600' : growthRate < 0 ? 'text-blue-600' : 'text-gray-500'}>
                    {growthRate > 0 ? '↗' : growthRate < 0 ? '↘' : '→'} {growthRate.toFixed(2)}%
                  </span>
                {:else}
                  <span class="text-gray-400">-</span>
                {/if}
              </div>
            </div>
          {/if}
        {/each}
      </div>

      <!-- 차트 그리드 -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {#each series as seriesData, index}
          <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <h3 class="text-xl font-semibold text-gray-800">
                  {seriesData.title}
                </h3>
                <div class="flex items-center space-x-2">
                  <div class="w-3 h-3 rounded-full" style="background-color: {seriesData.color}"></div>
                  <span class="text-sm text-gray-500">
                    {seriesData.data.length}개 포인트
                  </span>
                </div>
              </div>
            </div>
            
            <div class="p-6">
              {#if seriesData.data.length > 0}
                <!-- 최신 값 표시 -->
                <div class="mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg">
                  <div class="text-sm text-gray-600 mb-1">
                    최신 값 ({seriesData.data[seriesData.data.length - 1].date.toLocaleDateString('ko-KR')})
                  </div>
                  <div class="text-3xl font-bold" style="color: {seriesData.color}">
                    {seriesData.data[seriesData.data.length - 1].value.toLocaleString('ko-KR', {
                      minimumFractionDigits: seriesData.id === 'UNRATE' || seriesData.id === 'FEDFUNDS' ? 1 : 1,
                      maximumFractionDigits: seriesData.id === 'UNRATE' || seriesData.id === 'FEDFUNDS' ? 1 : 1
                    })}
                    {seriesData.id === 'UNRATE' || seriesData.id === 'FEDFUNDS' ? '%' : ''}
                  </div>
                </div>
                
                <!-- 차트 컨테이너 -->
                <div id="chart-{index}" class="w-full min-h-[300px] bg-gray-50 rounded-lg flex items-center justify-center">
                  <div class="text-gray-500">차트 로딩 중...</div>
                </div>
              {:else}
                <div class="text-center py-12 text-gray-500">
                  <p class="text-lg">📊</p>
                  <p>이 시리즈에 대한 데이터가 없습니다.</p>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <!-- 데이터 소스 정보 -->
      <div class="mt-12 text-center bg-white rounded-xl shadow p-6">
        <p class="text-gray-600 font-medium">📈 데이터 출처: Federal Reserve Economic Data (FRED), St. Louis Fed</p>
        <p class="text-sm text-gray-500 mt-2">
          마지막 업데이트: {new Date().toLocaleString('ko-KR')}
        </p>
      </div>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  :global(.plot-container svg) {
    border-radius: 8px;
  }
</style>