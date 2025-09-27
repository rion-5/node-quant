<!-- src/routes/auth/login/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	let email = '';
	let password = '';
	let loading = false;
	let error = '';
	let showPassword = false;

	async function handleLogin() {
		if (!email || !password) {
			error = '이메일과 비밀번호를 입력해주세요.';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			const data = await response.json();

			if (response.ok) {
				// 성공시 원래 페이지로 리다이렉트 (페이지 새로고침으로 상태 업데이트)
				const redirectUrl = $page.url.searchParams.get('redirect') || '/dashboard';
				window.location.href = redirectUrl;
			} else {
				error = data.error || '로그인에 실패했습니다.';
			}
		} catch (err) {
			error = '네트워크 오류가 발생했습니다.';
			console.error('Login error:', err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		// 페이지 로드시 포커스
		document.getElementById('email')?.focus();
	});
</script>

<svelte:head>
	<title>로그인 - 모멘텀 투자 분석기</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<div>
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">로그인</h2>
			<p class="mt-2 text-center text-sm text-gray-600">
				또는
				<a href="/auth/register" class="font-medium text-blue-600 hover:text-blue-500">
					새 계정 만들기
				</a>
			</p>
		</div>

		<form class="mt-8 space-y-6" on:submit|preventDefault={handleLogin}>
			<div class="-space-y-px rounded-md shadow-sm">
				<div>
					<label for="email" class="sr-only">이메일 주소</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						class="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
						placeholder="이메일 주소"
						bind:value={email}
						disabled={loading}
					/>
				</div>
				<div class="relative">
					<label for="password" class="sr-only">비밀번호</label>
					<input
						id="password"
						name="password"
						type={showPassword ? 'text' : 'password'}
						autocomplete="current-password"
						required
						class="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 pr-10 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
						placeholder="비밀번호"
						bind:value={password}
						disabled={loading}
					/>
					<button
						type="button"
						class="absolute inset-y-0 right-0 flex items-center pr-3"
						on:click={() => (showPassword = !showPassword)}
					>
						{#if showPassword}
							<svg
								class="h-5 w-5 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
								/>
							</svg>
						{:else}
							<svg
								class="h-5 w-5 text-gray-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
								/>
							</svg>
						{/if}
					</button>
				</div>
			</div>

			{#if error}
				<div class="rounded-md bg-red-50 p-4">
					<div class="flex">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div class="ml-3">
							<p class="text-sm font-medium text-red-800">{error}</p>
						</div>
					</div>
				</div>
			{/if}

			<div>
				<button
					type="submit"
					disabled={loading}
					class="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if loading}
						<svg class="mr-3 -ml-1 h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						로그인 중...
					{:else}
						로그인
					{/if}
				</button>
			</div>

			<div class="text-center">
				<a href="/auth/forgot-password" class="text-sm text-blue-600 hover:text-blue-500">
					비밀번호를 잊으셨나요?
				</a>
			</div>
		</form>
	</div>
</div>
