const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Settings management
  getSettings: (key) => ipcRenderer.invoke('get-settings', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-settings', key, value),

  // File operations
  addRecentFile: (filePath) => ipcRenderer.invoke('add-recent-file', filePath),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // Listen for events from main process
  onFileSelected: (callback) => {
    ipcRenderer.on('file-selected', (event, filePath) => callback(filePath));
  },

  onShowPreferences: (callback) => {
    ipcRenderer.on('show-preferences', () => callback());
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // Google Drive OAuth (for future implementation)
  startOAuth: () => ipcRenderer.invoke('start-oauth'),
  getOAuthToken: () => ipcRenderer.invoke('get-oauth-token'),

  // File system access (with user permission)
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

  // Platform info
  platform: process.platform
});