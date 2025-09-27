// src/lib/server/auth.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
  email_verified: boolean;
  is_active: boolean;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

// 비밀번호 해시화
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// 비밀번호 검증
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// JWT 토큰 생성
export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// JWT 토큰 검증
export function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch (error) {
    return null;
  }
}

// 사용자 생성
export async function createUser(userData: CreateUserData): Promise<User> {
  const { email, password, name } = userData;

  // 이메일 중복 확인
  const existingUser = await query<{ id: number }>(`
    SELECT id FROM users WHERE email = $1
  `, [email]);

  if (existingUser.length > 0) {
    throw new Error('이미 사용 중인 이메일입니다.');
  }

  // 비밀번호 해시화
  const passwordHash = await hashPassword(password);

  // 사용자 생성
  const result = await query<User>(`
    INSERT INTO users (email, password_hash, name)
    VALUES ($1, $2, $3)
    RETURNING id, email, name, created_at, email_verified, is_active
  `, [email, passwordHash, name]);

  return result[0];
}

// 사용자 인증
export async function authenticateUser(loginData: LoginData): Promise<User | null> {
  const { email, password } = loginData;

  const result = await query<User & { password_hash: string }>(`
    SELECT id, email, name, password_hash, created_at, email_verified, is_active
    FROM users 
    WHERE email = $1 AND is_active = true
  `, [email]);

  if (result.length === 0) {
    return null;
  }

  const user = result[0];
  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    return null;
  }

  // password_hash 제거하고 반환
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// ID로 사용자 조회
export async function getUserById(userId: number): Promise<User | null> {
  const result = await query<User>(`
    SELECT id, email, name, created_at, email_verified, is_active
    FROM users 
    WHERE id = $1 AND is_active = true
  `, [userId]);

  return result.length > 0 ? result[0] : null;
}

// 이메일 유효성 검사
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 비밀번호 강도 검사
export function isValidPassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: '비밀번호는 최소 8자 이상이어야 합니다.' };
  }

  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: '비밀번호에는 영문자가 포함되어야 합니다.' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '비밀번호에는 숫자가 포함되어야 합니다.' };
  }

  return { valid: true, message: '' };
}