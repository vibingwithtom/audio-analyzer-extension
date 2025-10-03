const functions = require('@google-cloud/functions-framework');

/**
 * Google Cloud Function to proxy Box requests and handle OAuth
 * Provides: 1) CORS proxy for file downloads, 2) OAuth token exchange
 */
functions.http('boxProxy', async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // Check if this is a token exchange request
  if (req.path === '/token' || req.query.action === 'token') {
    return handleTokenExchange(req, res);
  }

  // Otherwise, handle as a proxy request
  return handleProxyRequest(req, res);
});

/**
 * Handle OAuth token exchange
 */
async function handleTokenExchange(req, res) {
  try {
    const code = req.method === 'GET' ? req.query.code : req.body.code;

    if (!code) {
      res.status(400).json({ error: 'Missing authorization code' });
      return;
    }

    const clientId = process.env.BOX_CLIENT_ID;
    const clientSecret = process.env.BOX_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Missing Box OAuth credentials');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    // Get the redirect URI from environment variable or construct it
    const redirectUri = process.env.BOX_REDIRECT_URI || 'https://audio-analyzer.tinytech.site/beta';

    // Exchange the authorization code for an access token
    const tokenResponse = await fetch('https://api.box.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Box token exchange failed:', tokenResponse.status, errorText);
      res.status(tokenResponse.status).json({
        error: 'Token exchange failed',
        details: errorText
      });
      return;
    }

    const tokenData = await tokenResponse.json();
    res.json(tokenData);

  } catch (error) {
    console.error('Error in token exchange:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Handle proxy requests for file downloads
 */
async function handleProxyRequest(req, res) {
  try {
    // Get Box URL from query parameter or request body
    const boxUrl = req.method === 'GET'
      ? req.query.url
      : req.body.url;

    if (!boxUrl) {
      res.status(400).json({ error: 'Missing url parameter' });
      return;
    }

    // Validate it's a Box URL or Box API URL
    if (!boxUrl.includes('box.com')) {
      res.status(400).json({ error: 'Invalid Box URL' });
      return;
    }

    // Get BoxApi header value if provided (this is the shared link URL)
    const sharedLinkUrl = req.method === 'GET'
      ? req.query.boxapi
      : req.body.boxapi;

    // Get Authorization token if provided
    const authToken = req.method === 'GET'
      ? req.query.token
      : req.body.token;

    console.log('Fetching Box URL:', boxUrl);
    if (sharedLinkUrl) {
      console.log('Using shared link:', sharedLinkUrl);
    }
    if (authToken) {
      console.log('Using auth token');
    }

    // Prepare headers
    const headers = {
      'User-Agent': 'Audio-Analyzer/1.0'
    };

    // Add Authorization header if token is provided
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Add BoxApi header if shared link is provided
    // The sharedLinkUrl is already URL-encoded from the query param, so decode it first
    if (sharedLinkUrl) {
      // Decode the URL that was passed in
      let decodedLink = decodeURIComponent(sharedLinkUrl);

      // Strip /file/ID or /folder/ID from the end - Box expects just the base shared link
      decodedLink = decodedLink.replace(/\/(file|folder)\/\d+$/, '');

      // Box expects: BoxApi: shared_link=[url]
      headers['BoxApi'] = `shared_link=${decodedLink}`;
      console.log('BoxApi header set to:', headers['BoxApi']);
    }

    // Fetch the file from Box
    const response = await fetch(boxUrl, {
      redirect: 'follow',
      headers
    });

    if (!response.ok) {
      console.error('Box fetch failed:', response.status, response.statusText);
      res.status(response.status).json({
        error: `Failed to fetch from Box: ${response.statusText}`
      });
      return;
    }

    // Get the file as a buffer
    const buffer = await response.arrayBuffer();

    // Set appropriate headers
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition') || '';

    res.set('Content-Type', contentType);
    if (contentDisposition) {
      res.set('Content-Disposition', contentDisposition);
    }

    // Send the file
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Error proxying Box request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
