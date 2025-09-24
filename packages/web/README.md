# Audio Analyzer Web App

A professional web-based audio file analysis tool that provides detailed technical information about audio files and validates them against specified criteria.

## Features

- **Local File Analysis**: Drag and drop or browse to analyze local audio files
- **Google Drive Integration**: Analyze audio files directly from Google Drive links (coming soon)
- **Advanced Audio Analysis**: Peak level detection, noise floor analysis, and normalization recommendations
- **Criteria Validation**: Set target specifications and get visual pass/fail validation
- **Multiple Format Support**: WAV, MP3, FLAC, AAC, M4A, OGG
- **Progressive Web App**: Installable on desktop and mobile devices
- **Responsive Design**: Works perfectly on all screen sizes

## Technical Analysis

The app provides comprehensive technical information including:

- File format and codec information
- Sample rate and bit depth
- Channel configuration
- Duration and file size
- Advanced metrics (peak levels, noise floor, etc.)

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Serve built files
npm run serve
```

### Architecture

This web app is part of a monorepo that includes:

- `@audio-analyzer/core` - Shared audio analysis engine
- `@audio-analyzer/extension` - Chrome extension
- `@audio-analyzer/desktop` - Electron desktop app
- `@audio-analyzer/web` - This web application

The web app imports the shared core engine to maintain consistency across all platforms.

## Deployment

The app can be deployed to any static hosting service:

### Netlify / Vercel

1. Build the project: `npm run build`
2. Deploy the `dist/` folder
3. Configure redirects for SPA routing if needed

### GitHub Pages

1. Build the project: `npm run build`
2. Deploy the `dist/` folder to your gh-pages branch

### Custom Server

1. Build the project: `npm run build`
2. Serve the `dist/` folder with any web server (nginx, Apache, etc.)

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires modern browser features:
- Web Audio API
- File API
- ES6 Modules
- CSS Grid

## PWA Features

The web app is a Progressive Web App with:

- Offline functionality (coming soon)
- Install prompts
- App-like experience
- Responsive design
- Web app manifest

## Google Drive Integration

Web-based Google Drive integration requires different OAuth setup compared to the desktop app:

1. Create a Web Application OAuth client in Google Cloud Console
2. Configure authorized JavaScript origins
3. Implement web-based OAuth flow
4. Handle CORS and security considerations

*Currently showing placeholder - full implementation coming soon.*

## License

MIT License - see LICENSE file for details.