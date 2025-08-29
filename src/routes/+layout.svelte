<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import '../app.css';
</script>

<div class="min-h-screen bg-gray-100">
  <nav class="bg-blue-600 text-white p-4">
    <div class="container mx-auto flex justify-between items-center">
      <h1 class="text-xl font-bold">Stock Analysis</h1>
      <ul class="flex space-x-4">
        <li>
          <a href="/momentum/calculator"
            class="hover:underline {$page.url.pathname === '/momentum/calculator' ? 'font-bold' : ''}"
          >
            Momentum
          </a>
        </li>
        <li><a href="/momentum/ranking"
          class="hover:underline {$page.url.pathname === '/momentum/ranking' ? 'font-bold' : ''}" >
          Momentum Ranking</a></li>
        <!-- Add other menu items here if needed -->
      </ul>
    </div>
  </nav>
  <main class="container mx-auto p-4">
    <slot />
  </main>
</div>