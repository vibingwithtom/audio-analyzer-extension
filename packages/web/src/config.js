// OAuth configuration for web app
// Determine the current environment and redirect URI
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isBeta = window.location.pathname.startsWith('/beta');

const REDIRECT_URI = isLocalhost
  ? 'http://localhost:3000'
  : isBeta
    ? 'https://audio-analyzer.tinytech.site/beta'
    : 'https://audio-analyzer.tinytech.site';

export const GOOGLE_CONFIG = {
  CLIENT_ID: '708688597317-bmmrje6hqg8vo52nctned54m32q8uhsr.apps.googleusercontent.com',
  REDIRECT_URI,
  SCOPE: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
  // API_KEY is optional but required for Google Picker
  // Get one at: https://console.cloud.google.com/apis/credentials
  API_KEY: '', // TODO: Add API key to enable Google Picker
};

export const BOX_CONFIG = {
  CLIENT_ID: '0y78slky3xitt421wmoa0fjdz6fi14hn',
  REDIRECT_URI,
  AUTHORIZATION_URL: 'https://account.box.com/api/oauth2/authorize',
  TOKEN_URL: 'https://api.box.com/oauth2/token',
  API_URL: 'https://api.box.com/2.0',
  PROXY_URL: 'https://box-proxy-708688597317.us-central1.run.app',
};