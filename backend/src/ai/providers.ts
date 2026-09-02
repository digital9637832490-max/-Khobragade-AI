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
    const topic = String(input.topic || input.prompt || input.text || input.title || input.message || 'YouTube video');
    const history = Array.isArray(input.history) ? input.history : [];
    const prompt = isChat ? `
You are Khobragade AI, a professional, friendly, general-purpose AI assistant created by Nitesh Khobragade.
You are NOT limited to YouTube. Help with A-to-Z general questions, explanations, writing, rewriting, translation, study, coding, business, planning, ideas, proposals, letters, applications, creator/YouTube work and everyday problem-solving.
Reply directly and naturally like a modern conversational assistant. Never return JSON unless the user asks for JSON.
Understand Hindi, Hinglish, Marathi and English and normally answer in the same language as the user.
If asked who created, made, developed or owns your creator identity, clearly answer that you were created by Nitesh Khobragade. Do not claim that Google or OpenAI created Khobragade AI; Gemini is only the underlying AI service/provider.
For dangerous, illegal, privacy-invasive or otherwise unsafe requests, give a safe helpful response instead of harmful instructions.
Use readable formatting and useful, context-aware answers. Do not force every answer to be about YouTube.

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

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: isChat ? { temperature: 0.8 } : { temperature: 0.8, responseMimeType: 'application/json' },
        }),
      }
    );

    const data: any = await response.json();
    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data?.error?.message || `Gemini API failed with status ${response.status}`);
    }

    const text = data?.candidates?.[0]?.content?.parts?.map((part:any)=>part?.text || '').join('').trim();
    if (!text) throw new Error('Gemini returned empty response');
    if (isChat) return { answer: text };

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

/* Image generation and Veo output generation are intentionally disabled
   on the Gemini free tier. They remain placeholders so users are not
   charged for a feature that the free provider cannot deliver. */
class MockImage implements ImageProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    throw new Error('AI image generation is not available on the Gemini free tier. No coins charged/refunded automatically.');
  }
}
class MockVideo implements VideoProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    throw new Error('AI video generation is not available on the Gemini free tier. No coins charged/refunded automatically.');
  }
}

export const textProvider: TextProvider = new GeminiText();
export const audioProvider: AudioProvider = new GeminiAudio();
export const imageProvider: ImageProvider = new MockImage();
export const videoProvider: VideoProvider = new MockVideo();
