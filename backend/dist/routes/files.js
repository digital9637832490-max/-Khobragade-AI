import { Router } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { requireAuth } from '../auth.js';
import { config } from '../config.js';
import { pool } from '../db.js';
import { privateStorageKey } from '../storage/provider.js';
export const filesRouter = Router();
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'audio/mpeg', 'audio/wav', 'application/pdf']);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxUploadMb * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, allowed.has(file.mimetype)) });
filesRouter.use(requireAuth);
filesRouter.post('/files/upload', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: 'Valid file required' });
        const kind = String(req.body.kind || 'project');
        const key = privateStorageKey(req.auth.id, req.file.originalname);
        if ((process.env.STORAGE_PROVIDER || 'local') !== 'local')
            return res.status(501).json({ error: 'Configure S3 provider implementation for non-local storage' });
        const base = path.resolve(process.cwd(), 'private-storage');
        const dest = path.join(base, key);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, req.file.buffer);
        const q = await pool.query(`INSERT INTO files(user_id,kind,storage_key,mime_type,size_bytes) VALUES($1,$2,$3,$4,$5) RETURNING id,kind,mime_type,size_bytes,created_at`, [req.auth.id, kind, key, req.file.mimetype, req.file.size]);
        res.status(201).json({ ...q.rows[0], storageKey: key });
    }
    catch (e) {
        next(e);
    }
});
filesRouter.get('/files/:id', async (req, res, next) => {
    try {
        const q = await pool.query('SELECT * FROM files WHERE id=$1 AND user_id=$2', [req.params.id, req.auth.id]);
        if (!q.rowCount)
            return res.status(404).json({ error: 'Not found' });
        res.json(q.rows[0]);
    }
    catch (e) {
        next(e);
    }
});
