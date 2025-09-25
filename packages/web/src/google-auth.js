import { GOOGLE_CONFIG } from './config.js';

class GoogleAuth {
  constructor() {
    this.isInitialized = false;
    this.accessToken = null;
  }

  async init() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      // Load Google API library
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = async () => {
        try {
          await new Promise((resolve) => window.gapi.load('auth2:client', resolve));

          await window.gapi.client.init({
            clientId: GOOGLE_CONFIG.CLIENT_ID,
            scope: GOOGLE_CONFIG.SCOPE,
            discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS
          });

          this.isInitialized = true;
          resolve();
        } catch (error) {
          reject(new Error(`Failed to initialize Google API: ${error.message}`));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.head.appendChild(script);
    });
  }

  async signIn() {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn();
      const authResponse = user.getAuthResponse();

      this.accessToken = authResponse.access_token;

      // Store token with expiry info
      const tokenInfo = {
        access_token: authResponse.access_token,
        expires_at: Date.now() + (authResponse.expires_in * 1000),
        scope: authResponse.scope
      };

      localStorage.setItem('google_token', JSON.stringify(tokenInfo));

      return tokenInfo;
    } catch (error) {
      throw new Error(`Google sign-in failed: ${error.error || error.message}`);
    }
  }

  async getValidToken() {
    // Check stored token first
    const stored = localStorage.getItem('google_token');
    if (stored) {
      try {
        const tokenInfo = JSON.parse(stored);
        // Check if token is still valid (with 5 minute buffer)
        if (tokenInfo.expires_at > Date.now() + 300000) {
          this.accessToken = tokenInfo.access_token;
          return tokenInfo;
        }
      } catch (error) {
        console.warn('Invalid stored token:', error);
        localStorage.removeItem('google_token');
      }
    }

    // Need to sign in
    return await this.signIn();
  }

  async downloadFile(fileId) {
    const token = await this.getValidToken();

    try {
      // First get file metadata
      const metaResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size`,
        {
          headers: {
            'Authorization': `Bearer ${token.access_token}`
          }
        }
      );

      if (!metaResponse.ok) {
        throw new Error(`Failed to get file metadata: ${metaResponse.status}`);
      }

      const metadata = await metaResponse.json();

      // Download the actual file
      const fileResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${token.access_token}`
          }
        }
      );

      if (!fileResponse.ok) {
        throw new Error(`Failed to download file: ${fileResponse.status}`);
      }

      const blob = await fileResponse.blob();

      // Create a File object with the correct name and type
      return new File([blob], metadata.name, {
        type: metadata.mimeType || 'audio/mpeg'
      });

    } catch (error) {
      throw new Error(`Google Drive download failed: ${error.message}`);
    }
  }

  signOut() {
    if (this.isInitialized) {
      const authInstance = window.gapi.auth2.getAuthInstance();
      authInstance.signOut();
    }

    this.accessToken = null;
    localStorage.removeItem('google_token');
  }

  isSignedIn() {
    const stored = localStorage.getItem('google_token');
    if (!stored) return false;

    try {
      const tokenInfo = JSON.parse(stored);
      return tokenInfo.expires_at > Date.now();
    } catch {
      return false;
    }
  }
}

export default GoogleAuth;