const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Initialize electron-store for settings
const store = new Store();

// Keep reference to main window
let mainWindow;

// Development mode flag
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, '../renderer/preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.png'), // Add icon later
    show: false, // Don't show until ready
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  // Load the app
  if (isDev) {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Focus the window
    if (isDev) {
      mainWindow.focus();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Set up the menu
  createApplicationMenu();
}

function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Audio File...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'Audio Files', extensions: ['wav', 'mp3', 'flac', 'aac', 'm4a', 'ogg'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
              const filePath = result.filePaths[0];
              mainWindow.webContents.send('file-selected', filePath);
            }
          }
        },
        {
          label: 'Recent Files',
          submenu: getRecentFilesMenu()
        },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            // Open preferences dialog
            mainWindow.webContents.send('show-preferences');
          }
        },
        { type: 'separator' },
        {
          role: 'quit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Audio Analyzer',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Audio Analyzer',
              message: 'Audio Analyzer',
              detail: `Version: ${app.getVersion()}\nA professional audio file analysis tool.\n\nBuilt with Electron and love ❤️`
            });
          }
        },
        {
          label: 'Learn More',
          click: () => {
            shell.openExternal('https://github.com/vibingwithtom/audio-analyzer-extension');
          }
        }
      ]
    }
  ];

  // macOS menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[4].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function getRecentFilesMenu() {
  const recentFiles = store.get('recentFiles', []);

  if (recentFiles.length === 0) {
    return [{ label: 'No recent files', enabled: false }];
  }

  return recentFiles.slice(0, 10).map(filePath => ({
    label: path.basename(filePath),
    click: () => {
      mainWindow.webContents.send('file-selected', filePath);
    }
  }));
}

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-settings', (event, key) => {
  if (key) {
    return store.get(key);
  }
  return store.store;
});

ipcMain.handle('set-settings', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('add-recent-file', (event, filePath) => {
  const recentFiles = store.get('recentFiles', []);

  // Remove if already exists
  const filtered = recentFiles.filter(f => f !== filePath);

  // Add to beginning
  filtered.unshift(filePath);

  // Keep only 10 most recent
  const updated = filtered.slice(0, 10);

  store.set('recentFiles', updated);

  // Update menu
  createApplicationMenu();

  return true;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    return buffer;
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
});

// Google Drive OAuth handlers
ipcMain.handle('start-oauth', async () => {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const { URL } = require('url');
    let authWindow = null;
    let server = null;
    let isResolved = false;

    const cleanup = () => {
      if (authWindow && !authWindow.isDestroyed()) {
        authWindow.close();
      }
      if (server && server.listening) {
        server.close();
      }
    };

    const handleCallback = (code, error, serverPort) => {
      if (isResolved) return;

      if (error) {
        isResolved = true;
        cleanup();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (code) {
        isResolved = true;
        setTimeout(() => cleanup(), 2500);

        exchangeCodeForToken(code, `http://127.0.0.1:${serverPort}/callback`)
          .then(token => {
            store.set('googleAccessToken', token);
            resolve(token);
          })
          .catch(error => {
            reject(error);
          });
      }
    };

    // Create a simple HTTP server to handle the callback
    server = http.createServer((req, res) => {
      console.log(`HTTP Request: ${req.method} ${req.url}`);
      const reqUrl = new URL(req.url, `http://${req.headers.host}`);
      console.log(`Parsed pathname: ${reqUrl.pathname}`);

      // Handle test endpoint
      if (reqUrl.pathname === '/test') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>✅ OAuth Server is Working!</h1><p>Port 8080 is accessible.</p>');
        return;
      }

      // Handle the OAuth callback
      if (reqUrl.pathname === '/callback') {
        const code = reqUrl.searchParams.get('code');
        const error = reqUrl.searchParams.get('error');
        const serverPort = server.address().port;

        // Send a success page
        const html = `<!DOCTYPE html>
          <html>
          <head>
            <title>Authentication ${error ? 'Failed' : 'Successful'}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .success { color: #10b981; }
              .error { color: #ef4444; }
            </style>
          </head>
          <body>
            <h1 class="${error ? 'error' : 'success'}">${error ? 'Authentication Failed' : 'Authentication Successful!'}</h1>
            <p>${error ? 'Please try again.' : 'This window will close automatically.'}</p>
            <script>
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
          </html>
        `;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);

        // Process the callback
        handleCallback(code, error, serverPort);
      } else {
        // Handle other requests
        console.log(`404 - Path not found: ${reqUrl.pathname}`);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    // Try to listen on a specific port range
    const tryPorts = [8080, 8081, 8082, 3000, 3001, 3002];
    let portIndex = 0;

    const tryNextPort = () => {
      if (portIndex >= tryPorts.length) {
        reject(new Error('No available ports for OAuth server'));
        return;
      }

      const port = tryPorts[portIndex++];
      server.listen(port, 'localhost', () => {
        console.log(`OAuth server listening on port ${port}`);

        // Create OAuth window
        authWindow = new BrowserWindow({
          width: 500,
          height: 600,
          show: true,
          parent: mainWindow,
          modal: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        });

        // OAuth configuration
        const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
        const REDIRECT_URI = `http://localhost`;
        const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${CLIENT_ID}&` +
          `redirect_uri=${encodeURIComponent(`http://127.0.0.1:${port}/callback`)}&` +

          `response_type=code&` +
          `scope=${encodeURIComponent(SCOPE)}&` +
          `access_type=offline`;

        console.log(`Starting OAuth flow with redirect URI: ${REDIRECT_URI}`);
        console.log(`OAuth URL: ${authUrl}`);

        authWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
          console.log(`OAuth window failed to load: ${errorCode} - ${errorDescription} - ${validatedURL}`);
        });

        authWindow.webContents.on('did-finish-load', () => {
          console.log('OAuth window finished loading');
        });

        authWindow.webContents.on('will-navigate', (event, url) => {
          console.log(`OAuth window navigating to: ${url}`);

          // Check if this is the callback URL
          if (url.startsWith('http://localhost:') && url.includes('/callback')) {
            console.log('Detected callback URL navigation - this should be handled by our server');
            // Let's prevent the navigation and handle it manually
            event.preventDefault();

            // Extract the code from the URL
            const urlObj = new URL(url);
            const code = urlObj.searchParams.get('code');
            const error = urlObj.searchParams.get('error');

            console.log('Manual callback handling:', { code: !!code, error });

            if (code || error) {
              // Manually trigger our callback handler
              const serverPort = server.address().port;
              handleCallback(code, error, serverPort);
            }
          }
        });

        authWindow.loadURL(authUrl);

        authWindow.on('closed', () => {
          console.log('OAuth window was closed');
          if (!isResolved) {
            isResolved = true;
            cleanup();
            reject(new Error('OAuth window closed'));
          }
        });
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} in use, trying next port...`);
          tryNextPort();
        } else {
          reject(err);
        }
      });
    };

    tryNextPort();
  });
});

ipcMain.handle('get-oauth-token', async () => {
  const token = store.get('googleAccessToken');

  if (!token) {
    return null;
  }

  // Check if token is still valid
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token.access_token}`);
    if (response.ok) {
      return token;
    } else {
      // Token expired, try to refresh
      if (token.refresh_token) {
        const newToken = await refreshAccessToken(token.refresh_token);
        store.set('googleAccessToken', newToken);
        return newToken;
      } else {
        store.delete('googleAccessToken');
        return null;
      }
    }
  } catch (error) {
    store.delete('googleAccessToken');
    return null;
  }
});

// Helper function to exchange auth code for access token
async function exchangeCodeForToken(code, redirectUri = null) {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE';
  const REDIRECT_URI = redirectUri || 'http://localhost/callback';

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code: code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed: ${response.status}`);
  }

  return await response.json();
}

// Helper function to refresh access token
async function refreshAccessToken(refreshToken) {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE';

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const newToken = await response.json();

  // Preserve the refresh token if not returned
  if (!newToken.refresh_token && refreshToken) {
    newToken.refresh_token = refreshToken;
  }

  return newToken;
}

// Auto-updater events
autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available.');
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available.');
});

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater. ' + err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  console.log(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded');
  autoUpdater.quitAndInstall();
});

// App event listeners
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Handle protocol for file associations (future feature)
app.setAsDefaultProtocolClient('audio-analyzer');