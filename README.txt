VOICE FINAL DIRECT RESPONSE FIX
- Voice UI and working speech recognition are preserved.
- Voice conversation no longer waits for the background ai_jobs worker.
- New authenticated /api/ai/voice-chat calls the existing Gemini text provider directly.
- Reply is spoken with Android TTS at full volume, then microphone reopens.
- No logo/layout/colors/login/payment/image/video/dashboard changes.
Changed code files only:
1) android-app/lib/screens/chat.dart
2) backend/src/routes/user.ts
IMPORTANT: deploy backend and build APK.
