/* =========================
   GEMINI TEXT PROVIDER
========================= */
class GeminiText {
    async generate(input) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY missing in Render Environment');
        }
        const isChat = input.mode === 'chat';
        const topic = String(input.topic || input.prompt || input.text || input.title || input.message || 'YouTube video');
        const history = Array.isArray(input.history) ? input.history : [];
        const prompt = isChat ? `
You are Creator AI, a professional, friendly AI assistant for YouTube creators.
Reply directly to the user like a modern chat assistant. Never return JSON unless the user asks for JSON.
Understand Hindi, Hinglish, Marathi and English and normally answer in the same language as the user.
Help with titles, descriptions, tags, scripts, SEO, channel ideas, live streams, creator strategy and general questions.
Use readable formatting and concise useful answers.

Recent conversation:
${history.map((m) => `${m.role}: ${m.content}`).join('\n')}

User: ${String(input.message || topic)}
Assistant:` : `
You are a professional YouTube SEO expert.
User request/topic: "${topic}"
Generate useful YouTube content in the SAME LANGUAGE as the user's request.
Return ONLY valid JSON with this structure:
{"titles":["title 1","title 2","title 3","title 4","title 5"],"description":"Professional YouTube description","tags":["tag1","tag2","tag3","tag4","tag5","tag6","tag7","tag8","tag9","tag10"],"hashtags":["#hashtag1","#hashtag2","#hashtag3","#hashtag4","#hashtag5"]}
Do not use markdown or code fences. Titles must be clickable but not misleading. Description must be natural and SEO friendly.`;
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: prompt,
                            },
                        ],
                    },
                ],
                generationConfig: isChat ? { temperature: 0.8 } : { temperature: 0.8, responseMimeType: 'application/json' },
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('Gemini API error:', data);
            throw new Error(data?.error?.message ||
                `Gemini API failed with status ${response.status}`);
        }
        const text = data?.candidates?.[0]?.content?.parts
            ?.map((part) => part?.text || '')
            .join('')
            .trim();
        if (!text) {
            throw new Error('Gemini returned empty response');
        }
        if (isChat) {
            return { answer: text };
        }
        try {
            const result = JSON.parse(text);
            return {
                titles: Array.isArray(result.titles) ? result.titles : [],
                description: result.description || '',
                tags: Array.isArray(result.tags) ? result.tags : [],
                hashtags: Array.isArray(result.hashtags)
                    ? result.hashtags
                    : [],
            };
        }
        catch (error) {
            console.error('Gemini JSON parse error:', text);
            return {
                titles: [],
                description: text,
                tags: [],
                hashtags: [],
            };
        }
    }
}
/* =========================
   MOCK IMAGE PROVIDER
   Abhi unchanged
========================= */
class MockImage {
    async generate(input) {
        return {
            previewUrl: null,
            message: 'Configure AI_IMAGE_PROVIDER for real thumbnail generation',
            input,
        };
    }
}
/* =========================
   MOCK VIDEO PROVIDER
   Abhi unchanged
========================= */
class MockVideo {
    async generate(input) {
        return {
            previewUrl: null,
            message: 'Configure AI_VIDEO_PROVIDER for real rendering',
            input,
        };
    }
}
/* =========================
   PROVIDER EXPORTS
========================= */
export const textProvider = process.env.AI_TEXT_PROVIDER === 'gemini'
    ? new GeminiText()
    : new GeminiText();
export const imageProvider = new MockImage();
export const videoProvider = new MockVideo();
