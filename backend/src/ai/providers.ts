export type AiResult = Record<string, unknown>;

export interface TextProvider { generate(input: Record<string, unknown>): Promise<AiResult>; }
export interface ImageProvider { generate(input: Record<string, unknown>): Promise<AiResult>; }
export interface VideoProvider { generate(input: Record<string, unknown>): Promise<AiResult>; }
export interface AudioProvider { generate(input: Record<string, unknown>): Promise<AiResult>; }

type Source = { title: string; uri: string };

function env(key: string) { return String(process.env[key] || '').trim(); }
function geminiKey() {
  const apiKey = env('GEMINI_API_KEY') || env('GOOGLE_GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY missing in Render Environment');
  return apiKey;
}
function isTemporaryProviderError(status: number, body: unknown) {
  const raw = JSON.stringify(body || '').toLowerCase();
  return status === 408 || status === 409 || status === 429 || status >= 500 || /resource_exhausted|rate.?limit|quota|too many|temporar|overloaded|capacity/.test(raw);
}
function providerError(status: number, body: any, prefix: string) {
  const raw = JSON.stringify(body || '');
  const msg = String(body?.error?.message || body?.message || '');
  if (status === 429 || /resource_exhausted|rate.?limit|quota|too many/.test(raw.toLowerCase())) throw new Error('AI_PROVIDER_QUOTA');
  throw new Error(msg || `${prefix} failed (${status})`);
}

function normalizeSources(chunks: any[]): Source[] {
  const out: Source[] = [];
  const seen = new Set<string>();
  for (const c of Array.isArray(chunks) ? chunks : []) {
    const w = c?.web || c?.webSearch || c;
    const uri = String(w?.uri || w?.url || '').trim();
    const title = String(w?.title || uri).trim();
    if (uri && /^https?:\/\//i.test(uri) && !seen.has(uri)) { seen.add(uri); out.push({ title, uri }); }
  }
  return out.slice(0, 10);
}

function formatClientTime(utcNow: string, timeZone: string, fallback: string) {
  try {
    const d = new Date(utcNow);
    if (Number.isNaN(d.getTime())) return fallback;
    const parts = new Intl.DateTimeFormat('en-IN',{timeZone:timeZone||'Asia/Kolkata',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true,weekday:'long',day:'2-digit',month:'long',year:'numeric'}).formatToParts(d);
    const g=(t:string)=>parts.find(p=>p.type===t)?.value||'';
    return `${g('hour')}:${g('minute')}:${g('second')} ${g('dayPeriod')}, ${g('weekday')}, ${g('day')} ${g('month')} ${g('year')}`;
  } catch { return fallback; }
}

async function externalWebSearch(query: string): Promise<{ text: string; sources: Source[] }> {
  const q = query.trim();
  if (!q) return { text: '', sources: [] };
  const tavily = env('TAVILY_API_KEY');
  if (tavily) {
    const r = await fetch('https://api.tavily.com/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: tavily, query: q, search_depth: 'advanced', max_results: 8, include_answer: false }) });
    const d: any = await r.json();
    if (r.ok) {
      const rows = Array.isArray(d?.results) ? d.results : [];
      return { text: rows.map((x: any, i: number) => `[${i + 1}] ${x.title || ''}\n${x.url || ''}\n${x.content || ''}`).join('\n\n'), sources: rows.map((x: any) => ({ title: String(x.title || x.url || ''), uri: String(x.url || '') })).filter((x: Source) => x.uri) };
    }
    if (!isTemporaryProviderError(r.status, d)) providerError(r.status, d, 'Tavily search');
  }
  const brave = env('BRAVE_SEARCH_API_KEY');
  if (brave) {
    const r = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=8`, { headers: { 'X-Subscription-Token': brave, Accept: 'application/json' } });
    const d: any = await r.json();
    if (r.ok) {
      const rows = Array.isArray(d?.web?.results) ? d.web.results : [];
      return { text: rows.map((x: any, i: number) => `[${i + 1}] ${x.title || ''}\n${x.url || ''}\n${x.description || ''}`).join('\n\n'), sources: rows.map((x: any) => ({ title: String(x.title || x.url || ''), uri: String(x.url || '') })).filter((x: Source) => x.uri) };
    }
    if (!isTemporaryProviderError(r.status, d)) providerError(r.status, d, 'Brave search');
  }
  const serper = env('SERPER_API_KEY');
  if (serper) {
    const r = await fetch('https://google.serper.dev/search', { method: 'POST', headers: { 'X-API-KEY': serper, 'Content-Type': 'application/json' }, body: JSON.stringify({ q, num: 8 }) });
    const d: any = await r.json();
    if (r.ok) {
      const rows = Array.isArray(d?.organic) ? d.organic : [];
      return { text: rows.map((x: any, i: number) => `[${i + 1}] ${x.title || ''}\n${x.link || ''}\n${x.snippet || ''}`).join('\n\n'), sources: rows.map((x: any) => ({ title: String(x.title || x.link || ''), uri: String(x.link || '') })).filter((x: Source) => x.uri) };
    }
    if (!isTemporaryProviderError(r.status, d)) providerError(r.status, d, 'Serper search');
  }
  throw new Error('WEB_SEARCH_PROVIDER_UNAVAILABLE');
}

function fallbackOrder() {
  return (env('AI_FALLBACK_ORDER') || 'openrouter,groq,cerebras,mistral,deepseek,together,xai,pollinations').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
}

async function openAiCompatible(provider: string, input: Record<string, unknown>, searchText = ''): Promise<AiResult> {
  const configs: Record<string, { key: string; url: string; model: string; headers?: Record<string,string> }> = {
    openrouter: { key: env('OPENROUTER_API_KEY'), url: 'https://openrouter.ai/api/v1/chat/completions', model: env('OPENROUTER_MODEL') || 'openrouter/free', headers: { 'HTTP-Referer': env('OPENROUTER_SITE_URL') || 'https://khobragade-ai.app', 'X-Title': 'Khobragade AI' } },
    groq: { key: env('GROQ_API_KEY'), url: 'https://api.groq.com/openai/v1/chat/completions', model: env('GROQ_MODEL') || 'openai/gpt-oss-120b' },
    cerebras: { key: env('CEREBRAS_API_KEY'), url: 'https://api.cerebras.ai/v1/chat/completions', model: env('CEREBRAS_MODEL') || 'gpt-oss-120b' },
    mistral: { key: env('MISTRAL_API_KEY'), url: 'https://api.mistral.ai/v1/chat/completions', model: env('MISTRAL_MODEL') || 'mistral-small-latest' },
    deepseek: { key: env('DEEPSEEK_API_KEY'), url: 'https://api.deepseek.com/chat/completions', model: env('DEEPSEEK_MODEL') || 'deepseek-chat' },
    together: { key: env('TOGETHER_API_KEY'), url: 'https://api.together.xyz/v1/chat/completions', model: env('TOGETHER_MODEL') || 'openai/gpt-oss-120b' },
    xai: { key: env('XAI_API_KEY'), url: 'https://api.x.ai/v1/chat/completions', model: env('XAI_MODEL') || 'grok-4-1-fast-non-reasoning' },
    pollinations: { key: env('POLLINATIONS_API_KEY'), url: 'https://gen.pollinations.ai/v1/chat/completions', model: env('POLLINATIONS_MODEL') || 'openai' },
  };
  const c = configs[provider];
  if (!c?.key) throw new Error('PROVIDER_NOT_CONFIGURED');
  const history = Array.isArray(input.history) ? input.history : [];
  const base = String(input.message || input.prompt || input.text || '').trim();
  const system = String(input.systemPrompt || `You are Khobragade AI, a helpful general-purpose assistant. Reply in the user's language. If the selected assistant persona is female, use feminine first-person Hindi/Hinglish/Marathi forms such as करती हूँ, बताती हूँ, समझाती हूँ, कर सकती हूँ.`);
  const messages: any[] = [{ role: 'system', content: system }, ...history.map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }))];
  if (searchText) messages.push({ role: 'system', content: `Fresh web search results are below. Use them for current facts and cite sources as [1], [2] etc. Do not invent sources.\n\n${searchText}` });
  messages.push({ role: 'user', content: base });
  const r = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.key}`, ...(c.headers || {}) }, body: JSON.stringify({ model: c.model, messages, temperature: 0.7 }) });
  const d: any = await r.json();
  if (!r.ok) { if (isTemporaryProviderError(r.status, d)) throw new Error('AI_PROVIDER_QUOTA'); providerError(r.status, d, `${provider} AI`); }
  const answer = String(d?.choices?.[0]?.message?.content || d?.output?.[0]?.content?.[0]?.text || '').trim();
  if (!answer) throw new Error(`${provider} returned empty response`);
  return { answer, provider, model: c.model };
}

async function fallbackText(input: Record<string, unknown>, searchText = ''): Promise<AiResult> {
  let last: unknown;
  for (const p of fallbackOrder()) {
    try { return await openAiCompatible(p, input, searchText); } catch (e) { last = e; }
  }
  if (last instanceof Error && last.message !== 'PROVIDER_NOT_CONFIGURED') throw last;
  throw new Error(searchText ? 'WEB_SEARCH_AND_AI_PROVIDERS_UNAVAILABLE' : 'ALL_AI_PROVIDERS_EXHAUSTED');
}

function chatSystem(input: Record<string, unknown>) {
  const gender = String(input.voiceGender || 'female');
  return `You are ✨ Khobragade AI, a professional, friendly, general-purpose AI assistant. Your creator's name is EXACTLY Nitesh Khobragade. Never change that name. The selected persona gender is ${gender}. If female, use feminine first-person Hindi/Hinglish/Marathi grammar such as करती हूँ, बताती हूँ, समझाती हूँ, कर सकती हूँ and never masculine self-forms. If male, use masculine forms. Current user date/time: ${String(input.localDateTime || 'not supplied')}. Current UTC timestamp: ${String(input.utcNow || 'not supplied')}. User timezone: ${String(input.timeZone || 'not supplied')}. User location: ${String(input.locationLabel || 'not reverse-geocoded')}. Device: ${String(input.deviceManufacturer || '')} ${String(input.deviceModel || '')}, Android ${String(input.deviceAndroidVersion || '')}, battery ${String(input.batteryPercent ?? 'unknown')}%. Coordinates: ${Number.isFinite(Number(input.latitude)) && Number.isFinite(Number(input.longitude)) ? `${input.latitude}, ${input.longitude}` : 'not supplied'}. Use supplied current date/time deterministically and never guess. Never invent location or device data. Help with general questions, web research, files, images, coding, translation, study, planning and creator tasks. Reply naturally in the user's language.`;
}

class GeminiText implements TextProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    const apiKey = geminiKey();
    const isChat = input.mode === 'chat';
    const model = env('GEMINI_CHAT_MODEL') || 'gemini-3.8-flash';
    const userMessage = String(input.message || input.topic || input.prompt || input.text || '').trim();
    const voiceGender = String(input.voiceGender || 'female');
    if (isChat) {
      const q = userMessage.toLowerCase();
      const timeQuestion = /(time|what time|current time|right now|abhi kitne|kitne baje|samay|समय|कितने बजे|अभी कितना|अभी कितने)/i.test(q);
      const deviceQuestion = /(mobile|phone|device|model|installed|install|मेरा मोबाइल|कौन सा मोबाइल|कौनसे मोबाइल|फोन मॉडल)/i.test(q);
      const locationQuestion = /(where am i|my location|current location|location|meri location|mera location|कहाँ हूँ|मेरी लोकेशन|वर्तमान लोकेशन)/i.test(q);
      const local = String(input.localDateTime || '').trim();
      const tz = String(input.timeZone || '').trim();
      const location = String(input.locationLabel || '').trim();
      const manufacturer = String(input.deviceManufacturer || '').trim();
      const device = String(input.deviceModel || '').trim(); const battery = Number(input.batteryPercent);
      if (deviceQuestion && manufacturer && device) return { answer: `यह ऐप आपके ${manufacturer} ${device} मोबाइल पर installed है.`, provider: 'deterministic' };
      if (/(battery|बैटरी|charge|चार्ज)/i.test(q) && Number.isFinite(battery) && battery >= 0) return { answer: `आपके मोबाइल की battery अभी ${battery}% है.`, provider: 'deterministic' };
      if (locationQuestion && location) return { answer: `आपकी current mobile location: ${location}.`, provider: 'deterministic' };
      if (timeQuestion && local) return { answer: `आपके यहाँ अभी ${formatClientTime(String(input.utcNow||''), tz || 'Asia/Kolkata', local)} है.`, provider: 'deterministic' };
    }
    if (isChat && /(who (created|made|developed) you|your creator|kisne (banaya|banayi)|किसने (बनाया|बनाई)|creator.*(kaun|who)|निर्माता कौन)/i.test(userMessage)) return { answer: 'Mujhe Nitesh Khobragade ne banaya hai.', provider: 'deterministic' };
    const system = isChat ? chatSystem(input) : 'You are a professional YouTube SEO expert. Generate titles, description, tags and hashtags in the same language as the request. Return only valid JSON.';
    const history = Array.isArray(input.history) ? input.history : [];
    const contents: any[] = [{ role: 'user', parts: [{ text: `${system}\n\nRecent conversation:\n${history.map((m:any)=>`${m.role}: ${m.content}`).join('\n')}\n\nUser: ${userMessage}` }] }];
    if (input.attachmentData && input.attachmentMime) contents[0].parts.push({ inlineData: { mimeType: String(input.attachmentMime), data: String(input.attachmentData) } });
    const tools = isChat ? [{ googleSearch: {} }, { urlContext: {} }, { codeExecution: {} }, ...(Number.isFinite(Number(input.latitude)) && Number.isFinite(Number(input.longitude)) ? [{ googleMaps: {} }] : [])] : undefined;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify({ contents, ...(tools ? { tools } : {}), generationConfig: isChat ? {} : { temperature: 0.8, responseMimeType: 'application/json' } }) });
    const d: any = await r.json();
    if (!r.ok) {
      if (isTemporaryProviderError(r.status, d)) {
        let searchText = '';
        if (isChat && /(search|latest|today|news|google|वेब|सर्च|खोज|ताजा|ताज़ा|आज की खबर)/i.test(userMessage)) {
          try { const sr=await externalWebSearch(userMessage); searchText=sr.text; const fb=await fallbackText({ ...input, systemPrompt: system }, searchText); return { ...fb, sources: sr.sources }; } catch (_) {}
        }
        return fallbackText({ ...input, systemPrompt: system }, searchText);
      }
      providerError(r.status, d, 'Gemini AI');
    }
    let answer = String(d?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text || '').join('').trim() || '');
    if (!answer) throw new Error('Gemini returned empty response');
    if (isChat && voiceGender === 'female') answer = answer.replace(/करता हूँ/g,'करती हूँ').replace(/करता हूं/g,'करती हूं').replace(/बताता हूँ/g,'बताती हूँ').replace(/बताता हूं/g,'बताती हूं').replace(/समझाता हूँ/g,'समझाती हूँ').replace(/समझाता हूं/g,'समझाती हूं').replace(/सकता हूँ/g,'सकती हूँ').replace(/सकता हूं/g,'सकती हूं');
    answer = answer.replace(/नितेश\s+खोबरागड़े|नितेश\s+खोब्रागड़े|नितेश\s+खोबरागडे/gi, 'Nitesh Khobragade');
    const sources = normalizeSources(d?.candidates?.[0]?.groundingMetadata?.groundingChunks || []);
    return isChat ? { answer, sources, provider: 'gemini', model } : (() => { try { const x=JSON.parse(answer); return { titles:Array.isArray(x.titles)?x.titles:[], description:x.description||'', tags:Array.isArray(x.tags)?x.tags:[], hashtags:Array.isArray(x.hashtags)?x.hashtags:[], provider:'gemini', model }; } catch { return { titles:[], description:answer, tags:[], hashtags:[], provider:'gemini', model }; } })();
  }
}

function pcmToWavBase64(pcmBase64: string, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const pcm = Buffer.from(pcmBase64, 'base64'); const header = Buffer.alloc(44); const byteRate = sampleRate * channels * bitsPerSample / 8; const blockAlign = channels * bitsPerSample / 8;
  header.write('RIFF',0); header.writeUInt32LE(36+pcm.length,4); header.write('WAVE',8); header.write('fmt ',12); header.writeUInt32LE(16,16); header.writeUInt16LE(1,20); header.writeUInt16LE(channels,22); header.writeUInt32LE(sampleRate,24); header.writeUInt32LE(byteRate,28); header.writeUInt16LE(blockAlign,32); header.writeUInt16LE(bitsPerSample,34); header.write('data',36); header.writeUInt32LE(pcm.length,40); return Buffer.concat([header,pcm]).toString('base64');
}

class GeminiAudio implements AudioProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    const apiKey=geminiKey(); const text=String(input.text||input.message||input.script||'').trim(); if(!text)throw new Error('Voice-over text is required');
    const voice=String(input.voice||'Kore'); const style=String(input.style||'natural');
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({contents:[{parts:[{text:`Synthesize speech in a ${style} style. Speak the following text naturally. Do not add or remove words.\n\n${text}`}]}],generationConfig:{responseModalities:['AUDIO'],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:voice}}}}})});
    const d:any=await r.json(); if(!r.ok){if(isTemporaryProviderError(r.status,d))throw new Error('AI_PROVIDER_QUOTA');providerError(r.status,d,'Gemini TTS');}
    const pcm=d?.candidates?.[0]?.content?.parts?.find((p:any)=>p?.inlineData?.data)?.inlineData?.data; if(!pcm)throw new Error('Gemini TTS returned no audio');
    return {audioDataUrl:`data:audio/wav;base64,${pcmToWavBase64(pcm)}`,mimeType:'audio/wav',voice,provider:'gemini',model:'gemini-3.1-flash-tts-preview'};
  }
}

class GeminiImage implements ImageProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    const apiKey=geminiKey(); const prompt=String(input.prompt||input.topic||input.title||input.text||'').trim(); if(!prompt)throw new Error('Image prompt is required'); const model=env('GEMINI_IMAGE_MODEL')||'gemini-3.1-flash-image';
    const parts:any[]=[{text:prompt}];
    if(input.imageDataUrl){const s=String(input.imageDataUrl);const comma=s.indexOf(',');if(s.startsWith('data:image/')&&comma>0){const mime=s.slice(5,s.indexOf(';',5)>0?s.indexOf(';',5):comma);parts.push({inlineData:{mimeType:mime,data:s.slice(comma+1)}});}}
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({contents:[{parts}],generationConfig:{responseModalities:['TEXT','IMAGE']}})}); const d:any=await r.json();
    if(!r.ok){if(isTemporaryProviderError(r.status,d))throw new Error('AI_PROVIDER_QUOTA');if(/billing|paid|not available/i.test(JSON.stringify(d)))throw new Error('IMAGE_PROVIDER_BILLING_REQUIRED');providerError(r.status,d,'Gemini image');}
    const image=d?.candidates?.[0]?.content?.parts?.find((x:any)=>x?.inlineData?.data)?.inlineData; if(!image?.data)throw new Error('Gemini returned no image'); return {imageDataUrl:`data:${image.mimeType||'image/png'};base64,${image.data}`,mimeType:image.mimeType||'image/png',provider:'gemini',model};
  }
}

class PollinationsImage implements ImageProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    const key=env('POLLINATIONS_API_KEY'); if(!key)throw new Error('PROVIDER_NOT_CONFIGURED'); const prompt=String(input.prompt||'').trim(); const url=`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${encodeURIComponent(env('POLLINATIONS_IMAGE_MODEL')||'flux')}`;
    const r=await fetch(url,{headers:{Authorization:`Bearer ${key}`}}); if(!r.ok){if(isTemporaryProviderError(r.status,await r.text()))throw new Error('AI_PROVIDER_QUOTA');throw new Error(`Pollinations image failed (${r.status})`);} const b=Buffer.from(await r.arrayBuffer()).toString('base64'); return {imageDataUrl:`data:${r.headers.get('content-type')||'image/png'};base64,${b}`,mimeType:r.headers.get('content-type')||'image/png',provider:'pollinations',model:env('POLLINATIONS_IMAGE_MODEL')||'flux'};
  }
}

class GeminiVideo implements VideoProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    const apiKey=geminiKey(); const prompt=String(input.prompt||input.text||input.title||input.voice||'').trim()||'Create a cinematic video'; const model=env('GEMINI_VIDEO_MODEL')||'veo-3.1-generate-preview'; const base='https://generativelanguage.googleapis.com/v1beta';
    const imageDataUrl=String(input.imageDataUrl||'').trim(); let imagePart:any; if(imageDataUrl.startsWith('data:image/')){const comma=imageDataUrl.indexOf(',');if(comma>0){const mimeType=imageDataUrl.slice(5,imageDataUrl.indexOf(';',5)>0?imageDataUrl.indexOf(';',5):comma);imagePart={inlineData:{mimeType,data:imageDataUrl.slice(comma+1)}};}}
    const instance:any={prompt}; if(imagePart)instance.image=imagePart;
    const first=await fetch(`${base}/models/${model}:predictLongRunning`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({instances:[instance],parameters:{numberOfVideos:1,resolution:'720p',aspectRatio:'16:9'}})}); const created:any=await first.json();
    if(!first.ok){if(isTemporaryProviderError(first.status,created))throw new Error('AI_PROVIDER_QUOTA');if(/billing|paid|not available/i.test(JSON.stringify(created)))throw new Error('VIDEO_PROVIDER_BILLING_REQUIRED');providerError(first.status,created,'Veo');}
    const operation=created?.name;if(!operation)throw new Error('Veo did not return an operation id'); for(let i=0;i<90;i++){await new Promise(r=>setTimeout(r,10000));const rr=await fetch(`${base}/${operation}`,{headers:{'x-goog-api-key':apiKey}});const d:any=await rr.json();if(!rr.ok)throw new Error(d?.error?.message||'Veo status check failed');if(d.done){if(d.error)throw new Error(d.error.message||'Veo generation failed');const uri=d?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;if(!uri)throw new Error('Veo completed but returned no video');return {videoUri:uri,provider:'gemini',model};}} throw new Error('Video generation timed out');
  }
}



async function hedraModel(type: 'image'|'video') {
  const key=env('HEDRA_API_KEY'); if(!key) throw new Error('PROVIDER_NOT_CONFIGURED');
  const r=await fetch('https://api.hedra.com/web-app/public/models',{headers:{'X-API-Key':key}}); const d:any=await r.json();
  if(!r.ok) throw new Error('HEDRA_UNAVAILABLE');
  const wanted=env(type==='image'?'HEDRA_IMAGE_MODEL_ID':'HEDRA_VIDEO_MODEL_ID');
  const row=(Array.isArray(d)?d:[]).find((x:any)=>String(x?.id)===wanted) || (Array.isArray(d)?d:[]).find((x:any)=>String(x?.type||'').toLowerCase()===type);
  if(!row?.id) throw new Error(`No Hedra ${type} model available`); return {key,id:String(row.id)};
}

class HedraImage implements ImageProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    const {key,id}=await hedraModel('image'); const prompt=String(input.prompt||'').trim();
    const r=await fetch('https://api.hedra.com/web-app/public/generations',{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':key},body:JSON.stringify({type:'image',ai_model_id:id,text_prompt:prompt,aspect_ratio:String(input.aspectRatio||'16:9'),resolution:String(input.resolution||'1080p'),enhance_prompt:true})}); const d:any=await r.json();
    if(!r.ok){if(isTemporaryProviderError(r.status,d))throw new Error('AI_PROVIDER_QUOTA');throw new Error(String(d?.detail||d?.message||'Hedra image failed'));}
    const gid=d?.id;if(!gid)throw new Error('Hedra image did not return generation id');
    for(let i=0;i<120;i++){await new Promise(r=>setTimeout(r,3000));const s=await fetch(`https://api.hedra.com/web-app/public/generations/${gid}/status`,{headers:{'X-API-Key':key}});const x:any=await s.json();if(!s.ok)throw new Error('Hedra image status failed');if(x.status==='error')throw new Error(x.error_message||'Hedra image failed');if(x.status==='complete'&&x.url)return {imageUrl:x.url,provider:'hedra',model:id};}
    throw new Error('Hedra image timed out');
  }
}

class HedraVideo implements VideoProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    const {key,id}=await hedraModel('video'); const prompt=String(input.prompt||'').trim();
    const r=await fetch('https://api.hedra.com/web-app/public/generations',{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':key},body:JSON.stringify({type:'video',ai_model_id:id,generated_video_inputs:{text_prompt:prompt,aspect_ratio:String(input.aspectRatio||'16:9'),resolution:String(input.resolution||'720p'),duration_ms:Number(input.durationMs||5000)}})}); const d:any=await r.json();
    if(!r.ok){if(isTemporaryProviderError(r.status,d))throw new Error('AI_PROVIDER_QUOTA');throw new Error(String(d?.detail||d?.message||'Hedra video failed'));}
    const gid=d?.id;if(!gid)throw new Error('Hedra video did not return generation id');
    for(let i=0;i<240;i++){await new Promise(r=>setTimeout(r,3000));const s=await fetch(`https://api.hedra.com/web-app/public/generations/${gid}/status`,{headers:{'X-API-Key':key}});const x:any=await s.json();if(!s.ok)throw new Error('Hedra video status failed');if(x.status==='error')throw new Error(x.error_message||'Hedra video failed');if(x.status==='complete'&&(x.url||x.download_url))return {videoUri:x.url||x.download_url,provider:'hedra',model:id};}
    throw new Error('Hedra video timed out');
  }
}

class PollinationsAudio implements AudioProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    const key=env('POLLINATIONS_API_KEY'); if(!key)throw new Error('PROVIDER_NOT_CONFIGURED');
    const text=String(input.text||input.message||input.script||'').trim(); if(!text)throw new Error('Voice-over text is required');
    const voice=env('POLLINATIONS_AUDIO_VOICE')||'nova';
    const r=await fetch(`https://gen.pollinations.ai/audio/${encodeURIComponent(text)}?voice=${encodeURIComponent(voice)}`,{headers:{Authorization:`Bearer ${key}`}});
    if(!r.ok){if(isTemporaryProviderError(r.status,await r.text()))throw new Error('AI_PROVIDER_QUOTA');throw new Error(`Pollinations audio failed (${r.status})`);}
    const b=Buffer.from(await r.arrayBuffer()).toString('base64');
    return {audioDataUrl:`data:${r.headers.get('content-type')||'audio/mpeg'};base64,${b}`,mimeType:r.headers.get('content-type')||'audio/mpeg',voice,provider:'pollinations'};
  }
}

class PollinationsVideo implements VideoProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    const key=env('POLLINATIONS_API_KEY'); if(!key)throw new Error('PROVIDER_NOT_CONFIGURED');
    const prompt=String(input.prompt||input.text||input.title||'Create a cinematic video').trim();
    const r=await fetch(`https://gen.pollinations.ai/video/${encodeURIComponent(prompt)}`,{headers:{Authorization:`Bearer ${key}`}});
    if(!r.ok){if(isTemporaryProviderError(r.status,await r.text()))throw new Error('AI_PROVIDER_QUOTA');throw new Error(`Pollinations video failed (${r.status})`);}
    const b=Buffer.from(await r.arrayBuffer()).toString('base64');
    return {videoDataUrl:`data:${r.headers.get('content-type')||'video/mp4'};base64,${b}`,mimeType:r.headers.get('content-type')||'video/mp4',provider:'pollinations'};
  }
}

export const textProvider: TextProvider = {
  async generate(input) {
    try { return await new GeminiText().generate(input); }
    catch (e:any) {
      if (e?.message==='GEMINI_API_KEY missing in Render Environment' || e?.message==='AI_PROVIDER_QUOTA' || e?.message==='GEMINI_DAILY_QUOTA') return fallbackText(input);
      throw e;
    }
  }
};
export const audioProvider: AudioProvider = {
  async generate(input) {
    try { return await new GeminiAudio().generate(input); }
    catch (e:any) {
      if (e?.message==='AI_PROVIDER_QUOTA') { try { return await new PollinationsAudio().generate(input); } catch (_) {} }
      throw e;
    }
  }
};
export const imageProvider: ImageProvider = {
  async generate(input) {
    try { return await new GeminiImage().generate(input); }
    catch (e:any) {
      if (e?.message==='AI_PROVIDER_QUOTA' || e?.message==='IMAGE_PROVIDER_BILLING_REQUIRED') {
        try { return await new HedraImage().generate(input); } catch (_) {}
        try { return await new PollinationsImage().generate(input); } catch (_) {}
      }
      throw e;
    }
  }
};
export const videoProvider: VideoProvider = {
  async generate(input) {
    try { return await new GeminiVideo().generate(input); }
    catch (e:any) {
      if (e?.message==='AI_PROVIDER_QUOTA' || e?.message==='VIDEO_PROVIDER_BILLING_REQUIRED') {
        try { return await new HedraVideo().generate(input); } catch (_) {}
        try { return await new PollinationsVideo().generate(input); } catch (_) {}
      }
      throw e;
    }
  }
};

export async function webSearchFallback(query: string) { return externalWebSearch(query); }
