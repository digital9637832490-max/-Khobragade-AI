import bcrypt from 'bcryptjs';
import { pool } from './db.js';
const email=process.env.ADMIN_EMAIL, password=process.env.ADMIN_PASSWORD;
if(!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD');
const hash=await bcrypt.hash(password,12);
await pool.query(`INSERT INTO admins(email,password_hash) VALUES(lower($1),$2)
 ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash`,[email,hash]);
console.log('Admin created/updated:',email);
await pool.end();
