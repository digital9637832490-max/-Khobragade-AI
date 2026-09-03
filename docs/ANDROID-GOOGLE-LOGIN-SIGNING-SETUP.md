# Khobragade AI — Permanent Android Signing + Google Login

The build workflow now uses one permanent release keystore and prints the exact Google OAuth SHA-1 on every successful build.

## Package name

`com.niteshkhobragade.creator_studio`

## Required GitHub Actions secrets

Repository → Settings → Secrets and variables → Actions:

- `GOOGLE_WEB_CLIENT_ID` — Google **Web application** OAuth Client ID.
- `ANDROID_KEYSTORE_BASE64` — Base64 text of your permanent `.jks` keystore.
- `ANDROID_KEYSTORE_PASSWORD` — Keystore password.
- `ANDROID_KEY_ALIAS` — Key alias inside the keystore.
- `ANDROID_KEY_PASSWORD` — Key password.

Do not commit the `.jks`, passwords, client secret, or Base64 keystore text to the repository.

## Required Render environment variable

- `GOOGLE_CLIENT_ID` = the same **Web application** OAuth Client ID used in `GOOGLE_WEB_CLIENT_ID`.

Do not use the Google Client Secret in the Android app.

## Google Android OAuth client

After the workflow succeeds, open the run summary. It prints:

- Package name
- Permanent signing SHA-1

Create/update the Google Auth Platform Android OAuth client with those exact two values.

The Android OAuth Client ID is not the value used for `GOOGLE_WEB_CLIENT_ID`; the Web Client ID is used by the app/backend ID-token flow.
