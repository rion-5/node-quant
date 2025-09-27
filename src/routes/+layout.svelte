<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import '../app.css';

	export let data;

	$: user = data?.user;

	let showUserMenu = false;
	let loggingOut = false;

	async function handleLogout() {
		if (loggingOut) return;

		loggingOut = true;
		try {
			const response = await fetch('/api/auth/login', {
				method: 'DELETE'
			});

			if (response.ok) {
				// 로그아웃 후 로그인 페이지로 리다이렉트 (페이지 새로고침)
				window.location.href = '/auth/login';
			} else {
				console.error('Logout failed');
			}
		} catch (error) {
			console.error('Logout error:', error);
		} finally {
			loggingOut = false;
			showUserMenu = false;
		}
	}

	// 메뉴 외부 클릭시 사용자 메뉴 닫기
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		if (!target.closest('.user-menu-container')) {
			showUserMenu = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="min-h-screen bg-gray-100">
	<nav class="bg-blue-600 p-4 text-white">
		<div class="container mx-auto flex items-center justify-between">
			<h1 class="text-xl font-bold">Stock Analysis</h1>

			<div class="flex items-center space-x-6">
				<!-- 메인 네비게이션 -->
				<ul class="flex space-x-4">
					<li>
						<a
							href="/dashboard"
							class="hover:underline {$page.url.pathname === '/dashboard' ? 'font-bold' : ''}"
						>
							Dashboard
						</a>
					</li>
					<li>
						<a
							href="/fred-plot"
							class="hover:underline {$page.url.pathname === '/fred-plot' ? 'font-bold' : ''}"
						>
							Fred
						</a>
					</li>
					<li>
						<a
							href="/alpha-vantage-plot"
							class="hover:underline {$page.url.pathname === '/alpha-vantage-plot'
								? 'font-bold'
								: ''}"
						>
							Alpha-Vantage
						</a>
					</li>
					<li>
						<a
							href="/momentum/calculator"
							class="hover:underline {$page.url.pathname === '/momentum/calculator'
								? 'font-bold'
								: ''}"
						>
							Momentum
						</a>
					</li>
					<li>
						<a
							href="/momentum/ranking"
							class="hover:underline {$page.url.pathname === '/momentum/ranking'
								? 'font-bold'
								: ''}"
						>
							Momentum Ranking
						</a>
					</li>
				</ul>

				<!-- 사용자 인증 영역 -->
				<div class="flex items-center space-x-3 border-l border-blue-400 pl-6">
					{#if user}
						<!-- 로그인된 사용자 메뉴 -->
						<div class="user-menu-container relative">
							<button
								type="button"
								class="flex items-center space-x-2 rounded-md bg-blue-700 px-3 py-2 transition-colors duration-200 hover:bg-blue-800 focus:ring-2 focus:ring-blue-300 focus:outline-none"
								on:click={() => (showUserMenu = !showUserMenu)}
							>
								<!-- 사용자 아바타 -->
								<div class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-300">
									<span class="text-sm font-semibold text-blue-800">
										{user.name.charAt(0).toUpperCase()}
									</span>
								</div>
								<span class="text-sm font-medium">{user.name}</span>
								<svg
									class="h-4 w-4 transition-transform duration-200 {showUserMenu
										? 'rotate-180'
										: ''}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>

							<!-- 드롭다운 메뉴 -->
							{#if showUserMenu}
								<div
									class="absolute right-0 z-50 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-lg"
								>
									<!-- 사용자 정보 -->
									<div class="border-b border-gray-100 px-4 py-3">
										<p class="text-sm font-medium text-gray-900">{user.name}</p>
										<p class="truncate text-sm text-gray-500">{user.email}</p>
									</div>

									<!-- 메뉴 항목들 -->
									<div class="py-1">
										<a
											href="/profile"
											class="block px-4 py-2 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-100"
										>
											<svg
												class="mr-2 inline h-4 w-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
												/>
											</svg>
											프로필 설정
										</a>

										<a
											href="/dashboard"
											class="block px-4 py-2 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-100"
										>
											<svg
												class="mr-2 inline h-4 w-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
												/>
											</svg>
											분석 히스토리
										</a>

										<div class="my-1 border-t border-gray-100"></div>

										<button
											type="button"
											class="block w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-100"
											on:click={handleLogout}
											disabled={loggingOut}
										>
											<svg
												class="mr-2 inline h-4 w-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
												/>
											</svg>
											{#if loggingOut}
												<svg
													class="mr-1 inline h-4 w-4 animate-spin"
													fill="none"
													viewBox="0 0 24 24"
												>
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
												로그아웃 중...
											{:else}
												로그아웃
											{/if}
										</button>
									</div>
								</div>
							{/if}
						</div>
					{:else}
						<!-- 비로그인 상태 - 로그인/회원가입 버튼 -->
						<div class="flex items-center space-x-3">
							<a
								href="/auth/login?redirect={encodeURIComponent($page.url.pathname)}"
								class="px-3 py-2 text-sm font-medium text-blue-100 transition-colors duration-200 hover:text-white hover:underline"
							>
								로그인
							</a>

							<a
								href="/auth/register"
								class="rounded-md border border-transparent bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition-colors duration-200 hover:border-blue-200 hover:bg-blue-50"
							>
								회원가입
							</a>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</nav>

	<main class="container mx-auto p-4">
		<slot />
	</main>
</div>

<style>
	/* 드롭다운 메뉴 애니메이션을 위한 스타일 */
	.user-menu-container > div:last-child {
		animation: dropdownFade 0.15s ease-out;
	}

	@keyframes dropdownFade {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
