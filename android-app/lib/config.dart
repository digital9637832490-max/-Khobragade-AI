class Config {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://creator-studio-zzj1.onrender.com/api',
  );
}
