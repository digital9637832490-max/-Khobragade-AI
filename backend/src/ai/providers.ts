export type AiResult = Record<string, unknown>;

export interface TextProvider {
  generate(input: Record<string, unknown>): Promise<AiResult>;
}

export interface ImageProvider {
  generate(input: Record<string, unknown>): Promise<AiResult>;
}

export interface VideoProvider {
  generate(input: Record<string, unknown>): Promise<AiResult>;
}

export interface AudioProvider {
  generate(input: Record<string, unknown>): Promise<AiResult>;
}

function geminiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing in Render Environment');
  return apiKey;
}

/* =========================
   GEMINI TEXT PROVIDER
   Chat + Title + Description + Tags
========================= */
async function fetchWebContext(query: string): Promise<{text: string; sources: Array<{title:string;url:string}>}> {
  const q = query.trim();
  if (!q) return {text:'', sources:[]};
  const sources:Array<{title:string;url:string}> = [];
  const blocks:string[] = [];
  const add=(title:string,url:string,snippet:string)=>{ if(url && !sources.some(s=>s.url===url)){sources.push({title:title||url,url}); blocks.push(`- ${title||url}: ${snippet}`);} };
  const newsLike=/(news|latest|today|breaking|headline|खबर|न्यूज़|ताज़ा|आज की|ब्रेकिंग)/i.test(q);
  try {
    if (newsLike) {
      const u=`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
      const r=await fetch(u,{headers:{'User-Agent':'KhobragadeAI/1.0'}});
      if(r.ok){
        const xml=await r.text();
        const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0,8);
        for(const m of items){
          const item=m[1];
          const title=(item.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'').replace(/<!\[CDATA\[|\]\]>/g,'').trim();
          const link=(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1]||'').trim();
          const desc=(item.match(/<description>([\s\S]*?)<\/description>/i)?.[1]||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
          if(title && link) add(title,link,desc.slice(0,500));
        }
      }
    }
  } catch(e){ console.warn('Google News RSS fallback failed',e); }

  // Keyless generic web-search fallback. This is deliberately used only as a fallback
  // so provider keys / Gemini grounding remain the preferred path.
  try {
    if(!newsLike && sources.length===0){
      const u=`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
      const r=await fetch(u,{headers:{'User-Agent':'KhobragadeAI/1.0'}});
      if(r.ok){
        const html=await r.text();
        const matches=[...html.matchAll(/<a[^>]+class=[\"']result__a[\"'][^>]+href=[\"']([^\"']+)[\"'][^>]*>([\s\S]*?)<\/a>/gi)].slice(0,8);
        for(const m of matches){
          const url=String(m[1]||'').replace(/&amp;/g,'&');
          const title=String(m[2]||'').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').trim();
          if(url && title) add(title,url,'Web search result');
        }
      }
    }
  } catch(e){ console.warn('DuckDuckGo fallback failed',e); }

  try {
    const tavily=process.env.TAVILY_API_KEY;
    if(tavily){
      const r=await fetch('https://api.tavily.com/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:tavily,query:q,max_results:5,search_depth:'basic',include_answer:false})});
      if(r.ok){const d:any=await r.json();for(const x of (d.results||[]))add(String(x.title||''),String(x.url||''),String(x.content||'').slice(0,700));}
    }
  } catch(e){ console.warn('Tavily fallback failed',e); }

  try {
    const brave=process.env.BRAVE_SEARCH_API_KEY;
    if(brave && sources.length<5){
      const u=`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5&country=IN&search_lang=en`;
      const r=await fetch(u,{headers:{Accept:'application/json','X-Subscription-Token':brave}});
      if(r.ok){const d:any=await r.json();for(const x of (d.web?.results||[]))add(String(x.title||''),String(x.url||''),String(x.description||'').slice(0,700));}
    }
  } catch(e){ console.warn('Brave fallback failed',e); }

  try {
    const serper=process.env.SERPER_API_KEY;
    if(serper && sources.length<5){
      const r=await fetch('https://google.serper.dev/search',{method:'POST',headers:{'Content-Type':'application/json','X-API-KEY':serper},body:JSON.stringify({q,gl:'in',hl:'en',num:5})});
      if(r.ok){const d:any=await r.json();for(const x of (d.organic||[]))add(String(x.title||''),String(x.link||''),String(x.snippet||'').slice(0,700));}
    }
  } catch(e){ console.warn('Serper fallback failed',e); }
  return {text:blocks.slice(0,10).join('\n'),sources:sources.slice(0,10)};
}

function shouldSearch(message:string){return /(search|google|web|internet|latest|today|current|news|headline|source|sources|खोज|सर्च|वेब|इंटरनेट|ताज़ा|आज|समाचार|खबर|न्यूज़|सोर्स)/i.test(message);}

function normalizeFemale(answer:string){
  return answer.replace(/नितेश\s+खोबरागड़े|नितेश\s+खोब्रागड़े|नितेश\s+खोबरागडे/gi,'Nitesh Khobragade')
    .replace(/करता हूँ/g,'करती हूँ').replace(/करता हूं/g,'करती हूं')
    .replace(/बताता हूँ/g,'बताती हूँ').replace(/बताता हूं/g,'बताती हूं')
    .replace(/समझाता हूँ/g,'समझाती हूँ').replace(/समझाता हूं/g,'समझाती हूं')
    .replace(/सकता हूँ/g,'सकती हूँ').replace(/सकता हूं/g,'सकती हूं');
}

async function openAiCompatibleFallback(input:Record<string,unknown>, system:string, user:string):Promise<string>{
  const providers:Array<{name:string;url:string;key:string;model:string}> = [
    {name:'openrouter',url:'https://openrouter.ai/api/v1/chat/completions',key:process.env.OPENROUTER_API_KEY||'',model:process.env.OPENROUTER_CHAT_MODEL||'openai/gpt-oss-20b:free'},
    {name:'groq',url:'https://api.groq.com/openai/v1/chat/completions',key:process.env.GROQ_API_KEY||'',model:process.env.GROQ_CHAT_MODEL||'llama-3.3-70b-versatile'},
    {name:'cerebras',url:'https://api.cerebras.ai/v1/chat/completions',key:process.env.CEREBRAS_API_KEY||'',model:process.env.CEREBRAS_CHAT_MODEL||'llama-3.3-70b'},
    {name:'pollinations',url:'https://gen.pollinations.ai/v1/chat/completions',key:process.env.POLLINATIONS_API_KEY||'',model:process.env.POLLINATIONS_TEXT_MODEL||'openai'},
  ];
  for(const p of providers){
    if(!p.key && p.name!=='pollinations') continue;
    try{
      const headers:any={'Content-Type':'application/json'};
      if(p.key) headers.Authorization=`Bearer ${p.key}`;
      const r=await fetch(p.url,{method:'POST',headers,body:JSON.stringify({model:p.model,messages:[{role:'system',content:system},{role:'user',content:user}],temperature:0.4})});
      const d:any=await r.json();
      if(r.ok){const t=String(d?.choices?.[0]?.message?.content||'').trim();if(t)return t;}
      console.warn(`${p.name} fallback failed`,r.status,d?.error?.message||d?.error||'');
    }catch(e){console.warn(`${p.name} fallback error`,e);}
  }
  // Legacy public endpoint is retained only as a last-resort compatibility path.
  try{
    const url=`https://text.pollinations.ai/${encodeURIComponent(user.slice(0,12000))}?model=openai`;
    const r=await fetch(url,{headers:{'User-Agent':'KhobragadeAI/1.0'}});
    if(r.ok){const t=(await r.text()).trim();if(t)return t;}
  }catch(e){console.warn('Legacy text fallback failed',e);}
  throw new Error('ALL_AI_PROVIDERS_EXHAUSTED');
}

class GeminiText implements TextProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '';
    const isChat = input.mode === 'chat';
    const chatModel = process.env.GEMINI_CHAT_MODEL || 'gemini-3.5-flash';
    const localDateTime = String(input.localDateTime || '').trim();
    const timeZone = String(input.timeZone || '').trim();
    const latitude = Number(input.latitude);
    const longitude = Number(input.longitude);
    const locationName = String(input.locationName || '').trim();
    const topic = String(input.topic || input.prompt || input.text || input.title || input.message || 'YouTube video');
    const history = Array.isArray(input.history) ? input.history : [];
    const voiceGender = String(input.voiceGender || 'female');
    const userMessage = String(input.message || topic);
    if (isChat && /(who (created|made|developed) you|your creator|kisne (banaya|banayi)|किसने (बनाया|बनाई)|creator.*(kaun|who)|निर्माता कौन)/i.test(userMessage)) return {answer:'Mujhe Nitesh Khobragade ne banaya hai.'};

    const searchRequested=shouldSearch(userMessage);
    let external={text:'',sources:[] as Array<{title:string;url:string}>};
    if(searchRequested) external=await fetchWebContext(userMessage);
    const prompt = isChat ? `
You are ✨ Khobragade AI, a professional, friendly, general-purpose AI assistant created by Nitesh Khobragade.
Your creator's name is EXACTLY: Nitesh Khobragade. Never translate or alter it.
Your selected voice/persona gender is ${voiceGender}. If female, use feminine first-person Hindi/Hinglish/Marathi grammar such as "करती हूँ", "बताती हूँ", "समझाती हूँ", "कर सकती हूँ" and never masculine self-forms. If male, use masculine forms. Keep this consistent.
You are a complete conversational assistant, not a text-only AI. You can answer general questions, code, translate, understand attachments, search the web, summarize news, generate images/videos through application tools, and use location context when supplied.
Current user date/time: ${localDateTime || 'not supplied'}
User timezone: ${timeZone || 'not supplied'}
User location: ${locationName || (Number.isFinite(latitude)&&Number.isFinite(longitude)?`${latitude}, ${longitude}`:'not supplied')}
When asked current time/date, use supplied local context exactly. When asked current location, never invent it.
If current/news/search information is requested, prioritize the supplied web-search context and clearly identify sources. Never claim a web search happened if it did not.
If the user asks to create an image or video, do not say you are a text-only AI; the app has dedicated generation tools.
Recent conversation:
${history.map((m:any)=>`${m.role}: ${m.content}`).join('\n')}
External web context (may be empty):
${external.text || 'none'}
User: ${userMessage}
Assistant:` : `
You are a professional YouTube SEO expert. User request/topic: "${topic}". Generate useful YouTube content in the SAME LANGUAGE as the user's request. Return ONLY valid JSON with this structure: {"titles":["title 1","title 2","title 3","title 4","title 5"],"description":"Professional YouTube description","tags":["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],"hashtags":["#hashtag1","#hashtag2","#hashtag3","#hashtag4","#hashtag5"]}. Do not use markdown or code fences.`;

    const tools = isChat ? [{googleSearch:{}}, ...(Number.isFinite(latitude)&&Number.isFinite(longitude)?[{googleMaps:{}}]:[])] : undefined;
    const toolConfig = isChat && Number.isFinite(latitude)&&Number.isFinite(longitude) ? {retrievalConfig:{latLng:{latitude,longitude}}} : undefined;
    try {
      if(!apiKey) throw new Error('GEMINI_API_KEY missing');
      const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${chatModel}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt},...(isChat&&input.attachmentData&&input.attachmentMime?[{inlineData:{mimeType:String(input.attachmentMime),data:String(input.attachmentData)}}]:[])]}],...(tools?{tools}:{}),...(toolConfig?{toolConfig}:{}),generationConfig:isChat?{}:{temperature:.8,responseMimeType:'application/json'}})});
      const data:any=await response.json();
      if(!response.ok){const raw=JSON.stringify(data);if(response.status===429||/RESOURCE_EXHAUSTED|quota/i.test(raw)){throw new Error(/PerDay|per day|daily/i.test(raw)?'GEMINI_DAILY_QUOTA':'GEMINI_RATE_LIMIT');}throw new Error(String(data?.error?.message||`Gemini API failed with status ${response.status}`));}
      const text=String(data?.candidates?.[0]?.content?.parts?.map((part:any)=>part?.text||'').join('').trim()||'');
      if(!text)throw new Error('Gemini returned empty response');
      if(isChat){
        let answer=voiceGender==='female'?normalizeFemale(text):text.replace(/नितेश\s+खोबरागड़े|नितेश\s+खोब्रागड़े|नितेश\s+खोबरागडे/gi,'Nitesh Khobragade');
        const grounding=data?.groundingMetadata?.groundingChunks||[];
        const grounded:Array<{title:string;url:string}> = [];
        for(const g of grounding){const w=g?.web;if(w?.uri)grounded.push({title:String(w.title||w.uri),url:String(w.uri)});}
        const all=[...grounded,...external.sources].filter((x,i,a)=>x.url&&a.findIndex(y=>y.url===x.url)===i).slice(0,8);
        if(all.length && searchRequested){answer += `\n\nSources:\n${all.map(x=>`- ${x.title}: ${x.url}`).join('\n')}`;}
        return {answer,sources:all,webSearched:searchRequested};
      }
      try{const result=JSON.parse(text);return{titles:Array.isArray(result.titles)?result.titles:[],description:result.description||'',tags:Array.isArray(result.tags)?result.tags:[],hashtags:Array.isArray(result.hashtags)?result.hashtags:[]};}catch{return{titles:[],description:text,tags:[],hashtags:[]};}
    } catch(primaryError:any) {
      if(!isChat || input.attachmentData){throw primaryError;}
      const system=`You are Khobragade AI, created by Nitesh Khobragade. Selected voice gender: ${voiceGender}. Use feminine first-person grammar if female. Answer in the user's language. Do not claim you are text-only. For current/search/news requests use only supplied web context and identify sources. Web context:\n${external.text||'none'}`;
      const answer=await openAiCompatibleFallback(input,system,userMessage);
      const normalized=voiceGender==='female'?normalizeFemale(answer):answer;
      const suffix=external.sources.length&&searchRequested?`\n\nSources:\n${external.sources.map(x=>`- ${x.title}: ${x.url}`).join('\n')}`:'';
      return {answer:normalized+suffix,sources:external.sources,webSearched:searchRequested,fallback:true};
    }
  }
}

/* =========================
   GEMINI FREE-TIER TTS
   Returns a playable WAV data URL.
========================= */
function pcmToWavBase64(pcmBase64: string, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
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

class GeminiAudio implements AudioProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    const apiKey = geminiKey();
    const text = String(input.text || input.message || input.script || '').trim();
    if (!text) throw new Error('Voice-over text is required');
    if (text.length > 12000) throw new Error('Voice-over text is too long');
    const voice = String(input.voice || 'Kore');
    const style = String(input.style || 'natural');
    const speechPrompt = `Synthesize speech in a ${style} style. Speak the following text naturally. Do not add or remove words.\n\nTranscript:\n${text}`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: speechPrompt }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice },
              },
            },
          },
        }),
      }
    );

    const data: any = await response.json();
    if (!response.ok) {
      console.error('Gemini TTS error:', data);
      throw new Error(data?.error?.message || `Gemini TTS failed with status ${response.status}`);
    }

    const part = data?.candidates?.[0]?.content?.parts?.find((p:any)=>p?.inlineData?.data);
    const pcmBase64 = part?.inlineData?.data;
    if (!pcmBase64) throw new Error('Gemini TTS returned no audio. Please try again.');
    const wavBase64 = pcmToWavBase64(pcmBase64);
    return {
      audioDataUrl: `data:audio/wav;base64,${wavBase64}`,
      mimeType: 'audio/wav',
      voice,
      provider: 'gemini',
      model: 'gemini-3.1-flash-tts-preview',
    };
  }
}

/* =========================
   GEMINI IMAGE + VEO VIDEO
   These are real providers. Google may require billing/model access for
   image/video generation even when text chat is on the free tier.
========================= */
class GeminiImage implements ImageProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    const prompt=String(input.prompt||input.topic||input.title||input.text||'').trim();
    if(!prompt)throw new Error('Image prompt is required');
    const apiKey=process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '';
    const model=process.env.GEMINI_IMAGE_MODEL||'gemini-3.1-flash-image';
    try{
      if(!apiKey) throw new Error('GEMINI_API_KEY missing');
      const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseModalities:['TEXT','IMAGE']}})});
      const data:any=await response.json();
      if(!response.ok)throw new Error(String(data?.error?.message||`Gemini image generation failed (${response.status})`));
      const image=(data?.candidates?.[0]?.content?.parts||[]).find((x:any)=>x?.inlineData?.data);
      if(!image?.inlineData?.data)throw new Error('Gemini returned no image');
      const mime=image.inlineData.mimeType||'image/png';
      return {imageDataUrl:`data:${mime};base64,${image.inlineData.data}`,mimeType:mime,provider:'gemini',model};
    }catch(primary){
      const hedra=process.env.HEDRA_API_KEY;
      if(hedra){
        try{
          const r=await fetch(`https://api.hedra.com/v3/models/${process.env.HEDRA_IMAGE_MODEL||'nano-banana-2'}`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Key ${hedra}`},body:JSON.stringify({input:{prompt,num_outputs:1,aspect_ratio:String(input.aspectRatio||'16:9'),resolution:String(input.resolution||'1K')}})});
          const d:any=await r.json();
          if(r.ok){const uri=String(d?.image_url||d?.result?.image_url||d?.output?.url||d?.result?.url||'');if(uri)return {imageUrl:uri,provider:'hedra',model:process.env.HEDRA_IMAGE_MODEL||'nano-banana-2'};}
        }catch(e){console.warn('Hedra image fallback failed',e);}
      }
      try{
        const key=process.env.POLLINATIONS_API_KEY||'';
        const model=process.env.POLLINATIONS_IMAGE_MODEL||'flux';
        const base=key?'https://gen.pollinations.ai/image/':'https://image.pollinations.ai/prompt/';
        const url=`${base}${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&width=1024&height=1024`;
        const r=await fetch(url,{headers:key?{Authorization:`Bearer ${key}`}:{} });
        if(r.ok){const mime=r.headers.get('content-type')||'image/jpeg';const buf=Buffer.from(await r.arrayBuffer());if(buf.length>1000)return {imageDataUrl:`data:${mime};base64,${buf.toString('base64')}`,mimeType:mime,provider:'pollinations',model};}
      }catch(e){console.warn('Pollinations image fallback failed',e);}
      throw new Error('ALL_IMAGE_PROVIDERS_EXHAUSTED');
    }
  }
}

class GeminiVideo implements VideoProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    const apiKey=geminiKey();
    const prompt=String(input.prompt||input.text||input.title||input.voice||'').trim() ||
      `Create a ${String(input.style||'cinematic')} video. ${String(input.transition||'')} ${String(input.photos||'')}`;
    const model=process.env.GEMINI_VIDEO_MODEL||'veo-3.1-generate-preview';
    const base='https://generativelanguage.googleapis.com/v1beta';
    const imageDataUrl = String(input.imageDataUrl || '').trim();
    let imagePart: any = undefined;
    if (imageDataUrl.startsWith('data:image/')) {
      const comma = imageDataUrl.indexOf(',');
      if (comma > 0) {
        const mimeType = imageDataUrl.slice(5, imageDataUrl.indexOf(';', 5) > 0 ? imageDataUrl.indexOf(';', 5) : comma);
        const data = imageDataUrl.slice(comma + 1);
        if (mimeType && data) imagePart = { inlineData: { mimeType, data } };
      }
    }
    const instance: any = { prompt };
    if (imagePart) instance.image = imagePart;
    const first=await fetch(`${base}/models/${model}:predictLongRunning`,{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
      body:JSON.stringify({instances:[instance],parameters:{numberOfVideos:1,resolution:'720p',aspectRatio:'16:9'}})
    });
    const created:any=await first.json();
    if(!first.ok){
      const msg=String(created?.error?.message||'');
      if(first.status===429) throw new Error('GEMINI_RATE_LIMIT');
      if(/billing|paid|quota|not available/i.test(msg)) throw new Error('VIDEO_PROVIDER_BILLING_REQUIRED');
      throw new Error(msg||`Veo generation failed (${first.status})`);
    }
    const operation=created?.name;
    if(!operation) throw new Error('Veo did not return an operation id');
    for(let i=0;i<90;i++){
      await new Promise(r=>setTimeout(r,10000));
      const r=await fetch(`${base}/${operation}`,{headers:{'x-goog-api-key':apiKey}});
      const d:any=await r.json();
      if(!r.ok) throw new Error(d?.error?.message||'Veo status check failed');
      if(d.done){
        if(d.error) throw new Error(d.error.message||'Veo generation failed');
        const uri=d?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        if(!uri) throw new Error('Veo completed but returned no video');
        return {videoUri:uri,provider:'gemini',model};
      }
    }
    throw new Error('Video generation timed out. Please try again.');
  }
}

export const textProvider: TextProvider = new GeminiText();
export const audioProvider: AudioProvider = new GeminiAudio();
export const imageProvider: ImageProvider = new GeminiImage();
export const videoProvider: VideoProvider = new GeminiVideo();
