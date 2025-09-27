<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	export let data;

	onMount(() => {
		// 로그인한 사용자는 대시보드로, 아니면 로그인 페이지로
		if (data.user) {
			goto('/dashboard', { replaceState: true });
		} else {
			goto('/auth/login', { replaceState: true });
		}
	});
</script>

<!-- 리다이렉트 중 표시할 로딩 화면 -->
<div class="flex min-h-screen items-center justify-center bg-gray-50">
	<div class="text-center">
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
			<span class="text-lg font-medium text-gray-700">페이지를 로딩 중...</span>
		</div>
	</div>
</div>
