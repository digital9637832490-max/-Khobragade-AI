FIX FOR THE EXACT RED BUILD IN THE SCREENSHOT

Cause:
- flutter_pcm_sound ^3.4.0 does not exist, so pub dependency resolution failed.
- The real 3.3.3 plugin compiles its Android library against API 33.

Fixed:
1. Restored flutter_pcm_sound ^3.3.3.
2. Workflow now patches ONLY flutter_pcm_sound 3.3.3 Android plugin to compileSdk 36 AFTER `flutter pub get` and BEFORE APK build.
3. App targetSdk/minSdk, UI, voice behavior, login, payment, logo, image/video are not changed.

Replace these 2 files and rerun GitHub Actions.
