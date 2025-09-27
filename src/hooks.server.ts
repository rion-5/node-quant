// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { verifyToken, getUserById } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  console.log('Hook processing:', event.url.pathname); // 디버깅용

  // 쿠키에서 토큰 가져오기
  const token = event.cookies.get('auth_token');

  if (token) {
    try {
      // 토큰 검증
      const payload = verifyToken(token);

      if (payload) {
        // 사용자 정보 가져오기
        const user = await getUserById(payload.userId);

        if (user) {
          // locals에 사용자 정보 저장
          event.locals.user = user;
          console.log('User authenticated:', user.email); // 디버깅용
        } else {
          // 사용자가 존재하지 않으면 토큰 삭제
          event.cookies.delete('auth_token', { path: '/' });
        }
      } else {
        // 유효하지 않은 토큰인 경우 쿠키 삭제
        event.cookies.delete('auth_token', { path: '/' });
      }
    } catch (error) {
      console.error('Token verification error:', error);
      // 유효하지 않은 토큰인 경우 쿠키 삭제
      event.cookies.delete('auth_token', { path: '/' });
    }
  }

  // URL 경로 확인
  const url = event.url.pathname;

  // 공개 라우트 정의 (인증이 필요 없는 경로들)
  const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/api/auth/login',    // 로그인 API 추가
    '/api/auth/register'  // 회원가입 API 추가
  ];

  const isPublicRoute = publicRoutes.some(route => url.startsWith(route));

  console.log('Route check:', { url, isPublicRoute, hasUser: !!event.locals.user }); // 디버깅용

  // 공개 라우트가 아니고 사용자가 인증되지 않았다면
  if (!isPublicRoute && !event.locals.user) {
    console.log('Redirecting to login:', url); // 디버깅용

    // API 요청인 경우 401 반환 (단, 인증 API 제외)
    if (url.startsWith('/api/') && !url.startsWith('/api/auth/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 일반 페이지 요청인 경우 로그인 페이지로 리다이렉트
    if (!url.startsWith('/api/')) {
      throw redirect(302, '/auth/login?redirect=' + encodeURIComponent(url));
    }
  }

  // 이미 로그인한 사용자가 로그인/회원가입 페이지에 접근하려고 하면 대시보드로 리다이렉트
  if (event.locals.user && (url === '/auth/login' || url === '/auth/register')) {
    throw redirect(302, '/dashboard');
  }

  return resolve(event);
};