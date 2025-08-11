<script lang="ts">
  import { onMount } from 'svelte';
  import type { HistoricalQuote } from '$lib/types';

  let ticker = '';
  let from = '';
  let to = '';
  let data: HistoricalQuote[] = [];
  let error = '';
  let loading = false;

  // 오늘 날짜와 기본 기간 설정
  onMount(() => {
    const today = new Date();
    to = today.toISOString().split('T')[0]; // 오늘: YYYY-MM-DD
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    from = oneMonthAgo.toISOString().split('T')[0]; // 1개월 전: YYYY-MM-DD
  });

  async function fetchStockData() {
    if (!ticker || !from || !to) {
      error = 'Please enter a valid ticker and date range';
      return;
    }

    loading = true;
    error = '';

    try {
      const response = await fetch(`/api/stock-data/${ticker}/${from}/${to}`);
      const result = await response.json();

      if (result.success) {
        data = result.data;
      } else {
        error = result.error || 'Failed to fetch data';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred while fetching data';
      console.error('Fetch error:', err); // 디버깅용
    } finally {
      loading = false;
    }
  }

  function handleSubmit(event: Event) {
    event.preventDefault();
    fetchStockData();
  }
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">Stock Data Viewer</h1>

  <form on:submit={handleSubmit} class="mb-6">
    <div class="flex flex-col sm:flex-row gap-4">
      <input
        type="text"
        bind:value={ticker}
        placeholder="Enter ticker (e.g., TSLA)"
        class="border p-2 rounded w-full sm:w-1/3 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="date"
        bind:value={from}
        class="border p-2 rounded w-full sm:w-1/4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="date"
        bind:value={to}
        class="border p-2 rounded w-full sm:w-1/4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={loading}
        class="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? 'Loading...' : 'Fetch Data'}
      </button>
    </div>
    {#if error}
      <p class="text-red-500 mt-2">{error}</p>
    {/if}
  </form>

  {#if data.length > 0}
    <div class="overflow-x-auto">
      <table class="min-w-full border border-gray-300">
        <thead>
          <tr class="bg-gray-100">
            <th class="border border-gray-300 p-2 text-left">Date</th>
            <th class="border border-gray-300 p-2 text-right">Open</th>
            <th class="border border-gray-300 p-2 text-right">High</th>
            <th class="border border-gray-300 p-2 text-right">Low</th>
            <th class="border border-gray-300 p-2 text-right">Close</th>
            <th class="border border-gray-300 p-2 text-right">Volume</th>
          </tr>
        </thead>
        <tbody>
          {#each data as row}
            <tr class="hover:bg-gray-50">
              <td class="border border-gray-300 p-2">{row.date.toLocaleDateString()}</td>
              <td class="border border-gray-300 p-2 text-right">{row.open.toFixed(2)}</td>
              <td class="border border-gray-300 p-2 text-right">{row.high.toFixed(2)}</td>
              <td class="border border-gray-300 p-2 text-right">{row.low.toFixed(2)}</td>
              <td class="border border-gray-300 p-2 text-right">{row.close.toFixed(2)}</td>
              <td class="border border-gray-300 p-2 text-right">{row.volume.toLocaleString()}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>