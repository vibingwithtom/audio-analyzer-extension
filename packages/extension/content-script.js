class DriveAudioAnalyzer {
  constructor() {
    this.audioExtensions = ['.wav', '.mp3', '.flac', '.aac', '.m4a', '.ogg', '.webm'];
    this.buttonAdded = false;
    this.audioContext = null;
    this.init();
  }

  init() {
    console.log('DriveAudioAnalyzer initializing...');

    // Wait for page to load and retry multiple times
    this.retryCount = 0;
    this.maxRetries = 20; // Increased retries
    this.checkInterval = null;

    this.startContinuousChecking();

    // Also check when URL changes (for SPA navigation)
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        console.log('URL changed from', lastUrl, 'to', url);
        lastUrl = url;
        this.buttonAdded = false;
        this.retryCount = 0;
        this.startContinuousChecking();
      }
    });

    // Observe with less aggressive settings to avoid performance issues
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: false,
      characterData: false
    });

    // Also check when the page becomes visible (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.buttonAdded) {
        console.log('Page became visible, rechecking...');
        this.retryCount = 0;
        this.startContinuousChecking();
      }
    });
  }

  startContinuousChecking() {
    // Clear any existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Initial check
    this.scheduleCheck(500);

    // Set up periodic checking every 3 seconds for up to 1 minute
    this.checkInterval = setInterval(() => {
      if (!this.buttonAdded && this.retryCount < this.maxRetries) {
        // Only do periodic checks if we're on a file URL
        const url = window.location.href;
        if (url.includes('/file/d/')) {
          console.log('Periodic check attempt', this.retryCount + 1);
          this.checkForAudioFile();
        }
        this.retryCount++;
      } else if (this.buttonAdded || this.retryCount >= this.maxRetries) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
    }, 3000);
  }

  scheduleCheck(delay = 1000) {
    setTimeout(() => {
      this.checkForAudioFile();
      if (!this.buttonAdded && this.retryCount < this.maxRetries) {
        this.retryCount++;
        this.scheduleCheck(delay * 1.5); // Exponential backoff
      }
    }, delay);
  }

  checkForAudioFile() {
    console.log('Checking for audio file...', window.location.href);

    // Check if we're viewing a specific file (not folder, search, etc.)
    const url = window.location.href;
    const fileUrlPattern = /\/file\/d\/([a-zA-Z0-9-_]+)/;

    if (!fileUrlPattern.test(url)) {
      console.log('Not a file URL - this is:', url);
      return;
    }

    // Additional check: make sure it's not a preview URL that might not be audio
    if (url.includes('/folders/') || url.includes('/search') || url.includes('/my-drive')) {
      console.log('This is a folder or search page, not a file');
      return;
    }

    // Try to extract filename from the page data or URL first
    let fileName = null;
    let actualFileType = null;

    // Method 1: Extract from document title (most reliable for full filename)
    const docTitle = document.title;
    console.log('Document title:', docTitle);
    if (docTitle && docTitle.includes('.') && docTitle.includes(' - Google Drive')) {
      // Clean title to get just the filename
      let cleanTitle = docTitle.replace(' - Google Drive', '').trim();
      console.log('Cleaned title:', cleanTitle);

      if (this.isAudioFile(cleanTitle)) {
        fileName = cleanTitle;
        actualFileType = this.getFileType(cleanTitle);
        console.log('Found filename from document title:', fileName, 'type:', actualFileType);
      }
    }

    // Method 2: Try to find in page scripts/data
    if (!fileName) {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const scriptText = script.textContent || script.innerText;
        if (scriptText && scriptText.includes('"title":')) {
          // Look for JSON data with title field
          const matches = scriptText.match(/"title":\s*"([^"]*\.(?:wav|mp3|flac|aac|m4a|ogg|webm))"/i);
          if (matches && matches[1]) {
            fileName = matches[1];
            actualFileType = this.getFileType(fileName);
            console.log('Found filename in script data:', fileName, 'type:', actualFileType);
            break;
          }
        }
      }
    }

    // Method 3: Look for specific filename elements (more targeted)
    if (!fileName) {
      const selectors = [
        'span[title$=".wav"], span[title$=".mp3"], span[title$=".flac"], span[title$=".aac"], span[title$=".m4a"], span[title$=".ogg"], span[title$=".webm"]',
        '[aria-label$=".wav"], [aria-label$=".mp3"], [aria-label$=".flac"], [aria-label$=".aac"], [aria-label$=".m4a"], [aria-label$=".ogg"], [aria-label$=".webm"]'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const title = element.getAttribute('title') || element.getAttribute('aria-label');
          if (title && title.length < 100) { // Reasonable filename length
            fileName = title;
            actualFileType = this.getFileType(fileName);
            console.log('Found filename via targeted selector:', fileName, 'type:', actualFileType);
            break;
          }
        }
        if (fileName) break;
      }
    }

    // Method 3: Check document title as fallback
    if (!fileName) {
      const docTitle = document.title;
      if (docTitle && docTitle.includes('.') && docTitle.length < 100) {
        const titleParts = docTitle.split(' - ');
        const potentialName = titleParts[0];
        if (this.isAudioFile(potentialName)) {
          fileName = potentialName;
          console.log('Found filename from document title:', fileName);
        }
      }
    }

    if (!fileName) {
      console.log('No filename found, checking for audio player...');

      // Check if there's an audio element on the page as fallback
      const audioElement = document.querySelector('audio');
      if (audioElement) {
        console.log('Found audio player, adding button anyway');
        // Try one more time to get filename from document title
        const docTitle = document.title;
        if (docTitle && docTitle.includes('.') && docTitle.includes(' - Google Drive')) {
          const cleanTitle = docTitle.replace(' - Google Drive', '').trim();
          console.log('Last attempt - checking document title:', cleanTitle);
          if (this.isAudioFile(cleanTitle)) {
            this.addAnalyzeButton(cleanTitle);
            return;
          }
        }

        // Use actual filename or fallback to generic name
        const fallbackName = actualFileType ? `audio-file.${actualFileType?.toLowerCase() || 'wav'}` : 'audio-file';
        this.addAnalyzeButton(fallbackName);
        return;
      }

      console.log('No filename and no audio player found, retrying in 2 seconds...');
      setTimeout(() => this.checkForAudioFile(), 2000);
      return;
    }

    console.log('Checking if', fileName, 'is audio file...');
    if (this.isAudioFile(fileName)) {
      console.log('Audio file detected, adding button');
      this.addAnalyzeButton(fileName);
    } else {
      console.log('Not an audio file, filename was:', fileName);

      // Also check if we found a filename from document title earlier
      if (!fileName && actualFileType) {
        console.log('No filename found but actualFileType exists, checking for audio player...');
      }

      // Additional debugging - check if there's an audio player on the page
      const audioElement = document.querySelector('audio');
      if (audioElement) {
        console.log('Found audio element on page, but filename detection failed');
        console.log('Audio element src:', audioElement.src);
        // Try to add button anyway if there's an audio player
        this.addAnalyzeButton('audio-file.wav');
      }
    }
  }

  isAudioFile(fileName) {
    if (!fileName) return false;
    const lowerName = fileName.toLowerCase();
    console.log('Checking filename:', fileName, 'lowercase:', lowerName);
    console.log('Audio extensions:', this.audioExtensions);

    const isAudio = this.audioExtensions.some(ext => {
      const matches = lowerName.endsWith(ext);
      console.log('Checking extension', ext, '- matches:', matches);
      return matches;
    });

    console.log('Final result - is audio file:', isAudio);
    return isAudio;
  }

  addAnalyzeButton(fileName) {
    if (this.buttonAdded) {
      console.log('Button already added, skipping');
      return;
    }

    console.log('Adding analyze button for:', fileName);

    // Remove existing button if present
    const existingButton = document.getElementById('audio-analyzer-btn');
    if (existingButton) {
      existingButton.remove();
    }

    // Create a floating button that's always visible
    const button = document.createElement('button');
    button.id = 'audio-analyzer-btn';
    button.className = 'audio-analyzer-button';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
      </svg>
      Analyze Audio
    `;

    button.addEventListener('click', () => this.analyzeFile(fileName));

    // Add as a floating button
    document.body.appendChild(button);
    this.buttonAdded = true;
    console.log('Floating button added successfully');
  }

  async analyzeFile(fileName) {
    try {
      // Show loading state
      const button = document.getElementById('audio-analyzer-btn');
      button.setAttribute('data-original-text', button.innerHTML);
      button.innerHTML = 'Analyzing...';
      button.disabled = true;

      // Extract file ID for API access
      const match = window.location.href.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        const fileId = match[1];
        console.log('Extracted file ID:', fileId);

        // Try Google Drive API first (the proper approach)
        try {
          button.innerHTML = 'Authenticating with Google Drive...';
          await this.analyzeViaGoogleDriveAPI(fileId, fileName);
          return;
        } catch (error) {
          console.error('Google Drive API failed:', error);
          button.innerHTML = 'API failed, trying audio capture...';
        }
      }

      // Fallback: Try Web Audio API capture
      try {
        button.innerHTML = 'Capturing audio stream...';
        await this.analyzeFromDrivePlayer(fileName);
        return;
      } catch (error) {
        console.error('Audio capture failed:', error);
        button.innerHTML = 'Trying alternative methods...';
      }

      // Fallback: Try to access file through Google Drive's own audio player
      let audioElement = document.querySelector('audio');

      if (!audioElement) {
        // Method 2: Wait for audio player to load and try again
        console.log('No audio element found, waiting for player to load...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        audioElement = document.querySelector('audio');
      }

      if (audioElement) {
        console.log('Found audio element with src:', audioElement.src);

        // Try to extract audio data directly from the player
        if (audioElement.src && !audioElement.src.startsWith('blob:')) {
          console.log('Trying to access audio via Google Drive player URL');
          try {
            const response = await fetch(audioElement.src, {
              credentials: 'same-origin',
              headers: {
                'Range': 'bytes=0-1024' // Just get the header for analysis
              }
            });

            if (response.ok) {
              const blob = await response.blob();
              console.log('Successfully got audio data via player');
              const file = new File([blob], fileName || 'audio-file.wav', { type: blob.type || 'audio/wav' });
              this.openAnalyzer(file, fileName);
              return;
            }
          } catch (error) {
            console.log('Player URL access failed:', error);
          }
        }

        // If we have a blob URL, try to extract the audio data
        if (audioElement.src && audioElement.src.startsWith('blob:')) {
          console.log('Found blob URL, attempting to extract audio data');
          try {
            const response = await fetch(audioElement.src);
            if (response.ok) {
              const blob = await response.blob();
              console.log('Successfully extracted blob data');
              const file = new File([blob], fileName || 'audio-file.wav', { type: blob.type || 'audio/wav' });
              this.openAnalyzer(file, fileName);
              return;
            }
          } catch (error) {
            console.log('Blob extraction failed:', error);
          }
        }

        // If direct access fails, try to capture audio data using Web Audio API
        try {
          // Update button to show we're trying audio capture
          button.innerHTML = 'Capturing audio...';

          await this.captureAudioFromPlayer(audioElement, fileName);
          return;
        } catch (error) {
          console.log('Audio capture failed:', error);

          // Show user-friendly message about the capture attempt
          if (error.message.includes('NotAllowedError') || error.message.includes('permission')) {
            alert('Audio capture requires permission. Please allow microphone access when prompted and try again.');
            return;
          } else if (error.message.includes('NotSupportedError')) {
            alert('Audio capture is not supported in this browser. Falling back to download method.');
          } else {
            console.log('Web Audio API capture failed, trying alternative access...');
          }
        }
      }

      // Method 3: Fall back to download workflow
      await this.tryAlternativeAccess(fileName);

    } catch (error) {
      console.error('Error analyzing file:', error);
      alert('Error analyzing file: ' + error.message);
    } finally {
      // Restore button
      const button = document.getElementById('audio-analyzer-btn');
      if (button) {
        button.innerHTML = button.getAttribute('data-original-text') || 'Analyze Audio';
        button.disabled = false;
      }
    }
  }

  async captureAudioFromPlayer(audioElement, fileName) {
    console.log('Attempting to capture audio using Web Audio API...');

    try {
      // Create fresh audio context
      if (this.audioContext) {
        await this.audioContext.close();
      }
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('Created fresh audio context');

      // Clone the audio element to avoid reuse issues
      const clonedAudio = audioElement.cloneNode(true);
      clonedAudio.src = audioElement.src || audioElement.currentSrc;
      console.log('Cloned audio element with src:', clonedAudio.src);

      // Create media element source from the cloned audio player
      const source = this.audioContext.createMediaElementSource(clonedAudio);
      console.log('Created media element source from cloned element');

      // Create analyzer and recorder nodes
      const analyzer = this.audioContext.createAnalyser();
      const recorder = this.audioContext.createScriptProcessor(4096, 2, 2);

      // Connect the audio graph
      source.connect(analyzer);
      analyzer.connect(recorder);
      recorder.connect(this.audioContext.destination);

      // Store audio data
      const audioData = [];
      let isRecording = false;

      return new Promise((resolve, reject) => {
        // Set up recording
        recorder.onaudioprocess = (event) => {
          if (!isRecording) return;

          const inputBuffer = event.inputBuffer;
          const leftChannel = inputBuffer.getChannelData(0);
          const rightChannel = inputBuffer.numberOfChannels > 1 ? inputBuffer.getChannelData(1) : leftChannel;

          // Store the audio data
          audioData.push({
            left: new Float32Array(leftChannel),
            right: new Float32Array(rightChannel),
            sampleRate: inputBuffer.sampleRate
          });
        };

        // Start recording and play audio briefly
        isRecording = true;

        // Use cloned audio for analysis (muted)
        clonedAudio.volume = 0;
        clonedAudio.currentTime = 0;

        // Handle play promise to avoid console errors
        const playPromise = clonedAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            // Ignore playback interruption errors - they're expected
            if (!error.message.includes('interrupted')) {
              console.log('Playback error:', error);
            }
          });
        }

        // Record for 2 seconds or until end
        setTimeout(() => {
          isRecording = false;
          clonedAudio.pause();

          // Clean up audio nodes
          try {
            recorder.disconnect();
            analyzer.disconnect();
            source.disconnect();
          } catch (e) {
            console.log('Error disconnecting audio nodes:', e);
          }

          if (audioData.length > 0) {
            // Get enhanced metadata from the page and audio element
            const actualFileName = this.extractRealFileName();
            const actualFileType = actualFileName ? this.getFileType(actualFileName) : 'Unknown';
            const fileSizeFromPage = this.extractFileSizeFromPage();

            // Analyze the captured data - be honest about limitations
            const sampleData = audioData[0];
            const results = {
              fileType: actualFileType || 'Unknown',
              sampleRate: sampleData.sampleRate, // This is accurate from Web Audio API
              channels: sampleData.right === sampleData.left ? 1 : 2, // This is accurate
              duration: audioElement.duration && !isNaN(audioElement.duration) ? audioElement.duration : 'Unknown',
              fileSize: fileSizeFromPage || 'Unknown (unable to access original file)',
              bitDepth: 'Unknown (Web Audio API limitation)', // Be honest - we can't determine this from decoded audio
              originalFileName: actualFileName || fileName || 'audio-file',
              captureMethod: 'Web Audio API (decoded stream)'
            };

            console.log('Successfully captured audio data with enhanced metadata:', results);

            // Create a synthetic audio file for the analyzer
            this.createSyntheticFile(audioData, actualFileName || fileName, results);
            resolve();
          } else {
            reject(new Error('No audio data captured'));
          }
        }, 2000);
      });

    } catch (error) {
      console.error('Web Audio API capture failed:', error);
      throw error;
    }
  }

  createSyntheticFile(audioData, fileName, results) {
    console.log('Creating synthetic file with data:', { audioData: audioData.length, fileName, results });

    // Create a simple WAV file from the captured data
    const sampleRate = audioData[0].sampleRate;
    const channels = results.channels;
    const length = Math.min(audioData.length * 4096, sampleRate * 2); // Reduced to 2 seconds for faster processing

    console.log('WAV parameters:', { sampleRate, channels, length });

    // Create WAV buffer
    const buffer = new ArrayBuffer(44 + length * 2 * channels);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2 * channels, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2 * channels, true);

    // Write sample data (simplified - just use first chunk)
    const firstChunk = audioData[0];
    let offset = 44;
    for (let i = 0; i < Math.min(4096, length); i++) {
      // Convert float to 16-bit PCM
      const sample = Math.max(-1, Math.min(1, firstChunk.left[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;

      if (channels === 2) {
        const rightSample = Math.max(-1, Math.min(1, firstChunk.right[i]));
        view.setInt16(offset, rightSample * 0x7FFF, true);
        offset += 2;
      }
    }

    console.log('WAV file created, size:', buffer.byteLength, 'bytes');

    // Create file and open analyzer
    const blob = new Blob([buffer], { type: 'audio/wav' });
    const file = new File([blob], fileName || 'captured-audio.wav', { type: 'audio/wav' });

    console.log('File created:', file.name, file.size, 'bytes, type:', file.type);

    this.openAnalyzerWithCapturedData(file, fileName, results);
  }

  openAnalyzerWithCapturedData(file, fileName, results) {
    console.log('Opening analyzer with captured data...');

    // Store both the file data and the analysis results
    const reader = new FileReader();
    reader.onload = async (e) => {
      console.log('File converted to data URL, length:', e.target.result.length);

      const fileData = {
        fileName: fileName || 'captured-audio.wav',
        timestamp: Date.now(),
        preAnalyzed: true,
        results: results,
        dataUrl: e.target.result
      };

      try {
        // Store in both session storage and chrome storage for reliability
        sessionStorage.setItem('audioAnalyzerFileData', e.target.result);
        sessionStorage.setItem('audioAnalyzerFile', JSON.stringify(fileData));

        // Also store in chrome storage as backup
        await new Promise((resolve, reject) => {
          chrome.storage.local.set({
            capturedAudioData: fileData
          }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });

        console.log('Data stored in both session and chrome storage, opening analyzer...');

        // Open analyzer page with a parameter to indicate captured data
        const url = chrome.runtime.getURL('file-handler.html?captured=true');
        console.log('Opening URL:', url);
        window.open(url, '_blank');

      } catch (error) {
        console.error('Error storing data:', error);
        alert('Error storing file data: ' + error.message);
      }
    };

    reader.onerror = (error) => {
      console.error('Error reading file for data URL:', error);
      alert('Error preparing file for analysis: ' + error);
    };

    reader.readAsDataURL(file);
  }

  extractRealFileName() {
    // Try multiple methods to get the real filename
    const docTitle = document.title;
    if (docTitle && docTitle.includes('.') && !docTitle.endsWith(' - Google Drive')) {
      let cleanTitle = docTitle.replace(' - Google Drive', '').trim();
      if (cleanTitle.includes(' - ')) {
        cleanTitle = cleanTitle.split(' - ')[0];
      }
      if (this.isAudioFile(cleanTitle)) {
        return cleanTitle;
      }
    }

    // Look for filename in page metadata
    const metaOgTitle = document.querySelector('meta[property="og:title"]');
    if (metaOgTitle && metaOgTitle.content && this.isAudioFile(metaOgTitle.content)) {
      return metaOgTitle.content;
    }

    // Look for filename in script data
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const scriptText = script.textContent || script.innerText;
      if (scriptText && scriptText.includes('"title":')) {
        const matches = scriptText.match(/"title":\s*"([^"]*\.(?:wav|mp3|flac|aac|m4a|ogg|webm))"/i);
        if (matches && matches[1]) {
          return matches[1];
        }
      }
    }

    return null;
  }

  extractFileSizeFromPage() {
    // Try to find file size information on the page
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const scriptText = script.textContent || script.innerText;
      if (scriptText && scriptText.includes('"fileSize":')) {
        const matches = scriptText.match(/"fileSize":\s*"?(\d+)"?/);
        if (matches && matches[1]) {
          return parseInt(matches[1]);
        }
      }
      // Also look for size in bytes
      if (scriptText && scriptText.includes('"sizeBytes":')) {
        const matches = scriptText.match(/"sizeBytes":\s*"?(\d+)"?/);
        if (matches && matches[1]) {
          return parseInt(matches[1]);
        }
      }
    }

    // Look for size information in visible elements
    const sizeElements = document.querySelectorAll('[data-tooltip*="MB"], [data-tooltip*="KB"], [data-tooltip*="bytes"]');
    for (const element of sizeElements) {
      const tooltip = element.getAttribute('data-tooltip');
      if (tooltip) {
        const sizeMatch = tooltip.match(/(\d+(?:\.\d+)?)\s*(MB|KB|bytes)/i);
        if (sizeMatch) {
          const size = parseFloat(sizeMatch[1]);
          const unit = sizeMatch[2].toUpperCase();
          if (unit === 'MB') return Math.round(size * 1024 * 1024);
          if (unit === 'KB') return Math.round(size * 1024);
          if (unit === 'BYTES') return Math.round(size);
        }
      }
    }

    return null;
  }


  async accessFileViaAPI(fileId, fileName) {
    try {
      // Request OAuth token for Google Drive API access
      const token = await this.getOAuthToken();
      if (!token) {
        throw new Error('Unable to get OAuth token');
      }

      console.log('Got OAuth token, requesting file data...');

      // Get file metadata first
      const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,size,mimeType`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!metadataResponse.ok) {
        throw new Error(`Metadata request failed: ${metadataResponse.status}`);
      }

      const metadata = await metadataResponse.json();
      console.log('File metadata:', metadata);

      // Download the actual file content
      const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!fileResponse.ok) {
        throw new Error(`File download failed: ${fileResponse.status}`);
      }

      const arrayBuffer = await fileResponse.arrayBuffer();
      console.log('Downloaded file data:', arrayBuffer.byteLength, 'bytes');

      return arrayBuffer;

    } catch (error) {
      console.error('Google Drive API access failed:', error);
      throw error;
    }
  }

  async getOAuthToken() {
    // Go through the background script to get the token
    console.log('Using background script for OAuth...');
    return await this.getOAuthTokenViaBackground();
  }

  async getOAuthTokenViaBackground() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'getOAuthToken' }, (response) => {
        // Check for runtime errors
        if (chrome.runtime.lastError) {
          reject(new Error('Runtime error: ' + chrome.runtime.lastError.message));
          return;
        }

        if (response && response.token) {
          resolve(response.token);
        } else {
          reject(new Error('Failed to get OAuth token: ' + (response?.error || 'Unknown error')));
        }
      });
    });
  }

  async getOAuthTokenDirect() {
    // Try to use Chrome's identity API directly from content script
    try {
      if (chrome.identity && chrome.identity.getAuthToken) {
        console.log('Using direct Chrome identity API...');
        const token = await new Promise((resolve, reject) => {
          chrome.identity.getAuthToken({
            interactive: true
          }, (token) => {
            if (chrome.runtime.lastError) {
              reject(new Error('Identity API error: ' + chrome.runtime.lastError.message));
            } else if (token) {
              resolve(token);
            } else {
              reject(new Error('No token received from identity API'));
            }
          });
        });
        console.log('Successfully got token via direct identity API');
        return token;
      }
    } catch (error) {
      console.log('Direct identity API failed:', error);
    }

    // Try alternative approach: inject script to use parent page's auth
    try {
      console.log('Trying alternative OAuth approach...');

      // Use the existing Google session - create a hidden iframe approach
      const token = await this.getTokenViaIframe();
      if (token) {
        console.log('Successfully got token via iframe approach');
        return token;
      }
    } catch (error) {
      console.log('Iframe approach failed:', error);
    }

    // Final fallback: Try to get token from existing Google session cookies
    throw new Error('OAuth not available - please ensure you are logged into Google Drive and try again');
  }

  async getTokenViaIframe() {
    // Use the proper Chrome extension redirect URI
    const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
    console.log('Using Chrome extension redirect URI:', redirectUri);

    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `https://accounts.google.com/oauth/authorize?client_id=708688597317-m89f4e07nc2f31r8i7dcqehc6oj4hfi6.apps.googleusercontent.com&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.readonly')}&response_type=token`;

      console.log('OAuth URL:', iframe.src);
      document.body.appendChild(iframe);

      const checkForToken = () => {
        try {
          const iframeUrl = iframe.contentWindow.location.href;
          console.log('Checking iframe URL for token...');
          if (iframeUrl.includes('access_token=')) {
            const tokenMatch = iframeUrl.match(/access_token=([^&]+)/);
            if (tokenMatch) {
              console.log('Found access token in iframe!');
              document.body.removeChild(iframe);
              resolve(tokenMatch[1]);
              return;
            }
          }
        } catch (error) {
          // Cross-origin iframe access will throw errors, this is expected during auth flow
        }

        setTimeout(checkForToken, 1000);
      };

      setTimeout(() => {
        console.log('OAuth iframe timeout');
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
        reject(new Error('OAuth timeout - please check your Google Cloud Console OAuth configuration'));
      }, 30000);

      checkForToken();
    });
  }

  async setupDownloadAndAnalyze(fileId, fileName) {
    // Create a user-friendly workflow that works within Google Drive's constraints
    console.log('Setting up download and analyze for:', fileName, 'fileId:', fileId);

    // Method 1: Try to trigger download and open analyzer simultaneously
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    console.log('Download URL:', downloadUrl);

    // Open our analyzer in a new tab, ready to receive the file
    const analyzerUrl = chrome.runtime.getURL('file-handler.html?mode=download&filename=' + encodeURIComponent(fileName));
    console.log('Opening analyzer at:', analyzerUrl);
    const analyzerTab = window.open(analyzerUrl, '_blank');

    // Skip dialog - just auto-trigger download and show instructions
    console.log('Auto-triggering download...');

    // Try multiple methods to trigger download
    let downloadTriggered = false;

    // Method 1: Look for Google's download button with various selectors
    const downloadSelectors = [
      '[aria-label="Download"]',
      '[data-tooltip="Download"]',
      '[title="Download"]',
      'button[jsaction*="download"]',
      '[data-id="download"]',
      '.ndfHFb-c4YZDc-GSQQnc-LgbsSe[aria-label*="Download"]',
      'span[aria-label="Download"]'
    ];

    for (const selector of downloadSelectors) {
      const button = document.querySelector(selector);
      if (button) {
        console.log('Found download button with selector:', selector);
        button.click();
        downloadTriggered = true;
        console.log('Download triggered via Google Drive button');
        break;
      }
    }

    // Method 2: If no button found, try direct URL
    if (!downloadTriggered) {
      console.log('No download button found, trying direct URL...');
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = fileName;
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      downloadTriggered = true;
      console.log('Download triggered via direct URL');
    }

    // Method 3: If still no download, open URL in new tab
    if (!downloadTriggered) {
      console.log('Fallback: opening download URL in new tab');
      window.open(downloadUrl, '_blank');
    }

    // Show a temporary notification on the page instead of alert
    this.showDownloadNotification(fileName);
  }

  async analyzeViaGoogleDriveAPI(fileId, fileName) {
    console.log('Attempting Google Drive API access for file:', fileId);

    try {
      // Get OAuth token from background script
      const button = document.getElementById('audio-analyzer-btn');
      button.innerHTML = 'Getting authorization...';
      const token = await this.getOAuthToken();
      console.log('Successfully obtained OAuth token');

      // Get file metadata first
      button.innerHTML = 'Getting file metadata...';
      const metadataResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,size,mimeType,createdTime,modifiedTime`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!metadataResponse.ok) {
        throw new Error(`Metadata request failed: ${metadataResponse.status} ${metadataResponse.statusText}`);
      }

      const metadata = await metadataResponse.json();
      console.log('File metadata from API:', metadata);

      // Pass the fileId and token to the file-handler page
      const analyzerUrl = new URL(chrome.runtime.getURL('file-handler.html'));
      analyzerUrl.searchParams.set('fileId', fileId);
      analyzerUrl.searchParams.set('fileName', metadata.name || fileName);
      analyzerUrl.searchParams.set('token', token);

      console.log('Opening analyzer with fileId and token...');
      window.open(analyzerUrl.href, '_blank');

    } catch (error) {
      console.error('Google Drive API access failed:', error);
      throw error;
    }
  }

  async analyzeFromDrivePlayer(fileName) {
    console.log('Analyzing directly from Google Drive player for:', fileName);

    // Find the audio element that Google Drive creates
    const audioElement = document.querySelector('audio');
    if (!audioElement) {
      throw new Error('No audio player found on the page');
    }

    console.log('Found audio element with src:', audioElement.src);

    // Get the audio source URL
    let audioSrc = audioElement.src || audioElement.currentSrc;
    if (!audioSrc) {
      throw new Error('No audio source found in player');
    }

    console.log('Audio source URL:', audioSrc);

    // Try to fetch the complete audio data from Google Drive's streaming URL
    try {
      console.log('Attempting to fetch complete audio file...');
      console.log('Fetch URL:', audioSrc);
      console.log('Current page origin:', window.location.origin);

      // First try to get the complete file (no Range header)
      const response = await fetch(audioSrc, {
        method: 'GET',
        credentials: 'same-origin',
        mode: 'cors'
      });

      console.log('Fetch response status:', response.status);
      console.log('Fetch response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get the complete file
      const arrayBuffer = await response.arrayBuffer();
      console.log('Successfully retrieved complete audio data:', arrayBuffer.byteLength, 'bytes');

      // Get file size from response headers or content
      const fileSize = response.headers.get('content-length') || arrayBuffer.byteLength;

      // Create a file object from the retrieved data
      const file = new File([arrayBuffer], fileName, {
        type: this.getMimeTypeFromExtension(fileName)
      });

      // Get additional metadata from the audio element and response
      const metadata = {
        duration: audioElement.duration,
        currentTime: audioElement.currentTime,
        volume: audioElement.volume,
        originalSrc: audioSrc,
        fileSize: parseInt(fileSize),
        totalBytes: arrayBuffer.byteLength,
        responseHeaders: Object.fromEntries(response.headers.entries())
      };

      console.log('Complete metadata:', metadata);

      // Open analyzer with the actual audio data
      this.openAnalyzerWithRealFile(file, fileName, metadata);

    } catch (error) {
      console.error('Failed to fetch audio from Google Drive:', error);
      throw error;
    }
  }

  getMimeTypeFromExtension(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
      'wav': 'audio/wav',
      'mp3': 'audio/mpeg',
      'flac': 'audio/flac',
      'aac': 'audio/aac',
      'm4a': 'audio/mp4',
      'ogg': 'audio/ogg',
      'webm': 'audio/webm'
    };
    return mimeTypes[extension] || 'audio/wav';
  }

  openAnalyzerWithRealFile(file, fileName, metadata) {
    console.log('Opening analyzer with real file data');

    // Store the actual file data for transfer
    const reader = new FileReader();
    reader.onload = (e) => {
      // Store both file data and metadata
      sessionStorage.setItem('audioAnalyzerFileData', e.target.result);
      sessionStorage.setItem('audioAnalyzerFile', JSON.stringify({
        fileName: fileName,
        timestamp: Date.now(),
        metadata: metadata,
        directAccess: true
      }));

      console.log('File data stored, opening analyzer...');

      // Open analyzer page
      const url = chrome.runtime.getURL('file-handler.html?direct=true');
      window.open(url, '_blank');
    };

    reader.onerror = (error) => {
      console.error('Error reading file data:', error);
      throw new Error('Failed to process audio data');
    };

    reader.readAsDataURL(file);
  }

  showDownloadNotification(fileName) {
    // Create a notification banner on the Google Drive page
    const notification = document.createElement('div');
    notification.id = 'audio-analyzer-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 350px;
      animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">🎵 Analysis Ready!</div>
      <div style="margin-bottom: 8px;">Download initiated for "${fileName}"</div>
      <div style="font-size: 12px; opacity: 0.9;">
        Once downloaded, drag the file into the analyzer tab to get instant analysis!
      </div>
      <div style="margin-top: 10px; font-size: 11px; opacity: 0.8;">
        If download didn't start: Right-click → Download
      </div>
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    // Add to page
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 5000);

    // Click to dismiss
    notification.addEventListener('click', () => {
      notification.remove();
    });
  }

  getFileType(fileName) {
    if (!fileName) return 'Unknown';
    const extension = fileName.split('.').pop().toLowerCase();
    const typeMap = {
      'wav': 'WAV',
      'mp3': 'MP3',
      'flac': 'FLAC',
      'aac': 'AAC',
      'm4a': 'M4A',
      'ogg': 'OGG',
      'webm': 'WebM'
    };
    return typeMap[extension] || extension.toUpperCase();
  }

  async tryAlternativeAccess(fileName) {
    // Extract file ID from URL
    const match = window.location.href.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      alert('Could not extract file ID from URL');
      return;
    }

    const fileId = match[1];

    // Try different Google Drive URLs
    const urls = [
      `https://drive.google.com/uc?export=download&id=${fileId}`,
      `https://drive.google.com/uc?id=${fileId}&export=download`,
      `https://docs.google.com/uc?export=download&id=${fileId}`
    ];

    for (const url of urls) {
      try {
        console.log('Trying URL:', url);
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include'
        });

        if (response.ok) {
          const blob = await response.blob();
          if (blob.size > 0) {
            const file = new File([blob], fileName, { type: blob.type || 'audio/wav' });
            this.openAnalyzer(file, fileName);
            return;
          }
        }
      } catch (error) {
        console.log('Failed with URL:', url, error);
        continue;
      }
    }

    // If all methods fail, offer to download and open popup
    const message = `Ready to analyze "${fileName}"!\n\nSince Google Drive has security restrictions, I'll:\n\n1. Help you download the file\n2. Open the analyzer for you\n\nClick OK to continue, or Cancel to try manually.`;

    if (confirm(message)) {
      // Try to trigger download and open popup
      this.helpWithDownloadAndAnalysis(fileName);
    }
  }

  openAnalyzer(file, fileName) {
    // Store file data for the analyzer page
    const fileData = {
      file: file,
      fileName: fileName,
      timestamp: Date.now()
    };

    // Store in session storage
    sessionStorage.setItem('audioAnalyzerFile', JSON.stringify({
      fileName: fileName,
      timestamp: Date.now()
    }));

    // Convert file to data URL for transfer
    const reader = new FileReader();
    reader.onload = (e) => {
      sessionStorage.setItem('audioAnalyzerFileData', e.target.result);
      // Open analyzer page
      window.open(chrome.runtime.getURL('file-handler.html'), '_blank');
    };
    reader.readAsDataURL(file);
  }

  openAnalyzerWithUrl(audioSrc, fileName) {
    // Store URL data for the analyzer page
    sessionStorage.setItem('audioAnalyzerFile', JSON.stringify({
      fileName: fileName,
      audioSrc: audioSrc,
      timestamp: Date.now()
    }));

    // Open analyzer page
    window.open(chrome.runtime.getURL('file-handler.html'), '_blank');
  }

  helpWithDownloadAndAnalysis(fileName) {
    // Try to find and click the download button
    const downloadButton = document.querySelector('[aria-label="Download"]') ||
                          document.querySelector('[title="Download"]') ||
                          document.querySelector('button[jsaction*="download"]');

    if (downloadButton) {
      // Trigger download
      downloadButton.click();

      // Wait a moment then open analyzer
      setTimeout(() => {
        this.openExtensionPopup();

        // Show helpful message
        setTimeout(() => {
          alert(`Download started! Once "${fileName}" finishes downloading, drag it into the analyzer that just opened.`);
        }, 1000);
      }, 500);
    } else {
      // Fallback - just open the analyzer
      this.openExtensionPopup();
      alert(`Please download "${fileName}" manually from Google Drive, then drag it into the analyzer that just opened.`);
    }
  }

  openExtensionPopup() {
    // Create a new tab with a simple page that shows the popup
    const popupHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Audio File Analyzer</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 50px auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
          }
          .popup-frame {
            width: 450px;
            height: 650px;
            border: none;
            margin: 20px auto;
            display: block;
          }
          h1 { color: #333; margin-bottom: 20px; }
          p { color: #666; margin-bottom: 20px; }
          .instructions {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎵 Audio File Analyzer</h1>
          <div class="instructions">
            <strong>Quick Steps:</strong><br>
            1. Download the audio file from Google Drive<br>
            2. Drag and drop it into the analyzer below<br>
            3. View your analysis with saved criteria!
          </div>
          <iframe src="${chrome.runtime.getURL('popup.html')}" class="popup-frame"></iframe>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([popupHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
}

// Initialize the analyzer
new DriveAudioAnalyzer();

// Listen for messages from the background script (e.g., from context menu)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeFromContext") {
    // The user has right-clicked on a file in Google Drive.
    // We can try to trigger the analysis flow here.
    // This is a simplified version; a real implementation would need to
    // extract the file ID from the request.linkUrl or request.pageUrl.
    console.log('Received analyzeFromContext message:', request);
    const analyzeButton = document.getElementById('audio-analyzer-btn');
    if (analyzeButton) {
      analyzeButton.click();
    }
  }
});