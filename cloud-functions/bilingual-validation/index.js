/**
 * Google Cloud Function to provide bilingual validation data
 *
 * Returns conversation IDs, language codes, and contributor pairs
 * for validating bilingual conversational audio filenames
 */

const validationData = require('./validation-data.json');

/**
 * HTTP Cloud Function
 *
 * @param {Object} req Cloud Function request context
 * @param {Object} res Cloud Function response context
 */
exports.bilingualValidation = (req, res) => {
  // Set CORS headers for cross-origin requests
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  // Optional: Add simple API key authentication
  // const apiKey = req.query.key || req.headers['x-api-key'];
  // const validKey = process.env.API_KEY || 'your-secret-key';
  // if (apiKey !== validKey) {
  //   res.status(401).json({ error: 'Unauthorized' });
  //   return;
  // }

  try {
    // Return validation data
    res.status(200).json({
      success: true,
      data: {
        languageCodes: validationData.languageCodes,
        conversationsByLanguage: validationData.conversationsByLanguage,
        contributorPairs: validationData.contributorPairs
      },
      metadata: {
        totalLanguages: validationData.languageCodes.length,
        totalContributorPairs: validationData.contributorPairs.length,
        conversationCounts: Object.keys(validationData.conversationsByLanguage).reduce((acc, lang) => {
          acc[lang] = validationData.conversationsByLanguage[lang].length;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error serving validation data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
