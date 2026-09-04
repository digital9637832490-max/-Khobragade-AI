import express from 'express';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import WebSocket, { WebSocketServer, type RawData } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';

import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/user.js';
import { adminRouter } from './routes/admin.js';
import { cmsRouter } from './routes/cms.js';
import { filesRouter } from './routes/files.js';

const app = express();

/*
  Render runs the app behind a reverse proxy.
  Trust one proxy so express-rate-limit can correctly
  use X-Forwarded-For.
*/
app.set('trust proxy', 1);

app.use(helmet());

app.use(
  cors({
    origin: [config.websiteUrl, config.adminUrl],
    credentials: true,
  })
);

app.use(express.json({ limit: '12mb' }));

app.use(
  rateLimit({
    windowMs: config.rateWindowMs,
    limit: config.rateMax,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (_req, res) =>
  res.json({
    ok: true,
    service: 'creator-studio-api',
  })
);

/*
  IMPORTANT ROUTE ORDER

  Auth first
  Admin second
  Then Files / CMS / User routes

  Admin must be ABOVE userRouter,
  otherwise userRouter auth middleware
  catches /api/admin/login.
*/

app.use('/api/auth', authRouter);

app.use('/api/admin', adminRouter);

app.use('/api', filesRouter);

app.use('/api', cmsRouter);

app.use('/api', userRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: err.issues,
    });
  }

  if (err?.code === '23505') {
    return res.status(409).json({
      error: 'Duplicate record',
    });
  }

  res.status(500).json({
    error: err?.message || 'Internal server error',
  });
});

const server = http.createServer(app);
const liveWss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  try {
    const u = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (u.pathname !== '/api/live-voice') { socket.destroy(); return; }
    const token = u.searchParams.get('token') || '';
    const decoded = jwt.verify(token, config.authSecret) as any;
    if (!decoded?.sub || decoded?.role !== 'user') { socket.destroy(); return; }
    (req as any).voiceGender = u.searchParams.get('gender') === 'male' ? 'male' : 'female';
    liveWss.handleUpgrade(req, socket, head, ws => liveWss.emit('connection', ws, req));
  } catch { socket.destroy(); }
});

liveWss.on('connection', (client: WebSocket, req: any) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '';
  if (!apiKey) { client.close(1011, 'Gemini API key missing'); return; }
  const gender = req.voiceGender === 'male' ? 'male' : 'female';
  const voiceName = gender === 'male' ? 'Puck' : 'Kore';
  const gemini = new WebSocket(
    `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(apiKey)}`
  );
  let ready = false;
  const pending: RawData[] = [];
  gemini.on('open', () => {
    gemini.send(JSON.stringify({setup:{
      model:'models/gemini-3.1-flash-live-preview',
      generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName}}}},
      inputAudioTranscription:{}, outputAudioTranscription:{},
      realtimeInputConfig:{automaticActivityDetection:{disabled:false,prefixPaddingMs:20,silenceDurationMs:220}},
      systemInstruction:{parts:[{text:`You are ✨ Khobragade AI, created by Nitesh Khobragade. Have a natural realtime spoken conversation. Understand Hindi, Hinglish, Marathi and English and reply in the user's language. ${gender==='female'?'Use feminine Hindi grammar for yourself.':'Use masculine Hindi grammar for yourself.'} Keep spoken answers concise unless detail is requested. Never read aloud emoji, stars, markdown symbols, bullets, URLs, or formatting marks; speak only the natural words. Never say punctuation names. When the user interrupts, stop immediately and listen.`}]}
    }}));
  });
  gemini.on('message', data => {
    try {
      const msg=JSON.parse(data.toString());
      if (msg.setupComplete) { ready=true; for(const p of pending.splice(0)) gemini.send(p); }
      if (client.readyState===WebSocket.OPEN) client.send(data.toString());
    } catch { if (client.readyState===WebSocket.OPEN) client.send(data); }
  });
  gemini.on('close', (c,r)=>{ if(client.readyState===WebSocket.OPEN) client.close(c===1000?1000:1011,r.toString().slice(0,100)); });
  gemini.on('error', ()=>{ if(client.readyState===WebSocket.OPEN) client.close(1011,'Live AI connection failed'); });
  client.on('message', data => { if(gemini.readyState!==WebSocket.OPEN||!ready) pending.push(data); else gemini.send(data); });
  client.on('close', ()=>{ if(gemini.readyState===WebSocket.OPEN||gemini.readyState===WebSocket.CONNECTING) gemini.close(); });
  client.on('error', ()=>{ try{gemini.close();}catch{} });
});

server.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});
