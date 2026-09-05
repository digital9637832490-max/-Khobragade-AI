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
class GeminiText implements TextProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    const apiKey = geminiKey();
    const isChat = input.mode === 'chat';
    const chatModel = process.env.GEMINI_CHAT_MODEL || 'gemini-3.8-flash';
    const localDateTime = String(input.localDateTime || '').trim();
    const timeZone = String(input.timeZone || '').trim();
    const utcNow = String(input.utcNow || '').trim();
    const locationLabel = String(input.locationLabel || '').trim();
    const deviceManufacturer = String(input.deviceManufacturer || '').trim();
    const deviceModel = String(input.deviceModel || '').trim();
    const deviceBrand = String(input.deviceBrand || '').trim();
    const deviceAndroidVersion = String(input.deviceAndroidVersion || '').trim();
    const latitude = Number(input.latitude);
    const longitude = Number(input.longitude);
    const topic = String(input.topic || input.prompt || input.text || input.title || input.message || 'YouTube video');
    const history = Array.isArray(input.history) ? input.history : [];
    const voiceGender = String(input.voiceGender || 'female');
    const userMessage = String(input.message || topic);
    if (isChat) {
      const q=userMessage.toLowerCase().replace(/\s+/g,' ').trim();
      const timeQuestion=/(time|what time|current time|right now|abhi kitne|kitne baje|samay|समय|कितने बजे|अभी कितना|अभी कितने)/i.test(q);
      const deviceQuestion=/(mobile|phone|device|model|installed|install|मेरा मोबाइल|कौन सा मोबाइल|कौनसे मोबाइल|फोन मॉडल)/i.test(q);
      const locationQuestion=/(where am i|my location|current location|location|meri location|mera location|कहाँ हूँ|मेरी लोकेशन|वर्तमान लोकेशन)/i.test(q);
      const cityZones:Record<string,string>={india:'Asia/Kolkata',mumbai:'Asia/Kolkata',delhi:'Asia/Kolkata',pune:'Asia/Kolkata',nagpur:'Asia/Kolkata',dubai:'Asia/Dubai',london:'Europe/London',paris:'Europe/Paris',berlin:'Europe/Berlin',moscow:'Europe/Moscow',newyork:'America/New_York','new york':'America/New_York',chicago:'America/Chicago',denver:'America/Denver','los angeles':'America/Los_Angeles','san francisco':'America/Los_Angeles',toronto:'America/Toronto','mexico city':'America/Mexico_City','sao paulo':'America/Sao_Paulo',tokyo:'Asia/Tokyo',japan:'Asia/Tokyo',seoul:'Asia/Seoul',beijing:'Asia/Shanghai',china:'Asia/Shanghai',singapore:'Asia/Singapore',bangkok:'Asia/Bangkok',jakarta:'Asia/Jakarta',sydney:'Australia/Sydney',melbourne:'Australia/Melbourne',auckland:'Pacific/Auckland',cairo:'Africa/Cairo',johannesburg:'Africa/Johannesburg',nairobi:'Africa/Nairobi'};
      const clock=(zone:string,instant?:string)=>{try{const d=instant?new Date(instant):new Date();if(Number.isNaN(d.getTime()))return '';const parts=new Intl.DateTimeFormat('en-IN',{timeZone:zone,hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true,weekday:'long',day:'2-digit',month:'long',year:'numeric'}).formatToParts(d);const g=(t:string)=>parts.find(p=>p.type===t)?.value||'';return `${g('hour')}:${g('minute')}:${g('second')} ${g('dayPeriod')}, ${g('weekday')}, ${g('day')} ${g('month')} ${g('year')}`;}catch{return '';}};
      if(deviceQuestion&&deviceManufacturer&&deviceModel)return {answer:`यह ऐप आपके ${deviceManufacturer} ${deviceModel} मोबाइल पर installed है.`};
      if(locationQuestion&&locationLabel)return {answer:`आपकी current mobile location: ${locationLabel}.`};
      if(timeQuestion){let zone=timeZone||'UTC',place='आपकी current location',world=false;for(const [city,z] of Object.entries(cityZones)){if(q.includes(city)){zone=z;place=city;world=true;break;}}const exact=clock(zone,utcNow||localDateTime);if(exact)return {answer:world?`${place} में अभी ${exact} है.`:`आपके mobile के अनुसार अभी ${exact} है.`};if(localDateTime)return {answer:`आपके mobile के अनुसार अभी ${localDateTime} है.`};}
    }
    if (isChat && /(who (created|made|developed) you|your creator|kisne (banaya|banayi)|किसने (बनाया|बनाई)|creator.*(kaun|who)|निर्माता कौन)/i.test(userMessage)) {
      return { answer: 'Mujhe Nitesh Khobragade ne banaya hai.' };
    }
    const prompt = isChat ? `
You are ✨ Khobragade AI, a professional, friendly, general-purpose AI assistant.
Your creator's name is EXACTLY: Nitesh Khobragade. Whenever the creator is mentioned, write and speak exactly "Nitesh Khobragade" in Latin letters. Never translate, transliterate, misspell, shorten, duplicate, or change this name.
Your selected voice/persona gender for this reply is: ${voiceGender}. If it is female, use feminine first-person grammar in Hindi/Hinglish/Marathi (for example: "करती हूँ", "बताती हूँ", "समझाती हूँ", "कर सकती हूँ") and NEVER masculine self-forms such as "करता हूँ". If it is male, use masculine first-person grammar ("करता हूँ", "बताता हूँ", "समझाता हूँ"). Keep this consistent throughout the entire reply.
You were created by Nitesh Khobragade.
Current user date/time context: ${localDateTime || 'not supplied'}. Current UTC timestamp: ${utcNow || 'not supplied'}. User timezone: ${timeZone || 'not supplied'}. User location: ${locationLabel || 'not reverse-geocoded'}; Actual Android device: ${deviceManufacturer || 'unknown'} ${deviceModel || 'unknown'} (brand ${deviceBrand || 'unknown'}, Android ${deviceAndroidVersion || 'unknown'}). User location coordinates: ${Number.isFinite(latitude) && Number.isFinite(longitude) ? `${latitude}, ${longitude}` : 'not supplied'}.
When the user asks the current time/date, use the deterministic current-time answer supplied by the application when present; do not guess or use the server timezone. For another city/country, use Google Search grounding when the city is not in the deterministic timezone map. When the user asks their current location and a reverse-geocoded location label is supplied, use that exact label; if only coordinates are supplied, use Google Maps grounding. Never invent a location. When asked which phone/mobile/device this app is installed on, answer from Actual Android device fields exactly and never infer a model.
You are NOT limited to YouTube. Help with A-to-Z general questions, explanations, writing, rewriting, translation, study, coding, business, planning, ideas, proposals, letters, applications, creator/YouTube work and everyday problem-solving.
Reply directly and naturally like a modern conversational assistant. Never return JSON unless the user asks for JSON.
Understand Hindi, Hinglish, Marathi and English and normally answer in the same language as the user.
If asked who created, made, developed or owns your creator identity, clearly answer that you were created by Nitesh Khobragade. Do not claim that Google or OpenAI created Khobragade AI; Gemini is only the underlying AI service/provider.
For dangerous, illegal, privacy-invasive or otherwise unsafe requests, give a safe helpful response instead of harmful instructions.
Use readable formatting and useful, context-aware answers. Do not force every answer to be about YouTube.
If the user asks to create/generate/make an image or video, do not say you are a text-only AI. The application has dedicated image/video generation tools and will route clear media-generation requests to them.

Recent conversation:
${history.map((m:any)=>`${m.role}: ${m.content}`).join('\n')}

User: ${String(input.message || topic)}
Assistant:` : `
You are a professional YouTube SEO expert.
User request/topic: "${topic}"
Generate useful YouTube content in the SAME LANGUAGE as the user's request.
Return ONLY valid JSON with this structure:
{"titles":["title 1","title 2","title 3","title 4","title 5"],"description":"Professional YouTube description","tags":["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],"hashtags":["#hashtag1","#hashtag2","#hashtag3","#hashtag4","#hashtag5"]}
Do not use markdown or code fences. Titles must be clickable but not misleading. Description must be natural and SEO friendly.`;

    const tools = isChat ? [{ googleSearch: {} }, { urlContext: {} }, { codeExecution: {} }, ...(Number.isFinite(latitude) && Number.isFinite(longitude) ? [{ googleMaps: {} }] : [])] : undefined;
    const toolConfig = isChat && Number.isFinite(latitude) && Number.isFinite(longitude) ? { retrievalConfig: { latLng: { latitude, longitude } } } : undefined;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${chatModel}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [
            { text: prompt },
            ...(isChat && input.attachmentData && input.attachmentMime ? [{ inlineData: { mimeType: String(input.attachmentMime), data: String(input.attachmentData) } }] : [])
          ] }],
          ...(tools ? { tools } : {}),
          ...(toolConfig ? { toolConfig } : {}),
          generationConfig: isChat ? {} : { temperature: 0.8, responseMimeType: 'application/json' },
        }),
      }
    );

    const data: any = await response.json();
    if (!response.ok) {
      console.error('Gemini API error:', data);
      const raw=JSON.stringify(data);
      const msg=String(data?.error?.message || '');
      if(response.status===429 || /RESOURCE_EXHAUSTED|quota/i.test(raw)){
        if(/PerDay|per day|daily/i.test(raw)) throw new Error('GEMINI_DAILY_QUOTA');
        throw new Error('GEMINI_RATE_LIMIT');
      }
      throw new Error(msg || `Gemini API failed with status ${response.status}`);
    }

    const text = data?.candidates?.[0]?.content?.parts?.map((part:any)=>part?.text || '').join('').trim();
    if (!text) throw new Error('Gemini returned empty response');
    if (isChat) {
      let answer = text
        .replace(/नितेश\s+खोबरागड़े|नितेश\s+खोब्रागड़े|नितेश\s+खोबरागडे/gi, 'Nitesh Khobragade');
      if (voiceGender === 'female') {
        answer = answer
          .replace(/करता हूँ/g, 'करती हूँ').replace(/करता हूं/g, 'करती हूं')
          .replace(/बताता हूँ/g, 'बताती हूँ').replace(/बताता हूं/g, 'बताती हूं')
          .replace(/समझाता हूँ/g, 'समझाती हूँ').replace(/समझाता हूं/g, 'समझाती हूं')
          .replace(/सकता हूँ/g, 'सकती हूँ').replace(/सकता हूं/g, 'सकती हूं');
      }
      const grounding:any=data?.candidates?.[0]?.groundingMetadata;
      const chunks=Array.isArray(grounding?.groundingChunks)?grounding.groundingChunks:[];
      const sources=chunks.map((c:any)=>c?.web?.uri?{title:String(c.web.title||c.web.uri),url:String(c.web.uri)}:null).filter(Boolean);
      if (sources.length) { const unique=sources.filter((v:any,i:number,a:any[])=>a.findIndex((x:any)=>x.url===v.url)===i).slice(0,8); return { answer: answer + '\n\n[[SOURCES]]\n' + unique.map((x:any)=>`• ${x.title} — ${x.url}`).join('\n'), sources: unique }; } return { answer };
    }

    try {
      const result = JSON.parse(text);
      return {
        titles: Array.isArray(result.titles) ? result.titles : [],
        description: result.description || '',
        tags: Array.isArray(result.tags) ? result.tags : [],
        hashtags: Array.isArray(result.hashtags) ? result.hashtags : [],
      };
    } catch {
      return { titles: [], description: text, tags: [], hashtags: [] };
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
    const apiKey = geminiKey();
    const prompt = String(input.prompt || input.topic || input.title || input.text || '').trim();
    if (!prompt) throw new Error('Image prompt is required');
    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
      body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseModalities:['TEXT','IMAGE']}})
    });
    const data:any=await response.json();
    if(!response.ok){
      const msg=String(data?.error?.message||'');
      if(response.status===429) throw new Error('GEMINI_RATE_LIMIT');
      if(/billing|paid|quota|not available/i.test(msg)) throw new Error('IMAGE_PROVIDER_BILLING_REQUIRED');
      throw new Error(msg||`Gemini image generation failed (${response.status})`);
    }
    const parts=data?.candidates?.[0]?.content?.parts||[];
    const image=parts.find((x:any)=>x?.inlineData?.data);
    if(!image?.inlineData?.data) throw new Error('Gemini returned no image');
    const mime=image.inlineData.mimeType||'image/png';
    return {imageDataUrl:`data:${mime};base64,${image.inlineData.data}`,mimeType:mime,provider:'gemini',model};
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
