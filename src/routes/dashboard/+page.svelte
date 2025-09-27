<!-- src/routes/dashboard/+page.svelte -->
<script lang="ts">
	export let data;
	$: user = data?.user;
</script>

<svelte:head>
	<title>Dashboard - Stock Analysis</title>
</svelte:head>

<div class="mx-auto max-w-7xl">
	<!-- 환영 메시지 -->
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold text-gray-900">
			안녕하세요, {user?.name}님! 👋
		</h1>
		<p class="text-gray-600">Stock Analysis 대시보드에 오신 것을 환영합니다.</p>
	</div>

	<!-- 메뉴 카드들 -->
	<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
		<!-- Fred Plot -->
		<a
			href="/fred-plot"
			class="block rounded-lg border border-gray-200 bg-white p-6 shadow-md transition-shadow duration-200 hover:border-blue-300 hover:shadow-lg"
		>
			<div class="mb-4 flex items-center">
				<div class="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
					<svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
						/>
					</svg>
				</div>
				<div>
					<h3 class="text-lg font-semibold text-gray-900">Fred Data</h3>
					<p class="text-sm text-gray-600">경제 지표 분석</p>
				</div>
			</div>
			<p class="text-gray-700">
				Federal Reserve Economic Data를 활용한 거시경제 지표 분석 및 차트 시각화
			</p>
		</a>

		<!-- Alpha Vantage -->
		<a
			href="/alpha-vantage-plot"
			class="block rounded-lg border border-gray-200 bg-white p-6 shadow-md transition-shadow duration-200 hover:border-blue-300 hover:shadow-lg"
		>
			<div class="mb-4 flex items-center">
				<div class="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
					<svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
						/>
					</svg>
				</div>
				<div>
					<h3 class="text-lg font-semibold text-gray-900">Alpha Vantage</h3>
					<p class="text-sm text-gray-600">주식 데이터 분석</p>
				</div>
			</div>
			<p class="text-gray-700">
				Alpha Vantage API를 통한 실시간 주식 데이터 분석 및 기술적 지표 차트
			</p>
		</a>

		<!-- Momentum Calculator -->
		<a
			href="/momentum/calculator"
			class="block rounded-lg border border-gray-200 bg-white p-6 shadow-md transition-shadow duration-200 hover:border-purple-300 hover:shadow-lg"
		>
			<div class="mb-4 flex items-center">
				<div class="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
					<svg
						class="h-6 w-6 text-purple-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
						/>
					</svg>
				</div>
				<div>
					<h3 class="text-lg font-semibold text-gray-900">Momentum Calculator</h3>
					<p class="text-sm text-gray-600">모멘텀 분석 도구</p>
				</div>
			</div>
			<p class="text-gray-700">
				1개월, 3개월, 6개월 기간별 모멘텀 분석을 통한 종목 평가 및 투자 점수 계산
			</p>
		</a>

		<!-- Momentum Ranking -->
		<a
			href="/momentum/ranking"
			class="block rounded-lg border border-gray-200 bg-white p-6 shadow-md transition-shadow duration-200 hover:border-orange-300 hover:shadow-lg"
		>
			<div class="mb-4 flex items-center">
				<div class="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
					<svg
						class="h-6 w-6 text-orange-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
						/>
					</svg>
				</div>
				<div>
					<h3 class="text-lg font-semibold text-gray-900">Momentum Ranking</h3>
					<p class="text-sm text-gray-600">모멘텀 순위</p>
				</div>
			</div>
			<p class="text-gray-700">모멘텀 분석 결과를 바탕으로 한 종목별 순위 및 투자 추천 목록</p>
		</a>
	</div>

	<!-- 최근 활동 또는 통계 (선택사항) -->
	<div class="rounded-lg bg-white p-6 shadow-md">
		<h2 class="mb-4 text-xl font-semibold text-gray-900">사용자 정보</h2>
		<div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
			<div class="rounded-lg bg-gray-50 p-4">
				<p class="text-gray-600">이메일</p>
				<p class="font-medium text-gray-900">{user?.email}</p>
			</div>
			<div class="rounded-lg bg-gray-50 p-4">
				<p class="text-gray-600">가입일</p>
				<p class="font-medium text-gray-900">
					{new Date(user?.created_at || '').toLocaleDateString('ko-KR')}
				</p>
			</div>
			<div class="rounded-lg bg-gray-50 p-4">
				<p class="text-gray-600">계정 상태</p>
				<p class="font-medium text-green-600">
					{user?.is_active ? '활성' : '비활성'}
				</p>
			</div>
		</div>
	</div>
</div>
