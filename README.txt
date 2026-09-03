Khobragade AI - related files only

Changes:
1) + button now opens ChatGPT-style choices: Camera / Photos (Gallery) / Files.
2) Photo/file limit remains 10 MB.
3) Existing image understanding upload remains intact.
4) App-side AI job polling reduced from 1200ms to 350ms for faster visible replies.
5) Voice final-result pause/restart timings reduced for faster send/reply loop.
6) Existing image/video routing, auth, signing, dashboard and backend flows are untouched.

Files:
- android-app/lib/screens/chat.dart
- android-app/pubspec.yaml
