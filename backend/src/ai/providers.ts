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

/* =========================
   GEMINI TEXT PROVIDER
========================= */

class GeminiText implements TextProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY missing in Render Environment');
    }

    const topic =
      String(
        input.topic ||
        input.prompt ||
        input.text ||
        input.title ||
        'YouTube video'
      );

    const prompt = `
You are a professional YouTube SEO expert.

User request/topic:
"${topic}"

Generate useful YouTube content in the SAME LANGUAGE as the user's request.

Return ONLY valid JSON.
Do not use markdown.
Do not use code fences.

Use exactly this JSON structure:

{
  "titles": [
    "title 1",
    "title 2",
    "title 3",
    "title 4",
    "title 5"
  ],
  "description": "Professional YouTube description",
  "tags": [
    "tag1",
    "tag2",
    "tag3",
    "tag4",
    "tag5",
    "tag6",
    "tag7",
    "tag8",
    "tag9",
    "tag10"
  ],
  "hashtags": [
    "#hashtag1",
    "#hashtag2",
    "#hashtag3",
    "#hashtag4",
    "#hashtag5"
  ]
}

Rules:
- Titles should be clickable but not misleading.
- Keep titles suitable for YouTube.
- Description should be natural and SEO friendly.
- Tags should be relevant.
- Hashtags should be relevant.
- If the user writes Hindi, answer in Hindi.
- If the user writes Marathi, answer in Marathi.
- If the user writes English, answer in English.
`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
      {
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
          generationConfig: {
            temperature: 0.8,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    const data: any = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);

      throw new Error(
        data?.error?.message ||
        `Gemini API failed with status ${response.status}`
      );
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text || '')
        .join('')
        .trim();

    if (!text) {
      throw new Error('Gemini returned empty response');
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
    } catch (error) {
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

class MockImage implements ImageProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    return {
      previewUrl: null,
      message:
        'Configure AI_IMAGE_PROVIDER for real thumbnail generation',
      input,
    };
  }
}

/* =========================
   MOCK VIDEO PROVIDER
   Abhi unchanged
========================= */

class MockVideo implements VideoProvider {
  async generate(input: Record<string, unknown>): Promise<AiResult> {
    return {
      previewUrl: null,
      message:
        'Configure AI_VIDEO_PROVIDER for real rendering',
      input,
    };
  }
}

/* =========================
   PROVIDER EXPORTS
========================= */

export const textProvider: TextProvider =
  process.env.AI_TEXT_PROVIDER === 'gemini'
    ? new GeminiText()
    : new GeminiText();

export const imageProvider: ImageProvider =
  new MockImage();

export const videoProvider: VideoProvider =
  new MockVideo();
