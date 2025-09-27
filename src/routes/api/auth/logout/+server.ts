// src/routes/api/auth/logout/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies }) => {
  try {
    // 쿠키 삭제
    cookies.delete('auth_token', { path: '/' });

    return json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return json(
      { error: '로그아웃 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
};