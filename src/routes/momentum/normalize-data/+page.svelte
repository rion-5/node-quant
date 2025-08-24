<!-- src/routes/momentum/normalize-data/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';

  export let data: PageData;
</script>

<div class="p-4">
  <h2 class="text-2xl font-bold mb-4">Normalize Momentum Data</h2>

  <!-- Form for Date Inputs -->
  <form method="POST" use:enhance class="mb-6">
    <div class="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
      <label class="flex flex-col">
        <span class="mb-1">Start Date:</span>
        <input
          type="date"
          name="startDate"
          value={data.startDate || ''}
          class="border p-2 rounded"
          required
        />
      </label>
      <label class="flex flex-col">
        <span class="mb-1">End Date:</span>
        <input
          type="date"
          name="endDate"
          value={data.endDate || ''}
          class="border p-2 rounded"
          required
        />
      </label>
      <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Normalize
      </button>
    </div>
  </form>

  <!-- Error Message -->
  {#if data.error}
    <p class="text-red-500 mb-4">{data.error}</p>
  {/if}

  <!-- Normalized Data Table -->
  {#if data.normalizedData && data.normalizedData.length > 0}
    <div class="overflow-x-auto">
      <table class="w-full border-collapse border border-gray-300">
        <thead>
          <tr class="bg-gray-200">
            <th class="border p-2">Ticker</th>
            <th class="border p-2">First Date</th>
            <th class="border p-2">Last Date</th>
            <th class="border p-2">First Close</th>
            <th class="border p-2">Last Close</th>
            <th class="border p-2">Avg Volume</th>
            <th class="border p-2">Sortino Ratio</th>
            <th class="border p-2">Return Rate</th>
            <th class="border p-2">RSI</th>
            <th class="border p-2">Revenue Growth</th>
            <th class="border p-2">Debt to Equity</th>
            <th class="border p-2">PBR</th>
            <th class="border p-2">Score</th>
          </tr>
        </thead>
        <tbody>
          {#each data.normalizedData as row}
            <tr class="hover:bg-gray-100">
              <td class="border p-2">{row.ticker}</td>
              <td class="border p-2">{row.first_date}</td>
              <td class="border p-2">{row.last_date}</td>
              <td class="border p-2">{row.first_close.toFixed(4)}</td>
              <td class="border p-2">{row.last_close.toFixed(4)}</td>
              <td class="border p-2">{row.avg_volume.toLocaleString()}</td>
              <td class="border p-2">{row.sortino_ratio.toFixed(4)}</td>
              <td class="border p-2">{(row.return_rate * 100).toFixed(2)}%</td>
              <td class="border p-2">{row.rsi.toFixed(2)}</td>
              <td class="border p-2">{(row.revenue_growth * 100).toFixed(2)}%</td>
              <td class="border p-2">{row.debt_to_equity.toFixed(2)}</td>
              <td class="border p-2">{row.pbr.toFixed(2)}</td>
              <td class="border p-2">{row.score.toFixed(4)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p>No data available. Please normalize using the form above.</p>
  {/if}
</div>