# Analytics Implementation Plan - Umami

## 1. Objective

To integrate privacy-first analytics using Umami to gain insights into user behavior, application performance, and error occurrences. This approach is GDPR-compliant by default, requires no cookie consent banners, and provides meaningful insights without building custom infrastructure.

## 2. Why Umami?

- **GDPR Compliant by Default**: No cookies, no personal data collection, no consent banners needed
- **Free & Open Source**: Self-hosted solution with no ongoing costs (just hosting ~$5-10/month)
- **Privacy-Respecting**: Users won't block it like they do Google Analytics
- **Simple Integration**: One script tag + event tracking API
- **Quick Setup**: Deploy to Vercel/Railway/other platforms in ~30 minutes
- **Good Analytics**: Provides all the insights we need without complexity

## 3. Key Metrics to Track

### User Engagement
- **Page Views**: Automatic tracking of visits to the application
- **Active Users**: Number of unique visitors (daily, weekly, monthly)
- **Feature Usage**: Custom events for tab usage (Local File, Google Drive, Box, Settings)
- **Analysis Modes**: Track which analysis modes are used (`full`, `filename-only`, `experimental`)

### File Processing
- **Files Processed**: Total number of files analyzed
- **Processing Outcomes**: Track results as custom events:
    - Success (`pass`)
    - Warning (`warning`)
    - Failure (`fail`)
    - Error (application errors during processing)
- **File Types**: Distribution of audio formats being processed
- **File Sizes**: Track file size ranges

### Performance & Errors
- **Processing Time**: Track analysis duration
- **Application Errors**: Log unhandled exceptions with context
- **API Errors**: Track errors from Google Drive and Box integrations

## 4. Implementation Strategy

### a. Umami Setup

**Option 1: Deploy to Vercel (Recommended)**
1. Fork Umami repository or use Vercel template
2. Deploy to Vercel (free tier sufficient)
3. Add website in Umami dashboard
4. Get tracking script and website ID

**Option 2: Deploy to Railway**
1. Use Railway's one-click Umami deployment
2. Configure database (PostgreSQL)
3. Set up website and get tracking code

### b. Analytics Service (`analytics-service.ts`)

Create a thin wrapper at `packages/web/src/services/analytics-service.ts`:

```typescript
class AnalyticsService {
  track(eventName: string, properties?: Record<string, any>) {
    if (window.umami) {
      window.umami.track(eventName, properties);
    }
  }
}

export const analyticsService = new AnalyticsService();
```

### c. Integration Points

**`packages/web/index.html`:**
- Add Umami tracking script in `<head>`

**`packages/web/src/services/audio-analysis-service.ts`:**
- Track `file_analyzed` event with file type, size, status, processing time
- Track `analysis_error` event with error type and context

**`packages/web/src/components/App.svelte`:**
- Track `tab_switch` event when user navigates between tabs

**`packages/web/src/bridge/service-coordinator.ts`:**
- Track authentication events: `google_signin`, `box_signin`, etc.
- Track authentication errors

## 5. Phased Rollout

### Phase 1: Setup & Core Metrics (MVP)
1. Deploy Umami instance to Vercel/Railway
2. Add tracking script to index.html
3. Create `analytics-service.ts` wrapper
4. Track file analysis events (outcomes, file types, sizes)
5. Track analysis errors

### Phase 2: User Engagement
1. Track tab navigation
2. Track authentication events
3. Track analysis mode selection
4. Track preset usage

### Phase 3: Performance & Advanced Metrics
1. Track processing time distribution
2. Track batch processing statistics
3. Add more detailed error context
4. Track feature-specific metrics (reverb analysis, noise floor, etc.)

## 6. Privacy Considerations

- **No Personal Data**: Umami doesn't collect any personally identifiable information
- **No Cookies**: Compliant with GDPR, CCPA, PECR without consent banners
- **Data Ownership**: All analytics data stored in our own database
- **Transparent**: Can add link to privacy policy explaining analytics usage

## 7. Cost Analysis

**Umami (Self-Hosted on Vercel):**
- Hosting: Free (Vercel free tier)
- Database: ~$5/month (Vercel Postgres hobby tier or free Railway PostgreSQL)
- Maintenance: Minimal (auto-updates available)

**Total: ~$0-5/month** vs. building custom infrastructure (weeks of dev time + ongoing maintenance)

## 8. Future Enhancements

- **Custom Dashboard**: Build custom views using Umami's API if needed
- **Real-time Alerts**: Set up monitoring for critical errors using Umami webhooks
- **A/B Testing**: Use event properties to track experiment variants
- **Retention Analysis**: Track user cohorts and returning visitor patterns
