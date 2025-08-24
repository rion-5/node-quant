<!-- src/routes/momentum/calculator/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { format, subDays } from 'date-fns';

  let startDate = format(subDays(new Date(), 180), 'yyyy-MM-dd');
  let endDate = format(new Date(), 'yyyy-MM-dd');
  let results: any[] = [];
  let loading = false;
  let error: string | null = null;

  async function fetchMomentumData() {
    loading = true;
    error = null;
    try {
      const response = await fetch('/api/compute-momentum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });
      const data = await response.json();
      if (response.ok) {
        results = data.data;
      } else {
        error = data.error || 'Failed to fetch data';
      }
    } catch (err) {
      error = 'An unexpected error occurred';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    // Optionally fetch data on page load
    // fetchMomentumData();
  });
</script>

<div class="max-w-7xl mx-auto py-6">
  <h2 class="text-2xl font-bold mb-4">Momentum Calculator</h2>

  <form on:submit|preventDefault={fetchMomentumData} class="mb-6 space-y-4">
    <div class="flex space-x-4">
      <div>
        <label for="startDate" class="block text-sm font-medium">Start Date</label>
        <input
          type="date"
          id="startDate"
          bind:value={startDate}
          class="mt-1 p-2 border rounded w-full"
        />
      </div>
      <div>
        <label for="endDate" class="block text-sm font-medium">End Date</label>
        <input
          type="date"
          id="endDate"
          bind:value={endDate}
          class="mt-1 p-2 border rounded w-full"
        />
      </div>
    </div>
    <button
      type="submit"
      disabled={loading}
      class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
    >
      {loading ? 'Loading...' : 'Compute and Fetch Data'}
    </button>
  </form>

  {#if error}
    <div class="text-red-600 mb-4">{error}</div>
  {/if}

  {#if results.length > 0}
    <div class="overflow-x-auto">
      <table class="min-w-full bg-white border">
        <thead>
          <tr class="bg-gray-200">
            <th class="p-2 text-left">Ticker</th>
            <th class="p-2 text-left">First Date</th>
            <th class="p-2 text-left">Last Date</th>
            <th class="p-2 text-left">First Close</th>
            <th class="p-2 text-left">Last Close</th>
            <th class="p-2 text-left">Avg Volume</th>
            <th class="p-2 text-left">Sortino Ratio</th>
            <th class="p-2 text-left">Return Rate</th>
            <th class="p-2 text-left">RSI</th>
            <th class="p-2 text-left">Revenue Growth</th>
            <th class="p-2 text-left">Debt to Equity</th>
            <th class="p-2 text-left">PBR</th>
            <th class="p-2 text-left">6M Change (%)</th>
          </tr>
        </thead>
        <tbody>
          {#each results as row}
            <tr class="border-t">
              <td class="p-2">{row.ticker}</td>
              <td class="p-2">{row.first_date}</td>
              <td class="p-2">{row.last_date}</td>
              <td class="p-2">{row.first_close.toFixed(4)}</td>
              <td class="p-2">{row.last_close.toFixed(4)}</td>
              <td class="p-2">{row.avg_volume.toLocaleString()}</td>
              <td class="p-2">{row.sortino_ratio.toFixed(4)}</td>
              <td class="p-2">{(row.return_rate * 100).toFixed(2)}%</td>
              <td class="p-2">{row.rsi.toFixed(2)}</td>
              <td class="p-2">{(row.revenue_growth * 100).toFixed(2)}%</td>
              <td class="p-2">{row.debt_to_equity.toFixed(2)}</td>
              <td class="p-2">{row.pbr.toFixed(2)}</td>
              <td class="p-2">{row.six_month_change}%</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else if !loading && !error}
    <p class="text-gray-600">Enter a date range and click "Compute and Fetch Data" to see results.</p>
  {/if}
</div>