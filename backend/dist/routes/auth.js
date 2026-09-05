import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db.js';
import { signToken, requireAuth } from '../auth.js';
export const authRouter = Router();
authRouter.post('/register', async (req, res, next) => {
    try {
        const body = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8) }).parse(req.body);
        const hash = await bcrypt.hash(body.password, 12);
        const q = await pool.query('INSERT INTO users(name,email,password_hash) VALUES($1,lower($2),$3) RETURNING id,name,email,coin_balance', [body.name, body.email, hash]);
        res.status(201).json({ user: q.rows[0], token: signToken(q.rows[0].id, 'user') });
    }
    catch (e) {
        next(e);
    }
});
authRouter.post('/login', async (req, res, next) => {
    try {
        const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
        const q = await pool.query('SELECT * FROM users WHERE email=lower($1)', [body.email]);
        const u = q.rows[0];
        if (!u || !(await bcrypt.compare(body.password, u.password_hash)))
            return res.status(401).json({ error: 'Invalid credentials' });
        if (u.status !== 'active')
            return res.status(403).json({ error: 'Account blocked' });
        res.json({ token: signToken(u.id, 'user'), user: { id: u.id, name: u.name, email: u.email, coinBalance: u.coin_balance } });
    }
    catch (e) {
        next(e);
    }
});
authRouter.post('/google', async (req, res, next) => {
    try {
        const body = z.object({ idToken: z.string().min(20) }).parse(req.body);
        const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
        if (!googleClientId)
            return res.status(503).json({ error: 'Google login is not configured' });
        const verify = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.idToken)}`);
        if (!verify.ok)
            return res.status(401).json({ error: 'Invalid Google login' });
        const profile = await verify.json();
        if (profile.aud !== googleClientId || profile.email_verified !== 'true' || !profile.email)
            return res.status(401).json({ error: 'Google account verification failed' });
        const email = String(profile.email).toLowerCase();
        const name = String(profile.name || email.split('@')[0]).slice(0, 120);
        let q = await pool.query('SELECT * FROM users WHERE email=lower($1)', [email]);
        let u = q.rows[0];
        if (!u) {
            // Keep schema compatibility: OAuth users receive a random unusable password hash.
            const randomSecret = `google-oauth:${profile.sub}:${crypto.randomUUID()}`;
            const hash = await bcrypt.hash(randomSecret, 12);
            q = await pool.query('INSERT INTO users(name,email,password_hash) VALUES($1,lower($2),$3) RETURNING *', [name, email, hash]);
            u = q.rows[0];
        }
        if (u.status !== 'active')
            return res.status(403).json({ error: 'Account blocked' });
        res.json({ token: signToken(u.id, 'user'), user: { id: u.id, name: u.name, email: u.email, coinBalance: u.coin_balance } });
    }
    catch (e) {
        next(e);
    }
});
authRouter.post('/forgot-password', async (req, res) => {
    res.json({ ok: true, message: 'Password reset provider hook ready. Configure email provider before production.' });
});
authRouter.get('/me', requireAuth, async (req, res, next) => {
    try {
        if (req.auth.role === 'admin') {
            const q = await pool.query('SELECT id,email,role FROM admins WHERE id=$1', [req.auth.id]);
            return res.json(q.rows[0]);
        }
        const q = await pool.query('SELECT id,name,email,coin_balance,status,created_at FROM users WHERE id=$1', [req.auth.id]);
        res.json(q.rows[0]);
    }
    catch (e) {
        next(e);
    }
});
