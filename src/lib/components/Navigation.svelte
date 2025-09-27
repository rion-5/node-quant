<!-- src/lib/components/Navigation.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import type { User } from '$lib/server/auth';

	export let user: User | undefined = undefined;

	let showUserMenu = false;

	async function handleLogout() {
		try {
			const response = await fetch('/api/auth/login', {
				method: 'DELETE'
			});

			if (response.ok) {
				// 페이지 새로고침하여 로그아웃 상태 반영
				window.location.href = '/';
			}
		} catch (error) {
			console.error('Logout error:', error);
		}
	}

	// 메뉴 외부 클릭시 닫기
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		if (!target.closest('.user-menu')) {
			showUserMenu = false;
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<nav class="border-b border-gray-200 bg-white shadow-sm">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 justify-between">
			<div class="flex">
				<!-- 로고/홈 링크 -->
				<div class="flex flex-shrink-0 items-center">
					<a href="/" class="text-xl font-bold text-gray-900 hover:text-gray-700">
						📈 모멘텀 투자 분석기
					</a>
				</div>

				<!-- 메인 네비게이션 -->
				<div class="hidden sm:ml-6 sm:flex sm:space-x-8">
					<a
						href="/momentum/calculator"
						class="border-b-2 border-transparent px-1 py-2 text-sm font-medium whitespace-nowrap text-gray-500 transition-colors duration-200 hover:border-gray-300 hover:text-gray-700
                   {$page.url.pathname.startsWith('/momentum')
							? 'border-blue-500 text-gray-900'
							: ''}"
					>
						모멘텀 분석
					</a>

					{#if user}
						<a
							href="/dashboard"
							class="border-b-2 border-transparent px-1 py-2 text-sm font-medium whitespace-nowrap text-gray-500 transition-colors duration-200 hover:border-gray-300 hover:text-gray-700
                     {$page.url.pathname.startsWith('/dashboard')
								? 'border-blue-500 text-gray-900'
								: ''}"
						>
							대시보드
						</a>
					{/if}
				</div>
			</div>

			<!-- 사용자 메뉴 -->
			<div class="hidden sm:ml-6 sm:flex sm:items-center">
				{#if user}
					<div class="user-menu relative ml-3">
						<div>
							<button
								type="button"
								class="flex max-w-xs items-center rounded-full bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
								on:click={() => (showUserMenu = !showUserMenu)}
							>
								<span class="sr-only">사용자 메뉴 열기</span>
								<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
									<span class="text-sm font-medium text-gray-700">
										{user.name.charAt(0).toUpperCase()}
									</span>
								</div>
								<span class="ml-2 text-sm font-medium text-gray-700">{user.name}</span>
								<svg
									class="ml-1 h-4 w-4 text-gray-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>
						</div>

						{#if showUserMenu}
							<div
								class="ring-opacity-5 absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black focus:outline-none"
								role="menu"
							>
								<div class="py-1" role="none">
									<div class="px-4 py-2 text-xs text-gray-500">
										{user.email}
									</div>
									<div class="border-t border-gray-100"></div>

									<a
										href="/profile"
										class="block px-4 py-2 text-sm text-gray-700 transition-colors duration-200 hover:bg-gray-100"
										role="menuitem"
									>
										프로필 설정
									</a>

									<a
										href="/dashboard"
										class="block px-4 py-2 text-sm text-gray-700 transition-colors duration-200 hover:bg-gray-100"
										role="menuitem"
									>
										분석 히스토리
									</a>

									<div class="border-t border-gray-100"></div>

									<button
										type="button"
										class="block w-full px-4 py-2 text-left text-sm text-gray-700 transition-colors duration-200 hover:bg-gray-100"
										role="menuitem"
										on:click={handleLogout}
									>
										로그아웃
									</button>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<div class="flex items-center space-x-4">
						<a
							href="/auth/login"
							class="px-3 py-2 text-sm font-medium text-gray-500 transition-colors duration-200 hover:text-gray-700"
						>
							로그인
						</a>
						<a
							href="/auth/register"
							class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700"
						>
							회원가입
						</a>
					</div>
				{/if}
			</div>

			<!-- 모바일 메뉴 버튼 -->
			<div class="flex items-center sm:hidden">
				<button
					type="button"
					class="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:ring-inset"
				>
					<span class="sr-only">메뉴 열기</span>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				</button>
			</div>
		</div>
	</div>
</nav>
