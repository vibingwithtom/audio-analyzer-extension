import { GOOGLE_CONFIG } from './config.js';

class GoogleAuth {
  constructor() {
    this.isInitialized = false;
    this.accessToken = null;
    this.tokenClient = null;
  }

  async init() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      // Load Google API library first
      this.loadGoogleAPI().then(() => {
        this.initializeGIS().then(resolve).catch(reject);
      }).catch(reject);
    });
  }

  async loadGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API script'));
      document.head.appendChild(script);
    });
  }

  async initializeGIS() {
    return new Promise((resolve, reject) => {
      // Load Google Identity Services
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = () => {
        this.setupGIS().then(resolve).catch(reject);
      };
      gisScript.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.head.appendChild(gisScript);
    });
  }

  async setupGIS() {
    return new Promise((resolve, reject) => {
      const loadTimeout = setTimeout(() => {
        reject(new Error('Google API setup timeout'));
      }, 10000);

      // Initialize gapi client
      window.gapi.load('client', async () => {
        try {
          clearTimeout(loadTimeout);

          await window.gapi.client.init({
            discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS
          });

          // Initialize Google Identity Services token client
          this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CONFIG.CLIENT_ID,
            scope: GOOGLE_CONFIG.SCOPE,
            callback: (response) => {
              if (response.error) {
                console.error('Token response error:', response);
                return;
              }
              this.accessToken = response.access_token;
              // Store token info
              const tokenInfo = {
                access_token: response.access_token,
                expires_at: Date.now() + (response.expires_in * 1000),
                scope: response.scope
              };
              localStorage.setItem('google_token', JSON.stringify(tokenInfo));
            }
          });

          this.isInitialized = true;
          resolve();
        } catch (error) {
          clearTimeout(loadTimeout);
          console.error('Google API setup error:', error);
          let errorMsg = 'Unknown setup error';
          if (error && typeof error === 'object') {
            errorMsg = error.message || error.error || error.details || JSON.stringify(error);
          } else if (error) {
            errorMsg = error.toString();
          }
          reject(new Error(`Failed to setup Google API: ${errorMsg}`));
        }
      });
    });
  }

  async signIn() {
    if (!this.isInitialized) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        // Update the callback to resolve the promise
        this.tokenClient.callback = (response) => {
          if (response.error) {
            console.error('Token response error:', response);
            reject(new Error(`Google sign-in failed: ${response.error}`));
            return;
          }

          this.accessToken = response.access_token;

          // Store token info
          const tokenInfo = {
            access_token: response.access_token,
            expires_at: Date.now() + (response.expires_in * 1000),
            scope: response.scope
          };

          localStorage.setItem('google_token', JSON.stringify(tokenInfo));
          resolve(tokenInfo);
        };

        // Request access token
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (error) {
        console.error('Google sign-in error:', error);
        let errorMsg = 'Unknown sign-in error';
        if (error && typeof error === 'object') {
          errorMsg = error.error || error.message || error.details || JSON.stringify(error);
        } else if (error) {
          errorMsg = error.toString();
        }
        reject(new Error(`Google sign-in failed: ${errorMsg}`));
      }
    });
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
    if (this.accessToken && window.google) {
      // Revoke the access token
      window.google.accounts.oauth2.revoke(this.accessToken);
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