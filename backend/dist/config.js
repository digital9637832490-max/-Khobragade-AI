import 'dotenv/config';
const must = (key) => {
    const value = process.env[key];
    if (!value)
        throw new Error(`Missing environment variable: ${key}`);
    return value;
};
export const config = {
    port: Number(process.env.PORT || 4000),
    databaseUrl: must('DATABASE_URL'),
    authSecret: must('AUTH_SECRET'),
    authTtl: process.env.AUTH_TOKEN_TTL || '7d',
    websiteUrl: process.env.WEBSITE_URL || 'http://localhost:3000',
    adminUrl: process.env.ADMIN_URL || 'http://localhost:3001',
    maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 20),
    rateWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    rateMax: Number(process.env.RATE_LIMIT_MAX || 120),
};
