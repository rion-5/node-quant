// src/lib/server/db.ts

import { Pool } from 'pg';
// import { DATABASE_URL } from '$env/static/private';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// const pool = new Pool({ connectionString: DATABASE_URL });

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
    try {
        const res = await pool.query(text, params);
        return res.rows as T[];
    } catch (err) {
        console.error('Database query error:', err);
        throw err;
    }
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await query<T>(text, params);
    return rows[0] || null;
}
