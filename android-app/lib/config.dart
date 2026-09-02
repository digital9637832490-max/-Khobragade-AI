class Config {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://creator-studio-zzj1.onrender.com/api',
  );

  // Google OAuth Web Client ID. Pass with --dart-define for release builds.
  static const googleWebClientId = String.fromEnvironment('GOOGLE_WEB_CLIENT_ID');
}
