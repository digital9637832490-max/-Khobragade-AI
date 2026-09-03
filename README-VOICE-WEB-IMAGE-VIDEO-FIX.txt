Khobragade AI — Voice + Chrome Image/Video Fix

Base used:
-Khobragade-AI-main(6).zip only.

Changed files only:
1. android-app/lib/screens/chat.dart
   - Voice conversation button opens a full-screen ChatGPT-style voice UI.
   - Green / Yellow / Pink / Red / Blue / Black / White animated voice ring/wave.
   - Continuous listen -> auto-send -> AI speak -> listen flow retained/fixed.
   - Old persisted voiceMode=true state is reset on launch so the voice button cannot get stuck.
   - Better microphone status/error handling.
   - Image/video intent matching expanded.
   - Video jobs are allowed enough time to finish.

2. backend/src/ai/providers.ts
   - Image model default changed from retired preview to stable gemini-3.1-flash-image.

3. backend/src/routes/user.ts
   - Authenticated generated-video streaming endpoint added, so Google video URI can be opened through the app backend with the server-side API key.

4. website/app/chat/page.tsx
   - Expanded Hindi/Hinglish/English image/video intent matching.
   - Faster image polling and long-running video polling.
   - Generated video opens through authenticated backend streaming instead of exposing an unusable provider URI.
   - Clear image/video billing/access errors.

5. website/lib/api.ts
   - Authenticated blob fetch helper for generated video.

6. website/app/globals.css
   - Generated-video open button styling only.

Not changed:
- layout/navigation structure
- login/register
- wallet/payment
- Supabase/database schema
- admin panel
- existing branding/logo
- Android signing/workflow
- existing working routes unrelated to this fix

Validation performed:
- Dart bracket/structure balance check passed.
- TypeScript syntax reached type-resolution stage; local sandbox lacks project node_modules, so full npm/Next build cannot be run here.
