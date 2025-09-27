// src/routes/api/auth/register/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { createUser, generateToken, isValidEmail, isValidPassword } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { email, password, name } = await request.json();

    // 입력값 검증
    if (!email || !password || !name) {
      return json(
        { error: '모든 필드를 입력해주세요.' },
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

    // 비밀번호 강도 검증
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return json(
        { error: passwordValidation.message },
        { status: 400 }
      );
    }

    // 이름 길이 검증
    if (name.length < 2 || name.length > 50) {
      return json(
        { error: '이름은 2자 이상 50자 이하여야 합니다.' },
        { status: 400 }
      );
    }

    // 사용자 생성
    const user = await createUser({ email, password, name });

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
    console.error('Registration error:', error);

    if (error instanceof Error && error.message === '이미 사용 중인 이메일입니다.') {
      return json(
        { error: error.message },
        { status: 409 }
      );
    }

    return json(
      { error: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
};