import jwt from 'jsonwebtoken';
import { config } from './config.js';
export function signToken(id, role) {
    return jwt.sign({ sub: id, role }, config.authSecret, { expiresIn: config.authTtl });
}
export function requireAuth(req, res, next) {
    const raw = req.headers.authorization;
    if (!raw?.startsWith('Bearer '))
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(raw.slice(7), config.authSecret);
        req.auth = { id: String(decoded.sub), role: decoded.role };
        next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
export function requireAdmin(req, res, next) {
    if (req.auth?.role !== 'admin')
        return res.status(403).json({ error: 'Admin required' });
    next();
}
