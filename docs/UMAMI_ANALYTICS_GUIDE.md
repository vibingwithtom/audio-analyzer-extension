# Umami Analytics Guide

This guide shows you how to analyze Audio Analyzer usage patterns using Umami Cloud's current interface.

## Quick Access
- **Umami Dashboard**: https://cloud.umami.is
- **Website ID**: `4d81549d-6c9e-4235-922c-c15b14351b17`

---

## Table of Contents
1. [Understanding Umami's Interface](#understanding-umamis-interface)
2. [Essential Analytics Views](#essential-analytics-views)
3. [Key Metrics to Track](#key-metrics-to-track)
4. [How to Filter Data](#how-to-filter-data)
5. [Common Analysis Patterns](#common-analysis-patterns)
6. [Troubleshooting](#troubleshooting)

---

## Understanding Umami's Interface

Umami Cloud organizes analytics into these main sections:

### Traffic
- **Overview**: Page views, visitors, bounce rate
- **Events**: All your custom tracked events (this is the most important section)
- **Sessions**: User session data
- **Realtime**: Live activity
- **Compare**: Compare time periods
- **Breakdown**: Group data by dimensions

### Behavior
- **Goals**: Not used in this implementation
- **Funnels**: Create conversion funnels (useful for auth flows)
- **Journeys**: See user paths through your app
- **Retention**: User return patterns

### Audience
- **Segments**: Create user segments
- **Cohorts**: Analyze user cohorts over time

### Growth
- **UTM**: Campaign tracking (not used)
- **Revenue**: Not applicable
- **Attribution**: Not applicable

---

## Essential Analytics Views

### 1. **File Processing Success Rate**

**Purpose**: Track how many files pass validation vs fail

**How to View**:
1. Go to **Traffic → Events**
2. Find and click on `analysis_completed` event
3. In the event details, look for the `status` property
4. Click on `status` to see breakdown by pass/warning/fail/error
5. Use date picker at top to change time range (default: last 24 hours)

**How to Filter**:
- Look for filter options in the event view
- Add filter: `environment` equals `production` (exclude beta testing)
- Add filter: `presetId` to see specific preset results

**Insights**:
- See pass/warning/fail distribution
- Identify if certain presets have higher failure rates
- Track improvement over time

---

### 2. **Feature Adoption Analysis**

**Purpose**: See which features users are actually using

**How to View**:
1. Go to **Traffic → Events**
2. Compare event counts for:
   - `analysis_mode_changed` (Basic feature)
   - `batch_processing_started` (Advanced feature)
   - `experimental_analysis_used` (Advanced feature)
   - `google_signin_success` (Integration)
   - `box_signin_success` (Integration)
3. Click each event to see detailed breakdowns

**Insights**:
- Which features are most popular
- Feature discovery rate
- Advanced vs basic user ratio

---

### 3. **Batch Processing Analytics**

**Purpose**: Understand batch processing patterns

**How to View**:
1. Go to **Traffic → Events**
2. Click on `batch_processing_completed` event
3. View properties:
   - Click `source` to see breakdown (local/google_drive/box)
   - Look at numeric properties like `totalFiles`, `batchProcessingTime`
4. Compare with `batch_processing_cancelled` to see cancellation rate

**How to Analyze**:
- Click **Traffic → Breakdown** and select:
  - Event: `batch_processing_completed`
  - Group by: `source`
  - This shows which source is used most

**Insights**:
- Which source is used most for batching
- Average batch size
- Cancellation rate (user friction indicator)
- Processing performance

---

### 4. **Analysis Mode Distribution**

**Purpose**: See which analysis modes users prefer

**How to View**:
1. Go to **Traffic → Events**
2. Click on `analysis_mode_changed` event
3. Click on the `mode` property to see breakdown
4. Click on `previousMode` to see switching patterns

**Insights**:
- Most popular mode (audio-only/full/filename-only/experimental)
- Mode switching patterns (what users switch from/to)
- Feature discovery (how many users try experimental)

---

### 5. **Preset Usage**

**Purpose**: Which presets are most popular

**How to View**:
1. Go to **Traffic → Events**
2. Click on `preset_changed` event
3. Click on `presetId` property to see breakdown
4. Change date range to "Last 30 days" for trend

**Insights**:
- Most popular presets
- Custom criteria usage
- Preset switching frequency

---

### 6. **Error Tracking**

**Purpose**: Monitor errors and failure patterns

**How to View**:
1. Go to **Traffic → Events**
2. Click on `analysis_error` event
3. View properties:
   - `error` - Error messages
   - `fileType` - Which formats cause errors
   - `analysisMode` - Which modes fail most
   - `presetId` - Preset-specific errors
4. Use date range to track trends over time

**Insights**:
- Most common errors
- Error trends over time
- File types with issues

---

### 7. **Authentication Flow**

**Purpose**: Track auth success/failure rates

**Using Funnels**:
1. Go to **Behavior → Funnels**
2. Create a new funnel with steps:
   - Step 1: `google_signin_requested` (start)
   - Step 2: `google_signin_success` (success)
3. Create a separate view for errors:
   - Go to **Traffic → Events**
   - Compare `google_auth_error` and `box_auth_error` counts

**Insights**:
- Auth conversion rate
- Common auth errors
- Which service has better UX (Google vs Box)

---

### 8. **User Journey Analysis**

**Purpose**: Understand common workflows

**Using Journeys**:
1. Go to **Behavior → Journeys**
2. This shows the sequence of events users trigger
3. Look for common patterns like:
   - `tab_switched` → which tabs are visited
   - `preset_changed` → configuration
   - `analysis_started` → usage
   - `analysis_completed` → outcome

**Using Events**:
1. Go to **Traffic → Events**
2. Click on `tab_switched` to see which tabs are most popular
3. View `fromTab` and `toTab` properties for navigation patterns

**Insights**:
- Common user paths
- Where users get stuck
- Feature discovery order

---

## Key Metrics to Track

### Daily Active Metrics

**Where to Find**: Traffic → Events

1. **Total files analyzed**:
   - Look at `analysis_started` event count
   - Change date picker to "Today"

2. **Success rate**:
   - Click `analysis_completed` event
   - Click `status` property
   - Calculate: pass count / total count

3. **Active users**:
   - Traffic → Overview
   - Look at "Visitors" metric (auto-tracked by Umami)

4. **Feature adoption**:
   - Look at `experimental_analysis_used` event count

### Weekly Trends

**Where to Find**: Traffic → Events (set date range to "Last 7 days")

1. **Batch processing growth**:
   - `batch_processing_started` event count
   - Use Compare feature to compare to previous week

2. **Cloud integration usage**:
   - Add up `google_signin_success` + `box_signin_success` counts

3. **Error rate**:
   - Compare `analysis_error` count to `analysis_started` count
   - Calculate percentage

4. **Mode distribution changes**:
   - Click `analysis_mode_changed` event
   - View `mode` property breakdown

### Performance Metrics

**Where to Find**: Traffic → Events (click individual events to see properties)

1. **Average processing time**:
   - Click `analysis_completed` event
   - Look at `processingTime` property statistics

2. **Average batch size**:
   - Click `batch_processing_completed` event
   - Look at `totalFiles` property statistics

3. **Batch processing time**:
   - Click `batch_processing_completed` event
   - Look at `batchProcessingTime` property statistics

4. **Cancellation rate**:
   - Compare `batch_processing_cancelled` to `batch_processing_started` counts
   - Calculate percentage

---

## How to Filter Data

When viewing any event in **Traffic → Events**, you can filter the data by event properties.

### Most Important Filter: Environment

**Always filter by environment to exclude beta testing from production analysis:**

- Click the event you want to analyze
- Look for filter controls (usually near the top of the event details)
- Add filter: `environment` equals `production`

**Environment Values**:
- `production` - Real users on main site
- `beta` - Testing on /beta/ path
- `development` - Local development (localhost)

### Other Useful Filters

**Filter by Source** (for batch processing):
- `source = local` - Local file uploads
- `source = google_drive` - Google Drive
- `source = box` - Box

**Filter by Analysis Mode**:
- `analysisMode = audio-only` - Basic mode
- `analysisMode = experimental` - Advanced features
- `analysisMode = filename-only` - Fast validation
- `analysisMode = full` - Complete analysis

**Filter by Status** (for analysis_completed):
- `status = pass` - Successful validation
- `status = warning` - Warning state
- `status = fail` - Validation failure
- `status = error` - Processing error

**Filter by Preset**:
- `presetId = character-recordings`
- `presetId = bilingual-conversational`
- `presetId = three-hour`
- `presetId = custom`

---

## Common Analysis Patterns

These step-by-step patterns show you how to answer common questions about your app's usage.

### Pattern 1: Production Success Rate (Last 7 Days)

**Question**: What percentage of files pass validation?

**Steps**:
1. Go to **Traffic → Events**
2. Set date range to "Last 7 days" (top right date picker)
3. Click on `analysis_completed` event
4. Add filter: `environment` equals `production`
5. Click on `status` property to see breakdown

**What You'll See**: Bar/pie chart showing pass/warning/fail/error counts and percentages

---

### Pattern 2: Most Used Presets

**Question**: Which presets do users prefer?

**Steps**:
1. Go to **Traffic → Events**
2. Set date range to "Last 30 days"
3. Click on `analysis_started` event (or `preset_changed`)
4. Add filter: `environment` equals `production`
5. Click on `presetId` property to see breakdown

**What You'll See**: Ranked list of preset usage with counts

---

### Pattern 3: Experimental Feature Adoption Trend

**Question**: Are users discovering experimental features over time?

**Steps**:
1. Go to **Traffic → Events**
2. Set date range to "Last 90 days" or "All time"
3. Find `experimental_analysis_used` event
4. Add filter: `environment` equals `production`
5. The event count over time shows adoption trend

**What You'll See**: Line chart showing growth in experimental feature usage

---

### Pattern 4: Batch Processing by Source

**Question**: Do users prefer local files or cloud storage for batch processing?

**Steps**:
1. Go to **Traffic → Events**
2. Click on `batch_processing_completed` event
3. Add filter: `environment` equals `production`
4. Click on `source` property to see breakdown

**Alternative using Breakdown**:
1. Go to **Traffic → Breakdown**
2. Select event: `batch_processing_completed`
3. Group by: `source`
4. Add filter: `environment = production`

**What You'll See**: Comparison of local vs google_drive vs box usage

---

### Pattern 5: Mode Switching Patterns

**Question**: What modes are users switching between?

**Steps**:
1. Go to **Traffic → Events**
2. Set date range to "Last 30 days"
3. Click on `analysis_mode_changed` event
4. Add filter: `environment` equals `production`
5. Click on `previousMode` property, then click on `mode` property

**What You'll See**:
- Which modes users start from
- Which modes they switch to
- Common transitions (e.g., audio-only → experimental = feature discovery)

---

### Pattern 6: Error Distribution by File Type

**Question**: Which audio formats cause the most errors?

**Steps**:
1. Go to **Traffic → Events**
2. Click on `analysis_error` event
3. Add filter: `environment` equals `production`
4. Click on `fileType` property to see breakdown

**What You'll See**: List of file types (wav, mp3, etc.) with error counts

---

### Pattern 7: Cloud Service Comparison

**Question**: Is Google Drive or Box more popular?

**Steps**:
1. Go to **Traffic → Events**
2. Set date range to "Last 30 days"
3. Add filter: `environment` equals `production` (if available at event list level)
4. Compare event counts:
   - `google_signin_success`
   - `box_signin_success`

**What You'll See**: Direct count comparison showing which service is used more

---

### Pattern 8: Why Do Users Reprocess Files?

**Question**: What changes do users make when reprocessing?

**Steps**:
1. Go to **Traffic → Events**
2. Click on `reprocess_requested` event
3. Add filter: `environment` equals `production`
4. Click on `previousMode` and `newMode` properties to see what changes

**What You'll See**:
- How often users reprocess
- Which modes they switch to
- Which source (local/google_drive/box) has most reprocessing

---

### Pattern 9: Batch Cancellation Analysis

**Question**: Do users cancel batches? When and why?

**Steps**:
1. Go to **Traffic → Events**
2. Compare two events:
   - `batch_processing_started` (total attempts)
   - `batch_processing_cancelled` (cancellations)
3. Calculate cancellation rate: cancelled / started
4. Click `batch_processing_cancelled` event
5. View properties:
   - `source` - Which source has most cancellations
   - `cancelledAt` - Percentage through batch when cancelled
   - `totalFiles` - Batch size when cancelled

**What You'll See**:
- Cancellation rate (e.g., 5% of batches are cancelled)
- When users cancel (early vs late in processing)
- Which source has friction issues

---

### Pattern 10: Which Presets Have Highest Failure Rates?

**Question**: Are certain presets too strict or problematic?

**Steps**:
1. Go to **Traffic → Events**
2. Set date range to "Last 30 days"
3. Click on `analysis_completed` event
4. Add filters:
   - `environment` equals `production`
   - `status` equals `fail`
5. Click on `presetId` property to see breakdown

**What You'll See**: Which presets have the most validation failures

---

## Advanced Analytics

### Using Cohorts (Audience → Cohorts)

Track user behavior over time:

1. **New User Cohorts**:
   - Create cohorts based on first visit date
   - See how many return in Week 1, Week 2, etc.
   - Available in **Audience → Cohorts**

2. **Feature Adoption Timeline**:
   - In **Traffic → Events**, filter by date ranges
   - Compare when users first trigger `experimental_analysis_used`
   - Look at `tab_switched` to see first-time navigation patterns

3. **Power Users**:
   - Filter `batch_processing_started` events
   - Look at frequency per user (if user IDs are tracked)
   - Identify users with high event counts

### Using Funnels (Behavior → Funnels)

Create conversion funnels to track user flows:

**Example: Google Auth Funnel**
1. Go to **Behavior → Funnels**
2. Create new funnel:
   - Step 1: `google_signin_requested`
   - Step 2: `google_signin_success`
3. See conversion rate and drop-off points

**Example: First-Time User Journey**
1. Step 1: `tab_switched` (first visit)
2. Step 2: `preset_changed` (configuration)
3. Step 3: `analysis_started` (first usage)
4. Step 4: `analysis_completed` (success)

### Using Journeys (Behavior → Journeys)

See the actual sequence of events users trigger:
- Go to **Behavior → Journeys**
- See common paths users take through your app
- Identify where users drop off
- Find unexpected usage patterns

### Performance Monitoring

Check these metrics regularly in **Traffic → Events**:

1. **Error Spikes**:
   - Monitor `analysis_error` count daily
   - Set up manual alerts if count is unusually high

2. **Processing Performance**:
   - Check `analysis_completed` → `processingTime` property
   - Watch for slowdowns (average >5000ms)

3. **Auth Failures**:
   - Monitor `google_auth_error` and `box_auth_error`
   - High counts indicate integration issues

---

## Common Insights to Look For

Here's what different patterns in your analytics might tell you:

### 1. **User Onboarding Success**

**Good Signs**:
- Users trigger `tab_switched` multiple times (exploring the app)
- `preset_changed` happens early (users configuring)
- `analysis_started` happens in first session

**Warning Signs**:
- High `analysis_error` rate for new users
- No `preset_changed` events (not discovering configuration)
- Single `tab_switched` event only (not exploring)

**Where to Check**: Behavior → Journeys, Traffic → Events

---

### 2. **Feature Discovery**

**Good Signs**:
- Growing `experimental_analysis_used` count over time
- `analysis_mode_changed` with mode=experimental
- Users trying multiple presets (`preset_changed`)

**Warning Signs**:
- No `experimental_analysis_used` events (feature is hidden)
- Only `audio-only` mode usage (not discovering full features)
- Only default preset usage

**Where to Check**: Traffic → Events (experimental_analysis_used, analysis_mode_changed)

---

### 3. **Pain Points and Friction**

**Warning Signs**:
- High `batch_processing_cancelled` rate (>10%)
- High `analysis_error` count
- Many `reprocess_requested` events (users fixing mistakes)
- `cancelledAt` property shows early cancellations (users giving up)

**What to Do**:
- Check `error` property in `analysis_error` for common issues
- Look at `fileType` causing most errors
- Review which `source` has most cancellations

**Where to Check**: Traffic → Events (analysis_error, batch_processing_cancelled)

---

### 4. **Success Patterns**

**Good Signs**:
- High pass rate in `analysis_completed` → `status`
- Low `batch_processing_cancelled` rate
- Repeat usage (see in Traffic → Sessions)
- Growing auth success events (users integrating cloud storage)

**Patterns to Find**:
- Which presets have highest pass rates
- Optimal batch sizes (check `totalFiles` in successful batches)
- Most popular workflows (see in Behavior → Journeys)

**Where to Check**: Traffic → Events (analysis_completed), Behavior → Journeys

---

### 5. **Platform Preferences**

**Questions to Answer**:
- Do users prefer local files or cloud storage?
  - Compare `batch_processing_completed` by `source`
- Is Google Drive or Box more popular?
  - Compare `google_signin_success` vs `box_signin_success`
- What's the most popular analysis mode?
  - Check `analysis_mode_changed` → `mode` property
- Which presets are most used?
  - Check `preset_changed` → `presetId` property

**Where to Check**: Traffic → Events, Traffic → Breakdown

---

## Troubleshooting

### Events Not Appearing in Umami?

**1. Check if Umami script is loaded:**
- Open your app in browser
- Open browser console (F12 or Cmd+Option+I)
- Type: `console.log(window.umami)`
- Should see: `function` (not `undefined`)

**2. Verify environment detection:**
- In browser console, type: `console.log(window.location.pathname)`
- Check output:
  - `/beta/...` = beta environment
  - `/` = production environment
  - `localhost` = development environment

**3. Check Content Security Policy (CSP):**
- In your index.html, verify `cloud.umami.is` is allowed in CSP
- Look for errors in browser console about blocked scripts

**4. Ad blockers:**
- Some privacy extensions (uBlock Origin, Privacy Badger) block analytics
- Test in incognito mode or with extensions disabled
- Umami is privacy-friendly but may still be blocked

**5. Wait a few minutes:**
- Events may take 1-2 minutes to appear in Umami dashboard
- Try refreshing the Umami dashboard

---

### Events Missing Properties?

**Expected Behavior:**
- ALL events should include `environment` property
- Event-specific properties should appear when you click the event

**If properties are missing:**
1. Check browser console for JavaScript errors
2. Verify `analyticsService.track()` is being called correctly:
   ```javascript
   // In browser console
   analyticsService.track('test_event', { testProp: 'value' })
   ```
3. Check that properties are being passed to the track function in code

---

### Event Counts Look Wrong?

**Beta traffic included?**
- Always filter by `environment = 'production'` to exclude beta testing
- Beta events should show `environment = 'beta'`

**Bot traffic?**
- Umami automatically filters known bots
- You shouldn't see bot traffic in your events

**Time zone issues?**
- Check Umami account timezone settings
- Events are timestamped based on your timezone

**Duplicate events?**
- Check if you're calling `analyticsService.track()` multiple times
- Look for duplicate listeners in your code

---

## Quick Start Checklist

Once you have analytics deployed and events are flowing, here's what to do:

### Day 1: Verify Everything Works
- [ ] Go to **Traffic → Events** and verify you see events
- [ ] Click on `analysis_completed` and verify properties appear
- [ ] Test filtering by `environment = production` or `beta`
- [ ] Check **Traffic → Overview** for page view data

### Week 1: Set Up Core Views
- [ ] Create an auth funnel in **Behavior → Funnels** (google_signin flow)
- [ ] Bookmark **Traffic → Events** with `environment = production` filter
- [ ] Check **Behavior → Journeys** to see user paths
- [ ] Review error events (`analysis_error`) for issues

### Week 2: Analyze Patterns
- [ ] Answer: What's our file validation pass rate?
- [ ] Answer: Which presets are most popular?
- [ ] Answer: Are users discovering experimental features?
- [ ] Answer: Do users prefer local or cloud batch processing?

### Monthly: Review Trends
- [ ] Compare this month to last month (use **Traffic → Compare**)
- [ ] Check for error rate changes
- [ ] Review auth success rates
- [ ] Look for new patterns in **Behavior → Journeys**

---

## Getting Help

**Umami Documentation:**
- Official docs: https://umami.is/docs
- Events tracking: https://umami.is/docs/track-events
- API reference: https://umami.is/docs/api

**Testing Your Setup:**
1. Visit beta site: https://audio-analyzer.tinytech.site/beta/
2. Perform actions (upload file, change mode, etc.)
3. Wait 1-2 minutes
4. Check Umami dashboard for events
5. Verify `environment = 'beta'` on all events

**Common Questions:**
- Q: Can I export data? A: Yes, use Umami's export feature
- Q: Can I set up alerts? A: Not built-in, but you can use Umami API
- Q: How long is data retained? A: Check your Umami Cloud plan
- Q: Can I see individual user sessions? A: Yes, in **Traffic → Sessions**

---

## Event Reference

Complete reference of all tracked events and their properties.

### Core Analysis Events

**`analysis_started`** - Triggered when file analysis begins
- Properties:
  - `filename` - Name of the file
  - `fileSize` - Size in bytes
  - `fileType` - Audio format (wav, mp3, etc.)
  - `analysisMode` - Mode used (audio-only/full/filename-only/experimental)
  - `presetId` - Selected preset ID
  - `environment` - Environment (production/beta/development)

**`analysis_completed`** - Triggered when analysis finishes successfully
- Properties:
  - `filename` - Name of the file
  - `status` - Result (pass/warning/fail)
  - `processingTime` - Time taken in milliseconds
  - `fileSize` - Size in bytes
  - `fileType` - Audio format
  - `analysisMode` - Mode used
  - `presetId` - Selected preset
  - `environment` - Environment

**`analysis_error`** - Triggered when analysis fails
- Properties:
  - `error` - Error message
  - `filename` - Name of the file that failed
  - `fileType` - Audio format
  - `analysisMode` - Mode that was attempted
  - `presetId` - Preset being used
  - `environment` - Environment

**`experimental_analysis_used`** - Triggered when experimental features are used
- Properties:
  - `hasStereoSeparation` - Boolean
  - `stereoType` - Type of stereo detected
  - `hasMicBleed` - Boolean
  - `hasReverb` - Boolean
  - `hasNoiseFloor` - Boolean
  - `hasSilenceDetection` - Boolean
  - `environment` - Environment

---

### Batch Processing Events

**`batch_processing_started`** - Triggered when batch begins
- Properties:
  - `totalFiles` - Number of files in batch
  - `analysisMode` - Mode for batch
  - `presetId` - Preset for batch
  - `source` - Source (local/google_drive/box)
  - `environment` - Environment

**`batch_processing_completed`** - Triggered when batch finishes
- Properties:
  - `totalFiles` - Total files in batch
  - `processedFiles` - Files successfully processed
  - `passCount` - Files that passed
  - `warnCount` - Files with warnings
  - `failCount` - Files that failed
  - `errorCount` - Files with errors
  - `batchProcessingTime` - Total time in milliseconds
  - `totalAudioDuration` - Total audio duration in seconds
  - `wasCancelled` - Boolean (if user cancelled)
  - `source` - Source type
  - `environment` - Environment

**`batch_processing_cancelled`** - Triggered when user cancels batch
- Properties:
  - `source` - Source type
  - `processedFiles` - Files processed before cancel
  - `totalFiles` - Total files in batch
  - `cancelledAt` - Percentage completed when cancelled
  - `environment` - Environment

---

### User Action Events

**`tab_switched`** - Triggered when user changes tabs
- Properties:
  - `fromTab` - Previous tab name
  - `toTab` - New tab name
  - `environment` - Environment

**`preset_changed`** - Triggered when user changes preset
- Properties:
  - `presetId` - New preset ID
  - `presetName` - New preset display name
  - `environment` - Environment

**`analysis_mode_changed`** - Triggered when user changes analysis mode
- Properties:
  - `mode` - New mode (audio-only/full/filename-only/experimental)
  - `previousMode` - Previous mode (for transition analysis)
  - `environment` - Environment

**`reprocess_requested`** - Triggered when user reprocesses files
- Properties:
  - `previousMode` - Mode before reprocess
  - `newMode` - Mode for reprocess
  - `source` - Source type (local/google_drive/box)
  - `isBatch` - Boolean (batch or single file)
  - `fileCount` - Number of files to reprocess
  - `environment` - Environment

**`simplified_mode_activated`** - Triggered when simplified mode is activated
- Properties:
  - `preset` - Preset ID used in simplified mode
  - `analysisMode` - Analysis mode used
  - `presetName` - Preset display name
  - `supportsFilenameValidation` - Boolean
  - `environment` - Environment

---

### Authentication Events

**`google_signin_requested`** - User clicks Google sign in button
- Properties:
  - `environment` - Environment

**`google_signin_success`** - Google authentication succeeds
- Properties:
  - `environment` - Environment

**`google_signout`** - User signs out of Google
- Properties:
  - `environment` - Environment

**`google_auth_error`** - Google authentication fails
- Properties:
  - `error` - Error message
  - `environment` - Environment

**`box_signin_requested`** - User clicks Box sign in button
- Properties:
  - `environment` - Environment

**`box_signin_success`** - Box authentication succeeds
- Properties:
  - `environment` - Environment

**`box_signout`** - User signs out of Box
- Properties:
  - `environment` - Environment

**`box_auth_error`** - Box authentication fails
- Properties:
  - `error` - Error message
  - `environment` - Environment

---

## Summary

This guide covers how to use Umami Cloud's current interface to analyze your Audio Analyzer usage patterns. Key takeaways:

1. **Traffic → Events** is your main view - all custom events appear here
2. **Always filter by `environment = 'production'`** to exclude beta testing
3. **Click on events** to see their properties and breakdowns
4. **Use Behavior → Funnels** for conversion tracking
5. **Use Behavior → Journeys** to see user paths
6. **Use Traffic → Breakdown** to group data by dimensions

The analytics implementation tracks 27+ events with comprehensive properties, giving you deep insights into how users interact with your application.

---

**Last Updated**: 2025-01-13
**Umami Version**: Cloud Hosted
**Website ID**: `4d81549d-6c9e-4235-922c-c15b14351b17`
**Analytics Implementation**: Complete (Phase 4)
