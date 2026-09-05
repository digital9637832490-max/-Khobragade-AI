import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { requireAuth } from '../auth.js';
export const documentsRouter = Router();
documentsRouter.use(requireAuth);
documentsRouter.post('/documents/pdf', async (req, res, next) => {
    try {
        const title = String(req.body?.title || 'Khobragade AI Document').slice(0, 200);
        const text = String(req.body?.text || '').slice(0, 100000);
        if (!text.trim())
            return res.status(400).json({ error: 'PDF text is required' });
        const chunks = [];
        const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: title, Author: 'Khobragade AI' } });
        doc.on('data', (c) => chunks.push(c));
        const done = new Promise((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
        doc.fontSize(20).text(title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(11).text(text, { width: 495, align: 'left' });
        doc.end();
        const pdf = await done;
        const fileName = `${title.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80) || 'document'}.pdf`;
        res.json({ fileName, mimeType: 'application/pdf', dataBase64: pdf.toString('base64') });
    }
    catch (e) {
        next(e);
    }
});
