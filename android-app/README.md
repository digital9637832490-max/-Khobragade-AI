# Creator Studio Android app

The app UI includes only the useful bottom navigation: Khobragade AI and Home. Voice permissions are already declared.

## Development
```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api
```

## Release APK
Use the live HTTPS backend URL:
```bash
flutter pub get
flutter build apk --release --dart-define=API_BASE_URL=https://YOUR-RENDER-BACKEND.onrender.com/api
```
APK output: `build/app/outputs/flutter-apk/app-release.apk`

Before Play Store publishing, configure your release signing key and final package/application identity. Do not commit signing passwords or API secrets.
