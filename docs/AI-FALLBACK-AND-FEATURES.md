# Khobragade AI — Total AI / System Flow

## Locked target
The Android app keeps the approved UI and current realtime voice architecture. This patch fixes the confirmed failures without replacing the working voice flow.

## Primary capabilities
- General Chat / reasoning / coding / translation / writing
- Google Search grounding with source extraction
- Google Maps grounding when coordinates are available
- URL context and code execution through Gemini tools
- Image understanding and PDF/document understanding through Gemini inline file input
- Image generation and image-to-image editing through Gemini image generation
- Video generation through Veo
- Realtime voice with automatic activity detection and interruption handling
- Natural female persona wording (for example: करती हूँ / बताती हूँ / समझाती हूँ)
- Device model, Android version and battery context
- Current local date/time context from the Android device
- GPS coordinates and reverse-geocoded location context
- Chat attachment state reset for New Chat

## Automatic fallback
Text requests try Gemini first. When Gemini is temporarily unavailable, rate-limited, or quota-exhausted, the server can automatically try configured providers in `AI_FALLBACK_ORDER`.

Supported adapters in this release:
- OpenRouter
- Groq
- Cerebras
- Mistral
- DeepSeek
- Together
- xAI
- Pollinations

Search fallback adapters:
- Tavily
- Brave Search
- Serper

Media fallback:
- Pollinations image/audio/video adapters are used when configured and when the primary media provider returns quota/billing availability errors.

**Important:** no API provider can be truthfully treated as unlimited or permanently free. The app only uses a provider when its API key is configured and that provider accepts the request. If every configured provider is exhausted/unavailable, the app returns a final exhaustion message rather than falsely claiming unlimited service.

## Current 2026 provider notes
- Gemini current documentation supports Google Search grounding with current Gemini models and returns `groundingMetadata` containing web source chunks.
- Gemini 3.1 Flash Image is the current recommended image generation/editing family.
- Veo 3.1 is the current recommended Veo generation family.
- Hedra API is supported as a separately configurable media provider in the architecture; Hedra API requires a paid subscription/API credits, so it is not represented as a guaranteed free fallback.
