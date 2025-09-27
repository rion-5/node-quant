// src/routes/momentum/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  // 사용자 정보가 없으면 로그인 페이지로 리다이렉트하지 않고 그냥 전달
  // hooks.server.ts에서 보호된 라우트 검사를 담당
  return {
    user: locals.user || null
  };
};