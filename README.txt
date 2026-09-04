Khobragade AI REALTIME LIVE VOICE ENGINE

This replaces the full-screen Voice Mode engine with Gemini Live API native audio.
- Continuous microphone PCM stream (16kHz)
- Native Gemini audio response (24kHz)
- Server VAD and interruption/barge-in
- When user speaks during AI audio, queued playback is cleared
- Input/output transcription shown on existing multicolor screen
- No HTTP ai_jobs/TTS loop is used by full-screen Voice Mode
- Existing small composer mic/text chat remains untouched

Changed code files: chat.dart, live_voice.dart, server.ts
Dependency files: android pubspec.yaml, backend package.json
Deploy backend after upload, then build APK.
