const providerState = new Map();
const nowIso = () => new Date().toISOString();
function state(name, configured) {
    const current = providerState.get(name) || { configured, failures: 0 };
    current.configured = configured;
    providerState.set(name, current);
    return current;
}
function markSuccess(name, status = 200) {
    const s = state(name, true);
    s.lastStatus = status;
    s.lastSuccessAt = nowIso();
    s.lastError = undefined;
    s.failures = 0;
}
function markFailure(name, status, error) {
    const s = state(name, true);
    s.lastStatus = status;
    s.lastError = String(error || 'Provider request failed').slice(0, 300);
    s.failures += 1;
}
function env(key, fallback = '') { return String(process.env[key] || fallback).trim(); }
function geminiKey() {
    return env('GEMINI_API_KEY') || env('GOOGLE_GEMINI_API_KEY');
}
async function fetchWithTimeout(url, init = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    }
    finally {
        clearTimeout(timer);
    }
}
function decodeHtml(value) {
    return value
        .replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '')
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/&#x27;/gi, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function unwrapDuckUrl(raw) {
    const value = decodeHtml(raw);
    try {
        const u = new URL(value, 'https://duckduckgo.com');
        return u.searchParams.get('uddg') || value;
    }
    catch {
        return value;
    }
}
async function fetchWebContext(query) {
    const q = query.trim();
    if (!q)
        return { text: '', sources: [] };
    const sources = [];
    const blocks = [];
    const add = (title, url, snippet = '') => {
        if (!url || sources.some(s => s.url === url))
            return;
        const cleanTitle = title || url;
        sources.push({ title: cleanTitle, url, snippet });
        blocks.push(`- ${cleanTitle}: ${snippet || 'Web search result'}`);
    };
    const newsLike = /(news|latest|today|breaking|headline|current events|खबर|न्यूज़|ताज़ा|आज की|ब्रेकिंग|समाचार)/i.test(q);
    if (newsLike) {
        try {
            const u = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
            const r = await fetchWithTimeout(u, { headers: { 'User-Agent': 'Mozilla/5.0 KhobragadeAI/1.0' } }, 10000);
            if (r.ok) {
                const xml = await r.text();
                for (const m of [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 10)) {
                    const item = m[1];
                    const title = decodeHtml(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
                    const link = decodeHtml(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '');
                    const desc = decodeHtml(item.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || '').slice(0, 700);
                    if (title && link)
                        add(title, link, desc);
                }
            }
        }
        catch (e) {
            console.warn('Google News search failed', e);
        }
    }
    // API-backed search providers are preferred. Any configured provider is real web search;
    // failed/limited providers are skipped instead of returning fake data.
    const tavily = env('TAVILY_API_KEY');
    if (tavily && sources.length < 8) {
        try {
            const r = await fetchWithTimeout('https://api.tavily.com/search', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: tavily, query: q, max_results: 8, search_depth: newsLike ? 'advanced' : 'basic', include_answer: false })
            }, 15000);
            const d = await r.json();
            if (r.ok) {
                markSuccess('tavily', r.status);
                for (const x of d.results || [])
                    add(String(x.title || ''), String(x.url || ''), String(x.content || '').slice(0, 800));
            }
            else
                markFailure('tavily', r.status, d?.detail || d?.error);
        }
        catch (e) {
            markFailure('tavily', undefined, e);
        }
    }
    const brave = env('BRAVE_SEARCH_API_KEY');
    if (brave && sources.length < 8) {
        try {
            const u = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=8&country=IN&search_lang=en`;
            const r = await fetchWithTimeout(u, { headers: { Accept: 'application/json', 'X-Subscription-Token': brave } }, 15000);
            const d = await r.json();
            if (r.ok) {
                markSuccess('brave', r.status);
                for (const x of d.web?.results || [])
                    add(String(x.title || ''), String(x.url || ''), String(x.description || '').slice(0, 800));
            }
            else
                markFailure('brave', r.status, d?.message || d?.error);
        }
        catch (e) {
            markFailure('brave', undefined, e);
        }
    }
    const serper = env('SERPER_API_KEY');
    if (serper && sources.length < 8) {
        try {
            const r = await fetchWithTimeout('https://google.serper.dev/search', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-KEY': serper },
                body: JSON.stringify({ q, gl: 'in', hl: 'en', num: 8 })
            }, 15000);
            const d = await r.json();
            if (r.ok) {
                markSuccess('serper', r.status);
                for (const x of d.organic || [])
                    add(String(x.title || ''), String(x.link || ''), String(x.snippet || '').slice(0, 800));
            }
            else
                markFailure('serper', r.status, d?.message || d?.error);
        }
        catch (e) {
            markFailure('serper', undefined, e);
        }
    }
    // Keyless fallback. DuckDuckGo is a real search result page, not a generated answer.
    if (sources.length === 0) {
        try {
            const u = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
            const r = await fetchWithTimeout(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KhobragadeAI/1.0)' } }, 12000);
            const html = await r.text();
            if (r.ok) {
                const pattern = /<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
                for (const m of [...html.matchAll(pattern)].slice(0, 8)) {
                    const url = unwrapDuckUrl(m[1]);
                    const title = decodeHtml(m[2]);
                    if (title && /^https?:\/\//i.test(url))
                        add(title, url, 'Web search result');
                }
            }
        }
        catch (e) {
            console.warn('DuckDuckGo search failed', e);
        }
    }
    return { text: blocks.slice(0, 10).join('\n'), sources: sources.slice(0, 10) };
}
function shouldSearch(message) {
    return /(search|google|web|website|internet|latest|today|current|news|headline|source|sources|find|look up|खोज|सर्च|वेब|वेबसाइट|इंटरनेट|ताज़ा|आज|समाचार|खबर|न्यूज़|सोर्स|ढूंढ|ढूँढ|खोजो)/i.test(message);
}
function normalizeFemale(answer) {
    return answer.replace(/नितेश\s+खोबरागड़े|नितेश\s+खोब्रागड़े|नितेश\s+खोबरागडे/gi, 'Nitesh Khobragade')
        .replace(/करता हूँ/g, 'करती हूँ').replace(/करता हूं/g, 'करती हूं')
        .replace(/बताता हूँ/g, 'बताती हूँ').replace(/बताता हूं/g, 'बताती हूं')
        .replace(/समझाता हूँ/g, 'समझाती हूँ').replace(/समझाता हूं/g, 'समझाती हूं')
        .replace(/सकता हूँ/g, 'सकती हूँ').replace(/सकता हूं/g, 'सकती हूं');
}
function providerConfigs() {
    return [
        { name: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: env('OPENROUTER_API_KEY'), model: env('OPENROUTER_CHAT_MODEL', 'openrouter/free') },
        { name: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: env('GROQ_API_KEY'), model: env('GROQ_CHAT_MODEL', 'openai/gpt-oss-20b') },
        { name: 'cerebras', url: 'https://api.cerebras.ai/v1/chat/completions', key: env('CEREBRAS_API_KEY'), model: env('CEREBRAS_CHAT_MODEL', 'llama-3.3-70b') },
        { name: 'mistral', url: 'https://api.mistral.ai/v1/chat/completions', key: env('MISTRAL_API_KEY'), model: env('MISTRAL_CHAT_MODEL', 'mistral-large-latest') },
        { name: 'deepseek', url: 'https://api.deepseek.com/chat/completions', key: env('DEEPSEEK_API_KEY'), model: env('DEEPSEEK_CHAT_MODEL', 'deepseek-v4-pro') },
        { name: 'together', url: 'https://api.together.ai/v1/chat/completions', key: env('TOGETHER_API_KEY'), model: env('TOGETHER_CHAT_MODEL', 'openai/gpt-oss-20b') },
        { name: 'xai', url: 'https://api.x.ai/v1/chat/completions', key: env('XAI_API_KEY'), model: env('XAI_CHAT_MODEL', 'grok-4.6') },
        { name: 'pollinations', url: `${env('POLLINATIONS_BASE_URL', 'https://gen.pollinations.ai')}/v1/chat/completions`, key: env('POLLINATIONS_API_KEY'), model: env('POLLINATIONS_TEXT_MODEL', 'openai') },
    ];
}
function extractCompletion(data) {
    const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? data?.output_text;
    if (Array.isArray(content))
        return content.map((x) => x?.text || '').join('').trim();
    return String(content || '').trim();
}
async function openAiCompatibleFallback(system, user, history = []) {
    const messages = [
        { role: 'system', content: system },
        ...history.slice(-12).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 12000) })),
        { role: 'user', content: user },
    ];
    for (const p of providerConfigs()) {
        state(p.name, !!p.key);
        if (!p.key)
            continue;
        try {
            const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` };
            if (p.name === 'openrouter') {
                headers['HTTP-Referer'] = env('WEBSITE_URL', 'https://khobragade-ai.vercel.app');
                headers['X-Title'] = 'Khobragade AI';
            }
            const r = await fetchWithTimeout(p.url, { method: 'POST', headers, body: JSON.stringify({ model: p.model, messages, temperature: 0.4, max_tokens: 4096 }) }, 15000);
            const d = await r.json().catch(() => ({}));
            if (r.ok) {
                const text = extractCompletion(d);
                if (text) {
                    markSuccess(p.name, r.status);
                    return { text, provider: p.name };
                }
            }
            markFailure(p.name, r.status, d?.error?.message || d?.error || `HTTP ${r.status}`);
            console.warn(`${p.name} fallback failed`, r.status, d?.error?.message || d?.error || '');
        }
        catch (e) {
            markFailure(p.name, undefined, e);
            console.warn(`${p.name} fallback error`, e);
        }
    }
    throw new Error('ALL_AI_PROVIDERS_EXHAUSTED');
}
function parseStructuredText(text) {
    const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    try {
        const result = JSON.parse(cleaned);
        return { titles: Array.isArray(result.titles) ? result.titles : [], description: String(result.description || ''), tags: Array.isArray(result.tags) ? result.tags : [], hashtags: Array.isArray(result.hashtags) ? result.hashtags : [] };
    }
    catch {
        return { titles: [], description: text, tags: [], hashtags: [] };
    }
}
class GeminiText {
    async generate(input) {
        const apiKey = geminiKey();
        const isChat = input.mode === 'chat';
        const chatModels = [env('GEMINI_CHAT_MODEL', 'gemini-3.7-flash'), 'gemini-3.6-flash', 'gemini-3.5-flash'].filter((v, i, a) => v && a.indexOf(v) === i);
        const localDateTime = String(input.localDateTime || '').trim();
        const timeZone = String(input.timeZone || '').trim();
        const latitude = Number(input.latitude);
        const longitude = Number(input.longitude);
        const locationName = String(input.locationName || '').trim();
        const topic = String(input.topic || input.prompt || input.text || input.title || input.message || 'YouTube video');
        const history = Array.isArray(input.history) ? input.history : [];
        const voiceGender = String(input.voiceGender || 'female');
        const language = String(input.language || 'hi');
        const languageName = language === 'en' ? 'English' : language === 'mr' ? 'Marathi (मराठी)' : 'Hindi (हिंदी)';
        const userMessage = String(input.message || topic);
        if (isChat && /(who (created|made|developed) you|your creator|kisne (banaya|banayi)|किसने (बनाया|बनाई)|creator.*(kaun|who)|निर्माता कौन)/i.test(userMessage))
            return { answer: 'Mujhe Nitesh Khobragade ne banaya hai.' };
        const searchRequested = shouldSearch(userMessage);
        const external = searchRequested ? await fetchWebContext(userMessage) : { text: '', sources: [] };
        const prompt = isChat ? `You are ✨ Khobragade AI, a professional, friendly general-purpose AI assistant created by Nitesh Khobragade.
Creator name is exactly: Nitesh Khobragade. Never alter it.
Selected language: ${languageName}. Answer in that language unless explicitly asked otherwise.
Voice/persona gender: ${voiceGender}. If female, use feminine first-person Hindi/Hinglish/Marathi grammar. If male, use masculine grammar.
You can answer general questions, code, translation, attachments, current information, news, web research, image/video requests and everyday tasks.
Current local date/time: ${localDateTime || 'not supplied'}
User timezone: ${timeZone || 'not supplied'}
User location: ${locationName || (Number.isFinite(latitude) && Number.isFinite(longitude) ? `${latitude}, ${longitude}` : 'not supplied')}
When asked current time/date, use the supplied local context exactly. When asked current location, never invent it.
For current/news/search questions, use only the supplied web-search context and clearly distinguish search results from general knowledge. Never claim a search happened if no sources were returned.
Never claim an image/video was generated unless the application tool actually generated it.
Keep the answer complete and natural. Do not unnecessarily shorten the answer.
External web-search context:
${external.text || 'none'}
Recent conversation:
${history.map((m) => `${m.role}: ${String(m.content || '').slice(0, 12000)}`).join('\n')}
User: ${userMessage}
Assistant:` : `You are a professional YouTube SEO expert. User request/topic: "${topic}". Generate useful YouTube content in the SAME LANGUAGE as the user's request. Return ONLY valid JSON: {"titles":["title 1","title 2","title 3","title 4","title 5"],"description":"Professional YouTube description","tags":["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],"hashtags":["#hashtag1","#hashtag2","#hashtag3","#hashtag4","#hashtag5"]}. No markdown or code fences.`;
        const tools = isChat && searchRequested ? [{ googleSearch: {} }, ...(Number.isFinite(latitude) && Number.isFinite(longitude) ? [{ googleMaps: {} }] : [])] : undefined;
        let primaryError = null;
        if (apiKey) {
            for (const model of chatModels) {
                try {
                    const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                        body: JSON.stringify({
                            contents: [{ role: 'user', parts: [{ text: prompt }, ...(isChat && input.attachmentData && input.attachmentMime ? [{ inlineData: { mimeType: String(input.attachmentMime), data: String(input.attachmentData) } }] : [])] }],
                            ...(tools ? { tools } : {}),
                            generationConfig: isChat ? {} : { temperature: 0.8, responseMimeType: 'application/json' }
                        })
                    }, 45000);
                    const data = await response.json().catch(() => ({}));
                    if (!response.ok) {
                        primaryError = new Error(/PerDay|per day|daily/i.test(JSON.stringify(data)) ? 'GEMINI_DAILY_QUOTA' : (response.status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(JSON.stringify(data)) ? 'GEMINI_RATE_LIMIT' : String(data?.error?.message || `Gemini API failed with status ${response.status}`)));
                        markFailure('gemini', response.status, primaryError);
                        continue;
                    }
                    const text = String(data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('').trim() || '');
                    if (!text) {
                        primaryError = new Error('Gemini returned empty response');
                        markFailure('gemini', response.status, primaryError);
                        continue;
                    }
                    markSuccess('gemini', response.status);
                    if (!isChat)
                        return parseStructuredText(text);
                    let answer = voiceGender === 'female' ? normalizeFemale(text) : text.replace(/नितेश\s+खोबरागड़े|नितेश\s+खोब्रागड़े|नितेश\s+खोबरागडे/gi, 'Nitesh Khobragade');
                    const grounding = data?.groundingMetadata?.groundingChunks || [];
                    const grounded = [];
                    for (const g of grounding) {
                        const w = g?.web;
                        if (w?.uri)
                            grounded.push({ title: String(w.title || w.uri), url: String(w.uri) });
                    }
                    const all = [...grounded, ...external.sources].filter((x, i, a) => x.url && a.findIndex(y => y.url === x.url) === i).slice(0, 10);
                    if (all.length && searchRequested)
                        answer += `\n\nSources:\n${all.map(x => `- ${x.title}: ${x.url}`).join('\n')}`;
                    return { answer, sources: all, webSearched: searchRequested, provider: 'gemini', model };
                }
                catch (e) {
                    primaryError = e;
                    markFailure('gemini', undefined, e);
                }
            }
        }
        else
            state('gemini', false);
        if (input.attachmentData)
            throw (primaryError || new Error('GEMINI_API_KEY missing for attachment analysis'));
        const system = `You are Khobragade AI, created by Nitesh Khobragade. Answer in ${languageName}. Voice gender is ${voiceGender}; use feminine first-person grammar when female. Current local time: ${localDateTime || 'not supplied'}. Timezone: ${timeZone || 'not supplied'}. User location: ${locationName || 'not supplied'}. For current/search/news questions use only this web context and identify sources. Web context:\n${external.text || 'none'}`;
        const fallback = await openAiCompatibleFallback(system, userMessage, history);
        if (!isChat)
            return parseStructuredText(fallback.text);
        const answer = voiceGender === 'female' ? normalizeFemale(fallback.text) : fallback.text;
        const suffix = external.sources.length && searchRequested ? `\n\nSources:\n${external.sources.map(x => `- ${x.title}: ${x.url}`).join('\n')}` : '';
        return { answer: answer + suffix, sources: external.sources, webSearched: searchRequested, provider: fallback.provider, fallback: true };
    }
}
function pcmToWavBase64(pcmBase64, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
    const pcm = Buffer.from(pcmBase64, 'base64');
    const header = Buffer.alloc(44);
    const byteRate = sampleRate * channels * bitsPerSample / 8;
    const blockAlign = channels * bitsPerSample / 8;
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([header, pcm]).toString('base64');
}
class GeminiAudio {
    async generate(input) {
        const apiKey = geminiKey();
        if (!apiKey)
            throw new Error('GEMINI_API_KEY missing');
        const text = String(input.text || input.message || input.script || '').trim();
        if (!text)
            throw new Error('Voice-over text is required');
        const voice = String(input.voice || 'Kore');
        const style = String(input.style || 'natural');
        const model = env('GEMINI_TTS_MODEL', 'gemini-3.1-flash-tts-preview');
        const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({ contents: [{ parts: [{ text: `Synthesize speech in a ${style} style. Speak the following text naturally. Do not add or remove words.\n\nTranscript:\n${text}` }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } })
        }, 45000);
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
            throw new Error(data?.error?.message || `Gemini TTS failed with status ${response.status}`);
        const pcmBase64 = data?.candidates?.[0]?.content?.parts?.find((p) => p?.inlineData?.data)?.inlineData?.data;
        if (!pcmBase64)
            throw new Error('Gemini TTS returned no audio.');
        return { audioDataUrl: `data:audio/wav;base64,${pcmToWavBase64(pcmBase64)}`, mimeType: 'audio/wav', voice, provider: 'gemini', model };
    }
}
class GeminiImage {
    async generate(input) {
        const prompt = String(input.prompt || input.topic || input.title || input.text || '').trim();
        if (!prompt)
            throw new Error('Image prompt is required');
        const apiKey = geminiKey();
        const model = env('GEMINI_IMAGE_MODEL', 'gemini-3.1-flash-image');
        if (apiKey) {
            try {
                const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } })
                }, 60000);
                const data = await response.json().catch(() => ({}));
                if (response.ok) {
                    const image = (data?.candidates?.[0]?.content?.parts || []).find((x) => x?.inlineData?.data);
                    if (image?.inlineData?.data) {
                        markSuccess('gemini-image', response.status);
                        const mime = image.inlineData.mimeType || 'image/png';
                        return { imageDataUrl: `data:${mime};base64,${image.inlineData.data}`, mimeType: mime, provider: 'gemini', model };
                    }
                }
                markFailure('gemini-image', response.status, data?.error?.message || 'Gemini returned no image');
            }
            catch (e) {
                markFailure('gemini-image', undefined, e);
            }
        }
        else
            state('gemini-image', false);
        const key = env('POLLINATIONS_API_KEY');
        if (key) {
            try {
                const base = env('POLLINATIONS_BASE_URL', 'https://gen.pollinations.ai');
                const model = env('POLLINATIONS_IMAGE_MODEL', 'flux');
                const response = await fetchWithTimeout(`${base}/image/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&width=1024&height=1024`, { headers: { Authorization: `Bearer ${key}` } }, 90000);
                if (response.ok) {
                    const mime = response.headers.get('content-type') || 'image/jpeg';
                    const buf = Buffer.from(await response.arrayBuffer());
                    if (buf.length > 1000) {
                        markSuccess('pollinations-image', response.status);
                        return { imageDataUrl: `data:${mime};base64,${buf.toString('base64')}`, mimeType: mime, provider: 'pollinations', model };
                    }
                }
                markFailure('pollinations-image', response.status, 'Pollinations returned no image');
            }
            catch (e) {
                markFailure('pollinations-image', undefined, e);
            }
        }
        else
            state('pollinations-image', false);
        throw new Error('ALL_IMAGE_PROVIDERS_EXHAUSTED');
    }
}
class VideoProviderImpl {
    async generate(input) {
        const prompt = String(input.prompt || input.text || input.title || '').trim() || `Create a ${String(input.style || 'cinematic')} video.`;
        const imageDataUrl = String(input.imageDataUrl || '').trim();
        const aspectRatio = String(input.aspectRatio || '16:9') === '9:16' ? '9:16' : '16:9';
        const resolution = ['720p', '1080p', '4k'].includes(String(input.resolution || '720p')) ? String(input.resolution || '720p') : '720p';
        const gemKey = geminiKey();
        // Primary: Gemini Veo 3.1 long-running generation. The operation is polled until
        // completion and the returned URI is kept for the authenticated download route.
        if (gemKey) {
            try {
                const model = env('GEMINI_VIDEO_MODEL', 'veo-3.1-generate-preview');
                const instance = { prompt };
                if (imageDataUrl.startsWith('data:image/')) {
                    const comma = imageDataUrl.indexOf(',');
                    const mimeEnd = imageDataUrl.indexOf(';', 5);
                    const mimeType = imageDataUrl.slice(5, mimeEnd > 0 ? mimeEnd : comma);
                    const data = imageDataUrl.slice(comma + 1);
                    if (comma > 0 && mimeType && data)
                        instance.image = { inlineData: { mimeType, data } };
                }
                const first = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': gemKey }, body: JSON.stringify({
                        instances: [instance],
                        parameters: { numberOfVideos: 1, resolution, aspectRatio }
                    }) }, 60000);
                const created = await first.json().catch(() => ({}));
                if (!first.ok)
                    throw new Error(String(created?.error?.message || `Veo generation failed (${first.status})`));
                const operation = String(created?.name || '');
                if (!operation)
                    throw new Error('Veo did not return an operation id');
                const maxPolls = Math.max(30, Math.min(180, Number(input.maxPolls || 120)));
                for (let i = 0; i < maxPolls; i++) {
                    await new Promise(r => setTimeout(r, i === 0 ? 3000 : 10000));
                    const r = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/${operation}`, { headers: { 'x-goog-api-key': gemKey } }, 30000);
                    const d = await r.json().catch(() => ({}));
                    if (!r.ok)
                        throw new Error(String(d?.error?.message || 'Veo status check failed'));
                    if (!d.done)
                        continue;
                    if (d.error)
                        throw new Error(String(d.error.message || 'Veo generation failed'));
                    const uri = String(d?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri || '');
                    if (!uri)
                        throw new Error('Veo completed but returned no video');
                    markSuccess('gemini-video', 200);
                    return { videoUri: uri, provider: 'gemini', model };
                }
                throw new Error('VIDEO_GENERATION_TIMEOUT');
            }
            catch (e) {
                markFailure('gemini-video', undefined, e);
            }
        }
        else
            state('gemini-video', false);
        // Fallback: Pollinations authenticated video endpoint. Accept both direct binary
        // video responses and JSON/text responses containing a generated video URL.
        const key = env('POLLINATIONS_API_KEY');
        if (key) {
            try {
                const base = env('POLLINATIONS_BASE_URL', 'https://gen.pollinations.ai').replace(/\/$/, '');
                const model = env('POLLINATIONS_VIDEO_MODEL', 'veo');
                const duration = Math.max(1, Math.min(15, Number(input.duration || 5)));
                const url = `${base}/video/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&duration=${encodeURIComponent(String(duration))}`;
                const response = await fetchWithTimeout(url, {
                    headers: { Authorization: `Bearer ${key}`, Accept: 'video/mp4,video/*,application/json,text/plain,*/*' }
                }, 300000);
                const contentType = response.headers.get('content-type') || '';
                if (response.ok) {
                    if (contentType.includes('video') || contentType === 'application/octet-stream') {
                        const buf = Buffer.from(await response.arrayBuffer());
                        if (buf.length > 10000) {
                            markSuccess('pollinations-video', response.status);
                            return { videoDataUrl: `data:${contentType.includes('video') ? contentType : 'video/mp4'};base64,${buf.toString('base64')}`, mimeType: contentType.includes('video') ? contentType : 'video/mp4', provider: 'pollinations', model };
                        }
                    }
                    const raw = await response.text();
                    let videoUrl = raw.trim();
                    try {
                        const parsed = JSON.parse(raw);
                        videoUrl = String(parsed?.url || parsed?.videoUrl || parsed?.video?.url || '').trim();
                    }
                    catch (_) { }
                    if (/^https?:\/\//i.test(videoUrl)) {
                        markSuccess('pollinations-video', response.status);
                        return { videoUri: videoUrl, provider: 'pollinations', model };
                    }
                }
                markFailure('pollinations-video', response.status, `Pollinations video generation failed (${response.status})`);
            }
            catch (e) {
                markFailure('pollinations-video', undefined, e);
            }
        }
        else
            state('pollinations-video', false);
        throw new Error('ALL_VIDEO_PROVIDERS_EXHAUSTED');
    }
}
export const videoProvider = new VideoProviderImpl();
