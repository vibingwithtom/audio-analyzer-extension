# Bilingual Validation Cloud Function

This Google Cloud Function provides validation data for bilingual conversational audio files.

## Data Structure

Returns JSON with:
- **languageCodes**: Array of valid language codes (16 languages)
- **conversationsByLanguage**: Object mapping language codes to arrays of valid conversation IDs
- **contributorPairs**: Array of valid [talent1ID, talent2ID] pairs

## Usage

```javascript
const response = await fetch('https://YOUR-FUNCTION-URL/bilingualValidation');
const { data } = await response.json();

// Validate a filename like: vdlg1_001_budgeting_app-en_us-user-10101-agent-10102
const parts = filename.split('-');
const conversationId = parts[0];
const languageCode = parts[1];
const userId = parts[3];
const agentId = parts[5];

// Check conversation ID for this language
const isValidConversation = data.conversationsByLanguage[languageCode]?.includes(conversationId);

// Check contributor pair (order doesn't matter)
const isValidPair = data.contributorPairs.some(pair =>
  (pair[0] === userId && pair[1] === agentId) ||
  (pair[0] === agentId && pair[1] === userId)
);
```

## Data Sources

The validation data is generated from CSV files in the `data/` directory (not deployed):
- `conversationIDs.csv` - Conversation IDs organized by language
- `contributorIDs.csv` - Valid contributor ID pairs
- `languageIDs.csv` - Valid language codes

## Deployment

```bash
npm run deploy
```

Or manually:
```bash
gcloud functions deploy bilingualValidation \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1
```

## Security

The function is currently unauthenticated for ease of use. To add API key authentication, uncomment the authentication section in `index.js` and set the `API_KEY` environment variable.
