// src/routes/api/auth/login/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { authenticateUser, generateToken, isValidEmail } from '$lib/server/auth';

// 로그인 처리
export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { email, password } = await request.json();

    // 입력값 검증
    if (!email || !password) {
      return json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    if (!isValidEmail(email)) {
      return json(
        { error: '유효한 이메일 주소를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 사용자 인증
    const user = await authenticateUser({ email, password });

    if (!user) {
      return json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // JWT 토큰 생성
    const token = generateToken(user.id);

    // HTTP-only 쿠키에 토큰 저장
    cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/'
    });

    return json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return json(
      { error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
};

// 로그아웃 처리 (DELETE 메소드)
export const DELETE: RequestHandler = async ({ cookies }) => {
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