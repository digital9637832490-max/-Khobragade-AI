REALTIME LIVE VOICE - ANDROID COMPILE SDK FIX
Build error fixed: flutter_pcm_sound / androidx.exifinterface compileSdk mismatch.

Changed:
- android-app/pubspec.yaml: flutter_pcm_sound updated.
- android-app/fix_plugin_compile_sdk.gradle: forces Android library plugins to compileSdk 36.

IMPORTANT FOR EXISTING GITHUB WORKFLOW:
After `flutter pub get` and BEFORE `flutter build apk`, add exactly:
echo "apply from: '../fix_plugin_compile_sdk.gradle'" >> android/build.gradle

No targetSdk/minSdk/layout/login/payment/voice behavior changes.
