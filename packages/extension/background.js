// Background service worker for Audio File Analyzer

console.log('Background script parsing...');



// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received a message:', request.action);

  if (request.action === "openAnalyzer") {
    // This is a synchronous action
    chrome.tabs.create({
      url: chrome.runtime.getURL('file-handler.html')
    });
  } else if (request.action === "getOAuthToken") {
    // This is an asynchronous action, so we return true
    getGoogleDriveToken()
      .then(token => {
        sendResponse({ token: token });
      })
      .catch(error => {
        console.error('OAuth token error:', error);
        sendResponse({ error: error.message });
      });
    return true; // Keep message channel open for async response
  } else if (request.action === "forceReauth") {
    console.log('Forcing re-authentication...');
    // First, get the current token to remove it.
    chrome.identity.getAuthToken({ interactive: false }, (currentToken) => {
      if (chrome.runtime.lastError) {
        chrome.runtime.sendMessage({ action: 'reauthFailed', error: chrome.runtime.lastError.message });
        return;
      }
      if (currentToken) {
        chrome.identity.removeCachedAuthToken({ token: currentToken }, () => {
          console.log('Cached token removed. Fetching new token...');
          // Now, get a new token, forcing a user prompt.
          chrome.identity.getAuthToken({ interactive: true }, (newToken) => {
            if (chrome.runtime.lastError || !newToken) {
              chrome.runtime.sendMessage({ action: 'reauthFailed', error: chrome.runtime.lastError.message });
            } else {
              chrome.runtime.sendMessage({ action: 'reauthSuccess' });
            }
          });
        });
      } else {
        // No token to remove, just get a new one.
        chrome.identity.getAuthToken({ interactive: true }, (newToken) => {
          if (chrome.runtime.lastError || !newToken) {
            chrome.runtime.sendMessage({ action: 'reauthFailed', error: chrome.runtime.lastError.message });
          } else {
            chrome.runtime.sendMessage({ action: 'reauthSuccess' });
          }
        });
      }
    });
    return true;
  }
  // If no async action is taken, do not return true
});

function getGoogleDriveToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else if (token) {
        console.log('Successfully obtained OAuth token');
        resolve(token);
      } else {
        reject('No token received.');
      }
    });
  });
}

// Listen for tab updates to potentially inject better file detection
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('drive.google.com')) {
    // Enhanced Google Drive detection could go here
    console.log('Google Drive page loaded:', tab.url);
  }
});