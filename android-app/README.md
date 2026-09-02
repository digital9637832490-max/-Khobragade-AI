# Khobragade AI Android App

The Android app uses the same backend as the website and supports user login/register, dashboard, Khobragade AI chat, microphone input, continuous voice mode, male/female voice selection, maintenance handling and the existing wallet/AI flow.

## Production API
Default API base:
`https://creator-studio-zzj1.onrender.com/api`

It can be overridden at build time with:
`--dart-define=API_BASE_URL=https://your-backend.example/api`

## APK build
The repository includes `.github/workflows/android-apk.yml`.
Open GitHub **Actions** → **Build Khobragade AI APK** → **Run workflow**. After the job succeeds, download the artifact named **Khobragade-AI-Android-APK**.

The workflow creates a clean Flutter Android platform project during CI, applies this app's Dart source, permissions and production API URL, then builds a release APK. This avoids relying on local Flutter/Gradle setup on the laptop.
