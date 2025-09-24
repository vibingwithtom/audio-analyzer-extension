/**
 * Google Drive Integration
 * Handles file access, OAuth, and API interactions
 */

export class GoogleDriveHandler {
  constructor() {
    this.accessToken = null;
  }

  // Parse Google Drive URLs to extract file ID
  parseGoogleDriveUrl(url) {
    // Handle various Google Drive URL formats:
    // https://drive.google.com/file/d/FILE_ID/view
    // https://drive.google.com/open?id=FILE_ID
    // https://docs.google.com/document/d/FILE_ID/

    const fileIdPatterns = [
      /\/d\/([a-zA-Z0-9-_]+)/,        // /d/FILE_ID format
      /[?&]id=([a-zA-Z0-9-_]+)/,      // ?id=FILE_ID format
      /\/document\/d\/([a-zA-Z0-9-_]+)/, // docs format
    ];

    for (const pattern of fileIdPatterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  // Set access token (from Chrome extension or Electron OAuth)
  setAccessToken(token) {
    this.accessToken = token;
  }

  // Get file metadata from Google Drive API
  async getFileMetadata(fileId) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,size,mimeType,createdTime,modifiedTime`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  // Download file from Google Drive
  async downloadFile(fileId) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Google Drive download error: ${response.status} ${response.statusText}`);
    }

    return await response.blob();
  }

  // Download and analyze file in one step
  async downloadAndAnalyze(fileId, fileName) {
    try {
      // Get metadata and file data in parallel
      const [metadata, blob] = await Promise.all([
        this.getFileMetadata(fileId),
        this.downloadFile(fileId)
      ]);

      // Create file object
      const file = new File([blob], fileName || metadata.name, {
        type: blob.type || metadata.mimeType
      });

      return {
        file: file,
        metadata: metadata,
        source: 'google-drive'
      };
    } catch (error) {
      console.error('Google Drive download failed:', error);
      throw error;
    }
  }

  // Process Google Drive URL to file
  async processUrl(url) {
    const fileId = this.parseGoogleDriveUrl(url);
    if (!fileId) {
      throw new Error('Invalid Google Drive URL');
    }

    const metadata = await this.getFileMetadata(fileId);

    // Check if it's an audio file
    if (!this.isAudioFile(metadata.mimeType, metadata.name)) {
      throw new Error('File is not a supported audio format');
    }

    return await this.downloadAndAnalyze(fileId, metadata.name);
  }

  // Check if file is supported audio format
  isAudioFile(mimeType, fileName) {
    const audioMimeTypes = [
      'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/mpeg', 'audio/mp3',
      'audio/flac', 'audio/x-flac',
      'audio/aac', 'audio/mp4',
      'audio/ogg', 'audio/vorbis'
    ];

    const audioExtensions = [
      '.wav', '.mp3', '.flac', '.aac', '.m4a', '.ogg', '.webm'
    ];

    // Check MIME type
    if (mimeType && audioMimeTypes.some(type => mimeType.includes(type))) {
      return true;
    }

    // Check file extension
    if (fileName) {
      const extension = fileName.toLowerCase().split('.').pop();
      return audioExtensions.some(ext => ext === `.${extension}`);
    }

    return false;
  }

  // Validate access token
  async validateToken() {
    if (!this.accessToken) {
      return false;
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${this.accessToken}`
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}