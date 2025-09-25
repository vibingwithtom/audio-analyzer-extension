// Google OAuth configuration for web app
// Determine the current environment and redirect URI
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const REDIRECT_URI = isLocalhost
  ? 'http://localhost:3000'
  : 'https://vibingwithtom.github.io/audio-analyzer/';

export const GOOGLE_CONFIG = {
  CLIENT_ID: '708688597317-bmmrje6hqg8vo52nctned54m32q8uhsr.apps.googleusercontent.com',
  REDIRECT_URI,
  SCOPE: 'https://www.googleapis.com/auth/drive.readonly',
  DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
};