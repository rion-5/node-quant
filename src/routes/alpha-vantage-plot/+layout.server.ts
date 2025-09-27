// src/routes/alpha-vantage-plot/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  // 사용자가 로그인하지 않았으면 로그인 페이지로 리다이렉트
  if (!locals.user) {
    throw redirect(302, '/auth/login?redirect=' + encodeURIComponent(url.pathname));
  }

  return {
    user: locals.user
  };
};