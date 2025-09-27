<!-- src/routes/auth/register/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	let name = '';
	let email = '';
	let password = '';
	let confirmPassword = '';
	let loading = false;
	let error = '';
	let showPassword = false;
	let showConfirmPassword = false;

	// 실시간 비밀번호 검증
	$: passwordValidation = validatePassword(password);
	$: passwordsMatch = password === confirmPassword;

	function validatePassword(pwd: string) {
		const validations = {
			length: pwd.length >= 8,
			hasLetter: /[A-Za-z]/.test(pwd),
			hasNumber: /[0-9]/.test(pwd)
		};

		return {
			...validations,
			isValid: validations.length && validations.hasLetter && validations.hasNumber
		};
	}

	async function handleRegister() {
		// 클라이언트 측 검증
		if (!name || !email || !password || !confirmPassword) {
			error = '모든 필드를 입력해주세요.';
			return;
		}

		if (!passwordValidation.isValid) {
			error = '비밀번호 요구사항을 충족해주세요.';
			return;
		}

		if (!passwordsMatch) {
			error = '비밀번호가 일치하지 않습니다.';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, password })
			});

			const data = await response.json();

			if (response.ok) {
				// 성공시 메인 페이지로 리다이렉트 (페이지 새로고침으로 상태 업데이트)
				window.location.href = '/';
			} else {
				error = data.error || '회원가입에 실패했습니다.';
			}
		} catch (err) {
			error = '네트워크 오류가 발생했습니다.';
			console.error('Register error:', err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		document.getElementById('name')?.focus();
	});
</script>

<svelte:head>
	<title>회원가입 - 모멘텀 투자 분석기</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<div>
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">회원가입</h2>
			<p class="mt-2 text-center text-sm text-gray-600">
				또는
				<a href="/auth/login" class="font-medium text-blue-600 hover:text-blue-500">
					기존 계정으로 로그인
				</a>
			</p>
		</div>

		<form class="mt-8 space-y-6" on:submit|preventDefault={handleRegister}>
			<div class="space-y-4">
				<!-- 이름 -->
				<div>
					<label for="name" class="block text-sm font-medium text-gray-700">이름</label>
					<input
						id="name"
						name="name"
						type="text"
						autocomplete="name"
						required
						class="relative mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
						placeholder="이름을 입력하세요"
						bind:value={name}
						disabled={loading}
					/>
				</div>

				<!-- 이메일 -->
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700">이메일 주소</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						class="relative mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
						placeholder="이메일을 입력하세요"
						bind:value={email}
						disabled={loading}
					/>
				</div>

				<!-- 비밀번호 -->
				<div>
					<label for="password" class="block text-sm font-medium text-gray-700">비밀번호</label>
					<div class="relative mt-1">
						<input
							id="password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							autocomplete="new-password"
							required
							class="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-10 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
							placeholder="비밀번호를 입력하세요"
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

					<!-- 비밀번호 요구사항 -->
					{#if password}
						<div class="mt-2 text-sm">
							<div class="space-y-1">
								<div class="flex items-center">
									<svg
										class="mr-2 h-4 w-4 {passwordValidation.length
											? 'text-green-500'
											: 'text-gray-400'}"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
									<span class={passwordValidation.length ? 'text-green-600' : 'text-gray-500'}
										>최소 8자</span
									>
								</div>
								<div class="flex items-center">
									<svg
										class="mr-2 h-4 w-4 {passwordValidation.hasLetter
											? 'text-green-500'
											: 'text-gray-400'}"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
									<span class={passwordValidation.hasLetter ? 'text-green-600' : 'text-gray-500'}
										>영문자 포함</span
									>
								</div>
								<div class="flex items-center">
									<svg
										class="mr-2 h-4 w-4 {passwordValidation.hasNumber
											? 'text-green-500'
											: 'text-gray-400'}"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
									<span class={passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-500'}
										>숫자 포함</span
									>
								</div>
							</div>
						</div>
					{/if}
				</div>

				<!-- 비밀번호 확인 -->
				<div>
					<label for="confirmPassword" class="block text-sm font-medium text-gray-700"
						>비밀번호 확인</label
					>
					<div class="relative mt-1">
						<input
							id="confirmPassword"
							name="confirmPassword"
							type={showConfirmPassword ? 'text' : 'password'}
							autocomplete="new-password"
							required
							class="relative block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 pr-10 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
							placeholder="비밀번호를 다시 입력하세요"
							bind:value={confirmPassword}
							disabled={loading}
						/>
						<button
							type="button"
							class="absolute inset-y-0 right-0 flex items-center pr-3"
							on:click={() => (showConfirmPassword = !showConfirmPassword)}
						>
							{#if showConfirmPassword}
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

					<!-- 비밀번호 일치 확인 -->
					{#if confirmPassword}
						<div class="mt-1 flex items-center text-sm">
							<svg
								class="mr-2 h-4 w-4 {passwordsMatch ? 'text-green-500' : 'text-red-500'}"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								{#if passwordsMatch}
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								{:else}
									<path
										fill-rule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clip-rule="evenodd"
									/>
								{/if}
							</svg>
							<span class={passwordsMatch ? 'text-green-600' : 'text-red-600'}>
								{passwordsMatch ? '비밀번호가 일치합니다' : '비밀번호가 일치하지 않습니다'}
							</span>
						</div>
					{/if}
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
					disabled={loading || !passwordValidation.isValid || !passwordsMatch}
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
						계정 생성 중...
					{:else}
						계정 만들기
					{/if}
				</button>
			</div>

			<div class="text-center text-xs text-gray-500">
				계정을 만들면
				<a href="/terms" class="text-blue-600 hover:text-blue-500">이용약관</a>과
				<a href="/privacy" class="text-blue-600 hover:text-blue-500">개인정보처리방침</a>에 동의하게
				됩니다.
			</div>
		</form>
	</div>
</div>
