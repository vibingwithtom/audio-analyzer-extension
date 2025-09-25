import { GOOGLE_CONFIG } from './config.js';

class GoogleAuth {
  constructor() {
    this.isInitialized = false;
    this.accessToken = null;
    this.tokenClient = null;
    this.userInfo = null;
    this.authPromiseResolve = null;
    this.authPromiseReject = null;
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

          // Initialize Google Identity Services token client with better settings
          this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CONFIG.CLIENT_ID,
            scope: GOOGLE_CONFIG.SCOPE,
            callback: (response) => {
              if (response.error) {
                console.error('Token response error:', response);
                return;
              }
              this.handleTokenResponse(response);
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

  async handleTokenResponse(response) {
    try {
      this.accessToken = response.access_token;

      // Create token info
      const tokenInfo = {
        access_token: response.access_token,
        expires_at: Date.now() + (response.expires_in * 1000),
        scope: response.scope
      };

      localStorage.setItem('google_token', JSON.stringify(tokenInfo));

      // Fetch user info after successful authentication
      try {
        await this.fetchUserInfo(response.access_token);
      } catch (error) {
        console.warn('Failed to fetch user info:', error);
        // Continue even if user info fetch fails
      }

      // Resolve the waiting promise
      if (this.authPromiseResolve) {
        this.authPromiseResolve(tokenInfo);
        this.authPromiseResolve = null;
        this.authPromiseReject = null;
      }
    } catch (error) {
      console.error('Token response handling error:', error);
      if (this.authPromiseReject) {
        this.authPromiseReject(error);
        this.authPromiseResolve = null;
        this.authPromiseReject = null;
      }
    }
  }

  async signIn() {
    if (!this.isInitialized) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        // Store promise resolvers for the callback
        this.authPromiseResolve = resolve;
        this.authPromiseReject = reject;

        // Request access token (without forced consent for better UX)
        this.tokenClient.requestAccessToken();
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

  async fetchUserInfo(accessToken) {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status}`);
      }

      const userInfo = await response.json();
      this.userInfo = {
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture
      };

      // Store user info in localStorage
      localStorage.setItem('google_user_info', JSON.stringify(this.userInfo));

      return this.userInfo;
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
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

          // Load stored user info if available
          const storedUserInfo = localStorage.getItem('google_user_info');
          if (storedUserInfo) {
            try {
              this.userInfo = JSON.parse(storedUserInfo);
            } catch (error) {
              console.warn('Invalid stored user info:', error);
              localStorage.removeItem('google_user_info');
            }
          }

          return tokenInfo;
        }
      } catch (error) {
        console.warn('Invalid stored token:', error);
        localStorage.removeItem('google_token');
        localStorage.removeItem('google_user_info');
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

  getUserInfo() {
    return this.userInfo;
  }

  signOut() {
    if (this.accessToken && window.google) {
      // Revoke the access token
      window.google.accounts.oauth2.revoke(this.accessToken);
    }

    this.accessToken = null;
    this.userInfo = null;
    this.authPromiseResolve = null;
    this.authPromiseReject = null;
    localStorage.removeItem('google_token');
    localStorage.removeItem('google_user_info');
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