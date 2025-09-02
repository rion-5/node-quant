<!-- src/routes/alpha-vantage-plot/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import * as Plot from '@observablehq/plot';

  interface AlphaVantageDataPoint {
    date: Date;
    value: number;
  }

  interface SeriesData {
    id: string;
    name: string;
    symbol: string;
    data: AlphaVantageDataPoint[];
    color: string;
    type: string;
  }

  let series: SeriesData[] = [];
  let loading = true;
  let error = '';

  // 주요 금융 지표들 (Alpha Vantage 호환 심볼로 수정)
  const FINANCIAL_INDICATORS = [
    { name: '달러원환율', symbol: 'USDKRW', type: 'forex', color: '#3b82f6' },
    { name: '금 가격 (GLD ETF)', symbol: 'GLD', type: 'commodity', color: '#f59e0b' },
    { name: '유가 (USO ETF)', symbol: 'USO', type: 'commodity', color: '#000000' },
    { name: '나스닥 (QQQ ETF)', symbol: 'QQQ', type: 'index', color: '#10b981' },
    { name: 'VIX (VXX ETF)', symbol: 'VXX', type: 'index', color: '#ef4444' },
    { name: 'S&P 500 (SPY ETF)', symbol: 'SPY', type: 'index', color: '#8b5cf6' },
    // { name: 'DXY (UUP ETF)', symbol: 'UUP', type: 'index', color: '#06b6d4' }, // 주석처리: 데이터 품질 이슈 가능성
  ];

  async function fetchAlphaVantageData(indicator: any): Promise<SeriesData> {
    console.log(`Fetching data for ${indicator.symbol} (${indicator.type})`);
    
    const response = await fetch(`/api/alpha-vantage?symbol=${indicator.symbol}&type=${indicator.type}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${indicator.symbol}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`API Response for ${indicator.symbol}:`, data);
    
    if (data.error) {
      throw new Error(data.error);
    }

    // Alpha Vantage 응답 구조 파싱
    let timeSeriesData: any = null;
    
    if (indicator.type === 'forex') {
      timeSeriesData = data['Time Series FX (Daily)'];
    } else {
      timeSeriesData = data['Time Series (Daily)'];
    }

    if (!timeSeriesData) {
      console.warn(`No time series data for ${indicator.symbol}`, data);
      // 가능한 키들을 확인해보자
      console.log('Available keys:', Object.keys(data));
      return {
        id: indicator.symbol,
        name: indicator.name,
        symbol: indicator.symbol,
        data: [],
        color: indicator.color,
        type: indicator.type
      };
    }

    // 데이터 변환 - Alpha Vantage 응답 구조에 맞게 수정
    const processedData: AlphaVantageDataPoint[] = Object.entries(timeSeriesData)
      .map(([date, values]: [string, any]) => {
        // Alpha Vantage는 키가 "4. close" 형태로 되어 있음
        const closePrice = values['4. close'] || values['Close'] || 0;
        return {
          date: new Date(date),
          value: parseFloat(closePrice)
        };
      })
      .filter(d => !isNaN(d.value) && d.value > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-60); // 최근 60일

    return {
      id: indicator.symbol,
      name: indicator.name,
      symbol: indicator.symbol,
      data: processedData,
      color: indicator.color,
      type: indicator.type
    };
  }

  async function loadData() {
    try {
      loading = true;
      error = '';
      
      const promises = FINANCIAL_INDICATORS.map(async (indicator) => {
        try {
          return await fetchAlphaVantageData(indicator);
        } catch (err) {
          console.warn(`Failed to load ${indicator.symbol}:`, err);
          return {
            id: indicator.symbol,
            name: indicator.name,
            symbol: indicator.symbol,
            data: [],
            color: indicator.color,
            type: indicator.type
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
      title: `${seriesData.name} (${seriesData.symbol})`,
      width: Math.min(600, container.clientWidth - 20),
      height: 320,
      marginLeft: 80,
      marginBottom: 60,
      marginRight: 40,
      marginTop: 40,
      style: {
        backgroundColor: "white",
        fontSize: "12px"
      },
      x: {
        type: "time",
        label: "날짜",
        grid: true,
        tickFormat: "%m/%d"
      },
      y: {
        label: "가격",
        grid: true,
        nice: true,
        tickFormat: seriesData.type === 'forex' ? ".0f" : ".2f"
      },
      marks: [
        // 영역 채우기
        Plot.areaY(seriesData.data, {
          x: "date",
          y: "value",
          fill: seriesData.color,
          fillOpacity: 0.1,
          curve: "catmull-rom"
        }),
        // 메인 라인
        Plot.line(seriesData.data, {
          x: "date",
          y: "value",
          stroke: seriesData.color,
          strokeWidth: 2.5,
          curve: "catmull-rom"
        }),
        // 최신 포인트
        Plot.dot(seriesData.data.slice(-1), {
          x: "date",
          y: "value",
          fill: seriesData.color,
          r: 6,
          stroke: "white",
          strokeWidth: 2
        }),
        // 가격 레이블
        Plot.text(seriesData.data.slice(-1), {
          x: "date",
          y: "value",
          text: d => d.value.toFixed(seriesData.type === 'forex' ? 0 : 2),
          dy: -15,
          fontSize: 11,
          fontWeight: "bold",
          fill: seriesData.color
        })
      ]
    });

    container.appendChild(plot);
  }

  function calculateChange(data: AlphaVantageDataPoint[]): { absolute: number; percentage: number } {
    if (data.length < 2) return { absolute: 0, percentage: 0 };
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    const absolute = latest.value - previous.value;
    const percentage = (absolute / previous.value) * 100;
    return { absolute, percentage };
  }

  onMount(() => {
    loadData();
  });

  $: if (series.length > 0) {
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
  <title>Alpha Vantage 금융 지표 대시보드</title>
  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  <script src="https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6"></script>
</svelte:head>

<main class="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 py-8">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- 헤더 -->
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">
        💹 Alpha Vantage 금융 지표 대시보드
      </h1>
      <p class="text-lg text-gray-600 mb-6">
        실시간 환율, 원자재, 주요 지수 데이터를 시각화합니다
      </p>
      <button 
        on:click={loadData}
        disabled={loading}
        class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
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
              환경변수 VITE_ALPHA_VANTAGE_API_KEY가 설정되어 있는지 확인해주세요.
            </p>
          </div>
        </div>
      </div>
    {/if}

    <!-- 로딩 상태 -->
    {#if loading}
      <div class="flex flex-col justify-center items-center py-20">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
        <p class="text-gray-600">금융 데이터를 가져오는 중...</p>
        <p class="text-xs text-gray-500 mt-1">Alpha Vantage API 호출 대기 중</p>
      </div>
    {/if}

    <!-- 데이터가 있는 경우 -->
    {#if !loading && series.length > 0}
      <!-- 요약 카드 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {#each series.filter(s => s.data.length > 0) as seriesData}
          {@const change = calculateChange(seriesData.data)}
          <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-all duration-200">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-medium text-gray-600 truncate">
                {seriesData.name}
              </h3>
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 rounded-full" style="background-color: {seriesData.color}"></div>
                <span class="text-xs text-gray-400">{seriesData.symbol}</span>
              </div>
            </div>
            
            <div class="text-2xl font-bold text-gray-900 mb-2">
              {seriesData.data[seriesData.data.length - 1]?.value.toLocaleString('ko-KR', {
                minimumFractionDigits: seriesData.type === 'forex' ? 0 : 2,
                maximumFractionDigits: seriesData.type === 'forex' ? 0 : 2
              })}
              {seriesData.type === 'forex' && seriesData.symbol === 'USDKRW' ? '원' : ''}
            </div>
            
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">
                {seriesData.data[seriesData.data.length - 1]?.date.toLocaleDateString('ko-KR')}
              </span>
              <span class={change.percentage > 0 ? 'text-red-600' : change.percentage < 0 ? 'text-blue-600' : 'text-gray-500'}>
                {change.percentage > 0 ? '↗' : change.percentage < 0 ? '↘' : '→'} 
                {change.percentage.toFixed(2)}%
              </span>
            </div>
          </div>
        {/each}
      </div>

      <!-- 차트 그리드 -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {#each series.filter(s => s.data.length > 0) as seriesData, index}
          <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div class="px-6 py-4 bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-xl font-semibold text-gray-800">
                    {seriesData.name}
                  </h3>
                  <p class="text-sm text-gray-500">{seriesData.symbol}</p>
                </div>
                <div class="flex items-center space-x-2">
                  <div class="w-4 h-4 rounded-full" style="background-color: {seriesData.color}"></div>
                  <span class="text-sm text-gray-500">
                    {seriesData.data.length}일
                  </span>
                </div>
              </div>
            </div>
            
            <div class="p-6">
              <!-- 최신 값 및 변화량 -->
              {#if seriesData.data.length > 0}
                {@const change = calculateChange(seriesData.data)}
                <div class="mb-6 grid grid-cols-2 gap-4">
                  <div class="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg">
                    <div class="text-sm text-gray-600 mb-1">현재 가격</div>
                    <div class="text-2xl font-bold" style="color: {seriesData.color}">
                      {seriesData.data[seriesData.data.length - 1].value.toLocaleString('ko-KR', {
                        minimumFractionDigits: seriesData.type === 'forex' ? 0 : 2,
                        maximumFractionDigits: seriesData.type === 'forex' ? 0 : 2
                      })}
                    </div>
                  </div>
                  
                  <div class="p-4 bg-gradient-to-r from-gray-50 to-green-50 rounded-lg">
                    <div class="text-sm text-gray-600 mb-1">전일 대비</div>
                    <div class={`text-xl font-bold ${change.percentage > 0 ? 'text-red-600' : change.percentage < 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                      {change.percentage > 0 ? '+' : ''}{change.percentage.toFixed(2)}%
                    </div>
                  </div>
                </div>
                
                <!-- 차트 컨테이너 -->
                <div id="chart-{index}" class="w-full min-h-[320px] bg-gray-50 rounded-lg flex items-center justify-center">
                  <div class="text-gray-500">차트 로딩 중...</div>
                </div>

                <!-- 데이터 요약 -->
                <div class="mt-4 grid grid-cols-3 gap-4 text-xs">
                  <div class="text-center">
                    <div class="text-gray-500">최고가</div>
                    <div class="font-semibold text-green-600">
                      {Math.max(...seriesData.data.map(d => d.value)).toLocaleString('ko-KR', {
                        maximumFractionDigits: seriesData.type === 'forex' ? 0 : 2
                      })}
                    </div>
                  </div>
                  <div class="text-center">
                    <div class="text-gray-500">최저가</div>
                    <div class="font-semibold text-red-600">
                      {Math.min(...seriesData.data.map(d => d.value)).toLocaleString('ko-KR', {
                        maximumFractionDigits: seriesData.type === 'forex' ? 0 : 2
                      })}
                    </div>
                  </div>
                  <div class="text-center">
                    <div class="text-gray-500">평균가</div>
                    <div class="font-semibold text-gray-600">
                      {(seriesData.data.reduce((sum, d) => sum + d.value, 0) / seriesData.data.length).toLocaleString('ko-KR', {
                        maximumFractionDigits: seriesData.type === 'forex' ? 0 : 2
                      })}
                    </div>
                  </div>
                </div>
              {:else}
                <div class="text-center py-12 text-gray-500">
                  <p class="text-lg">📊</p>
                  <p>이 심볼에 대한 데이터가 없습니다.</p>
                  <p class="text-xs mt-1">API 제한이나 심볼 오류일 수 있습니다.</p>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <!-- API 정보 및 제한사항 -->
      <div class="mt-12 bg-white rounded-xl shadow-lg p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">📋 API 정보</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 class="font-medium text-gray-700 mb-2">데이터 소스</h4>
            <ul class="space-y-1 text-gray-600">
              <li>• 환율: Alpha Vantage FX API</li>
              <li>• 원자재: ETF 프록시 (GLD, USO)</li>
              <li>• 지수: ETF 프록시 (SPY, QQQ, VXX)</li>
            </ul>
          </div>
          <div>
            <h4 class="font-medium text-gray-700 mb-2">API 제한사항</h4>
            <ul class="space-y-1 text-gray-600">
              <li>• 무료 계정: 분당 5회, 일일 500회</li>
              <li>• 데이터 지연: 실시간 ~ 15분</li>
              <li>• 일부 심볼은 ETF로 대체</li>
            </ul>
          </div>
        </div>
        <div class="mt-4 text-center text-gray-500 text-xs">
          마지막 업데이트: {new Date().toLocaleString('ko-KR')} | 데이터 제공: Alpha Vantage
        </div>
      </div>
    {:else if !loading}
      <div class="text-center py-20">
        <div class="text-6xl mb-4">📊</div>
        <h2 class="text-2xl font-bold text-gray-700 mb-2">데이터를 불러올 수 없습니다</h2>
        <p class="text-gray-500 mb-6">API 키를 확인하거나 잠시 후 다시 시도해주세요.</p>
        <button 
          on:click={loadData}
          class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          다시 시도
        </button>
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