Khobragade AI — VOICE TOTAL LOCK FIX

Only changed code file:
android-app/lib/screens/chat.dart

Locked working parts preserved:
- approved full-screen multicolor voice screen
- microphone speech recognition / system locale / dictation / partial results
- image/video code
- logo, login, dashboard, payment, routes and other files untouched

Exact response-cycle fix:
- AI/TTS no longer tries to restart the microphone while busy/voiceSending is still true
- after send + AI reply + TTS fully complete, flags are cleared first
- only then continuous mic is restarted
- errors also return safely to listening mode while voice mode remains open
