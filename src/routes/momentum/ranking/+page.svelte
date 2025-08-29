<!-- src/routes/momentum/ranking/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  let queryDates: { query_date: string; first_date: string; last_date: string }[] = [];
  let selectedDate: string = '';
  let weights = {
    return_rate: 0.30,
    sortino_ratio: 0.25,
    revenue_growth: 0.20,
    debt_to_equity: 0.10,
    rsi: 0.10,
    pbr: 0.05
  };
  let results: any[] = [];
  let loading = false;
  let error: string | null = null;

  async function fetchQueryDates() {
    try {
      const res = await fetch('/api/get-query-dates', { method: 'GET' });
      const data = await res.json();
      queryDates = data.dates;
      if (queryDates.length > 0) selectedDate = queryDates[0].query_date;
    } catch (err) {
      error = '조회 기간을 불러오지 못했습니다';
    }
  }

  async function fetchRanking() {
    if (!selectedDate) return;
    loading = true;
    error = null;
    try {
      const response = await fetch('/api/get-momentum-ranking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryDate: selectedDate, weights })
      });
      const data = await response.json();
      if (response.ok) {
        results = data.data;
      } else {
        error = data.error;
      }
    } catch (err) {
      error = '예기치 않은 오류가 발생했습니다';
    } finally {
      loading = false;
    }
  }

  onMount(fetchQueryDates);
</script>

<div class="max-w-7xl mx-auto py-6">
  <h2 class="text-2xl font-bold mb-4">모멘텀 랭킹</h2>

  <div class="mb-6">
    <label for="queryDates" class="block text-sm font-medium">조회 기간 선택</label>
    <select bind:value={selectedDate} class="mt-1 p-2 border rounded w-full">
      {#each queryDates as date}
        <option value={date.query_date}>
          {date.query_date} (거래일: {date.first_date} ~ {date.last_date})
        </option>
      {/each}
    </select>
  </div>

  <div class="grid grid-cols-2 gap-4 mb-6">
    <div>
      <label for="returnRate">Return Rate</label>
      <input type="number" step="0.01" bind:value={weights.return_rate} class="p-2 border rounded w-full" />
    </div>
    <div>
      <label for="sortinoRatio">Sortino Ratio</label>
      <input type="number" step="0.01" bind:value={weights.sortino_ratio} class="p-2 border rounded w-full" />
    </div>
    <div>
      <label for="revenueGrowth">Revenue Growth</label>
      <input type="number" step="0.01" bind:value={weights.revenue_growth} class="p-2 border rounded w-full" />
    </div>
    <div>
      <label for="debtToEquity">Debt to Equity</label>
      <input type="number" step="0.01" bind:value={weights.debt_to_equity} class="p-2 border rounded w-full" />
    </div>
    <div>
      <label for="rsi">RSI</label>
      <input type="number" step="0.01" bind:value={weights.rsi} class="p-2 border rounded w-full" />
    </div>
    <div>
      <label for="pbr">PBR</label>
      <input type="number" step="0.01" bind:value={weights.pbr} class="p-2 border rounded w-full" />
    </div>
  </div>

  <button
    on:click={fetchRanking}
    disabled={loading}
    class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
  >
    {loading ? '로딩 중...' : '조회'}
  </button>

  {#if error}
    <div class="text-red-600 mb-4">{error}</div>
  {/if}

  {#if results.length > 0}
    <div class="overflow-x-auto mt-6">
      <table class="min-w-full bg-white border">
        <thead>
          <tr class="bg-gray-200">
            <th class="p-2">Ticker</th>
            <th class="p-2">Score</th>
            <th class="p-2">Norm Return Rate</th>
            <th class="p-2">Norm Sortino Ratio</th>
            <th class="p-2">Norm RSI</th>
            <th class="p-2">Norm Revenue Growth</th>
            <th class="p-2">Norm Debt to Equity</th>
            <th class="p-2">Norm PBR</th>
            <th class="p-2">First Close</th>
            <th class="p-2">Last Close</th>
            <th class="p-2">Avg Volume</th>
            <th class="p-2">6M Change (%)</th>
          </tr>
        </thead>
        <tbody>
          {#each results as row}
            <tr class="border-t">
              <td class="p-2">{row.ticker}</td>
              <td class="p-2">{row.score.toFixed(4)}</td>
              <td class="p-2">{row.norm.return_rate.toFixed(4)}</td>
              <td class="p-2">{row.norm.sortino_ratio.toFixed(4)}</td>
              <td class="p-2">{row.norm.rsi.toFixed(4)}</td>
              <td class="p-2">{row.norm.revenue_growth.toFixed(4)}</td>
              <td class="p-2">{row.norm.debt_to_equity.toFixed(4)}</td>
              <td class="p-2">{row.norm.pbr.toFixed(4)}</td>
              <td class="p-2">{row.first_close.toFixed(4)}</td>
              <td class="p-2">{row.last_close.toFixed(4)}</td>
              <td class="p-2">{Math.round(row.avg_volume).toLocaleString()}</td>
              <td class="p-2">{row.six_month_change.toFixed(2)}%</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>