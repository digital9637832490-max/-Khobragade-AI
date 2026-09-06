"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../auth.js");
const providers_js_1 = require("../ai/providers.js");
exports.userRouter = (0, express_1.Router)();
exports.userRouter.use(auth_js_1.requireAuth);
exports.userRouter.get('/location/reverse', async (req, res, next) => {
    try {
        const lat = Number(req.query.lat);
        const lon = Number(req.query.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180)
            return res.status(400).json({ error: 'Invalid coordinates' });
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1&accept-language=en`;
        const r = await fetch(url, { headers: { 'User-Agent': 'KhobragadeAI/1.0 (location lookup)' } });
        if (!r.ok)
            return res.status(502).json({ error: 'Location lookup unavailable' });
        const d = await r.json();
        const a = d?.address || {};
        res.json({
            latitude: lat, longitude: lon,
            displayName: String(d?.display_name || ''),
            city: String(a.city || a.town || a.village || a.municipality || a.city_district || ''),
            state: String(a.state || ''),
            country: String(a.country || ''),
            countryCode: String(a.country_code || '').toUpperCase(),
            postcode: String(a.postcode || '')
        });
    }
    catch (e) {
        next(e);
    }
});
exports.userRouter.post('/projects', async (req, res, next) => {
    try {
        const b = zod_1.z.object({ name: zod_1.z.string().min(1), type: zod_1.z.string().min(1), input: zod_1.z.record(zod_1.z.any()).default({}) }).parse(req.body);
        const q = await db_js_1.pool.query('INSERT INTO projects(user_id,name,type,input) VALUES($1,$2,$3,$4) RETURNING *', [req.auth.id, b.name, b.type, b.input]);
        res.status(201).json(q.rows[0]);
    }
    catch (e) {
        next(e);
    }
});
exports.userRouter.get('/projects', async (req, res, next) => {
    try {
        const q = await db_js_1.pool.query('SELECT * FROM projects WHERE user_id=$1 ORDER BY created_at DESC', [req.auth.id]);
        res.json(q.rows);
    }
    catch (e) {
        next(e);
    }
});
async function createAiJob(userId, toolKey, input) { return (0, db_js_1.tx)(async (c) => { const s = await c.query('SELECT value FROM settings WHERE key=$1', [`tool.${toolKey}`]); const cfg = s.rows[0]?.value || { enabled: true, maintenance: false }; if (!cfg.enabled || cfg.maintenance)
    throw new Error('Tool unavailable'); return (await c.query(`INSERT INTO ai_jobs(user_id,tool_key,input) VALUES($1,$2,$3) RETURNING *`, [userId, toolKey, input])).rows[0]; }); }
exports.userRouter.post('/ai/voice-chat', async (req, res, next) => {
    try {
        const b = zod_1.z.object({
            message: zod_1.z.string().min(1).max(12000),
            history: zod_1.z.array(zod_1.z.object({ role: zod_1.z.enum(['user', 'assistant']), content: zod_1.z.string() })).max(20).default([]),
            voiceGender: zod_1.z.enum(['female', 'male']).default('female'),
            language: zod_1.z.enum(['en', 'hi', 'mr']).default('hi'),
            localDateTime: zod_1.z.string().max(120).optional(),
            timeZone: zod_1.z.string().max(120).optional(),
            locationName: zod_1.z.string().max(255).optional(),
            latitude: zod_1.z.number().min(-90).max(90).optional(),
            longitude: zod_1.z.number().min(-180).max(180).optional()
        }).parse(req.body);
        const result = await providers_js_1.textProvider.generate({ mode: 'chat', message: b.message, history: b.history, voiceGender: b.voiceGender, language: b.language, localDateTime: b.localDateTime, timeZone: b.timeZone, locationName: b.locationName, latitude: b.latitude, longitude: b.longitude });
        res.json(result);
    }
    catch (e) {
        next(e);
    }
});
exports.userRouter.post('/ai/chat', async (req, res, next) => { try {
    const b = zod_1.z.object({ message: zod_1.z.string().min(1).max(12000), history: zod_1.z.array(zod_1.z.object({ role: zod_1.z.enum(['user', 'assistant']), content: zod_1.z.string() })).max(20).default([]), voiceGender: zod_1.z.enum(['female', 'male']).default('female'), language: zod_1.z.enum(['en', 'hi', 'mr']).default('hi'), localDateTime: zod_1.z.string().max(120).optional(), timeZone: zod_1.z.string().max(120).optional(), locationName: zod_1.z.string().max(255).optional(), latitude: zod_1.z.number().min(-90).max(90).optional(), longitude: zod_1.z.number().min(-180).max(180).optional(), attachmentName: zod_1.z.string().max(255).optional(), attachmentMime: zod_1.z.string().max(120).optional(), attachmentData: zod_1.z.string().max(20_000_000).optional() }).parse(req.body);
    res.json(await providers_js_1.textProvider.generate({ mode: 'chat', message: b.message, history: b.history, voiceGender: b.voiceGender, language: b.language, localDateTime: b.localDateTime, timeZone: b.timeZone, locationName: b.locationName, latitude: b.latitude, longitude: b.longitude, attachmentName: b.attachmentName, attachmentMime: b.attachmentMime, attachmentData: b.attachmentData }));
}
catch (e) {
    next(e);
} });
exports.userRouter.post('/ai/thumbnail', async (req, res, next) => { try {
    res.status(202).json(await createAiJob(req.auth.id, 'thumbnail', req.body));
}
catch (e) {
    next(e);
} });
exports.userRouter.post('/ai/photo', async (req, res, next) => { try {
    res.status(202).json(await createAiJob(req.auth.id, 'photo', req.body));
}
catch (e) {
    next(e);
} });
exports.userRouter.post('/ai/content', async (req, res, next) => {
    try {
        const tool = zod_1.z.enum(['title', 'description', 'tags']).default('title').parse(req.body.tool || 'title');
        res.status(202).json(await createAiJob(req.auth.id, tool, req.body));
    }
    catch (e) {
        next(e);
    }
});
exports.userRouter.post('/ai/voiceover', async (req, res, next) => { try {
    res.status(202).json(await createAiJob(req.auth.id, 'voiceover', req.body));
}
catch (e) {
    next(e);
} });
exports.userRouter.post('/ai/video', async (req, res, next) => { try {
    res.status(202).json(await createAiJob(req.auth.id, 'video', req.body));
}
catch (e) {
    next(e);
} });
exports.userRouter.get('/jobs', async (req, res, next) => { try {
    const q = await db_js_1.pool.query('SELECT * FROM ai_jobs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200', [req.auth.id]);
    res.json(q.rows);
}
catch (e) {
    next(e);
} });
exports.userRouter.get('/ai/video/:id/file', async (req, res, next) => {
    try {
        const q = await db_js_1.pool.query('SELECT result FROM ai_jobs WHERE id=$1 AND user_id=$2 AND tool_key=$3 AND status=$4', [req.params.id, req.auth.id, 'video', 'completed']);
        if (!q.rowCount)
            return res.status(404).json({ error: 'Generated video not found' });
        const uri = String(q.rows[0]?.result?.videoUri || q.rows[0]?.result?.videoUrl || '');
        if (!uri)
            return res.status(404).json({ error: 'Video file is not available' });
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '';
        if (!apiKey)
            return res.status(500).json({ error: 'Gemini API key missing' });
        const r = await fetch(uri, { headers: { 'x-goog-api-key': apiKey } });
        if (!r.ok)
            return res.status(r.status).json({ error: 'Generated video could not be downloaded' });
        res.setHeader('Content-Type', r.headers.get('content-type') || 'video/mp4');
        res.setHeader('Cache-Control', 'private, max-age=300');
        if (r.headers.get('content-length'))
            res.setHeader('Content-Length', r.headers.get('content-length'));
        const body = r.body;
        if (!body)
            return res.status(502).json({ error: 'Generated video stream unavailable' });
        const reader = body.getReader();
        res.on('close', () => { try {
            reader.cancel();
        }
        catch { } });
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                break;
            res.write(Buffer.from(value));
        }
        res.end();
    }
    catch (e) {
        next(e);
    }
});
exports.userRouter.get('/jobs/:id', async (req, res, next) => {
    try {
        const q = await db_js_1.pool.query('SELECT * FROM ai_jobs WHERE id=$1 AND user_id=$2', [req.params.id, req.auth.id]);
        if (!q.rowCount)
            return res.status(404).json({ error: 'Not found' });
        res.json(q.rows[0]);
    }
    catch (e) {
        next(e);
    }
});
exports.userRouter.get('/notifications', async (req, res, next) => {
    try {
        const q = await db_js_1.pool.query('SELECT * FROM notifications WHERE user_id=$1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 100', [req.auth.id]);
        res.json(q.rows);
    }
    catch (e) {
        next(e);
    }
});
exports.userRouter.get('/support', async (req, res, next) => { try {
    const q = await db_js_1.pool.query('SELECT * FROM support_tickets WHERE user_id=$1 ORDER BY created_at DESC', [req.auth.id]);
    res.json(q.rows);
}
catch (e) {
    next(e);
} });
exports.userRouter.post('/support', async (req, res, next) => {
    try {
        const b = zod_1.z.object({ subject: zod_1.z.string().min(2), message: zod_1.z.string().min(2) }).parse(req.body);
        const q = await db_js_1.pool.query('INSERT INTO support_tickets(user_id,subject,message) VALUES($1,$2,$3) RETURNING *', [req.auth.id, b.subject, b.message]);
        res.status(201).json(q.rows[0]);
    }
    catch (e) {
        next(e);
    }
});
exports.userRouter.post('/support/:id/reply', async (req, res, next) => { try {
    const b = zod_1.z.object({ message: zod_1.z.string().min(1) }).parse(req.body);
    const own = await db_js_1.pool.query('SELECT id FROM support_tickets WHERE id=$1 AND user_id=$2', [req.params.id, req.auth.id]);
    if (!own.rowCount)
        return res.status(404).json({ error: 'Not found' });
    await db_js_1.pool.query(`INSERT INTO support_messages(ticket_id,sender_role,sender_id,message) VALUES($1,'user',$2,$3)`, [req.params.id, req.auth.id, b.message]);
    await db_js_1.pool.query(`UPDATE support_tickets SET status='open',updated_at=now() WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
}
catch (e) {
    next(e);
} });
