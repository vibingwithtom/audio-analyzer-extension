# Analytics Implementation Plan

## 1. Objective

To integrate analytics into the web app to gain insights into user behavior, application performance, and error occurrences. This will help in making data-driven decisions for future development and improving the user experience.

## 2. Key Metrics to Track

### User Engagement
- **Active Users:** Number of unique users (daily, weekly, monthly).
- **Session Duration:** How long users are actively using the app.
- **Feature Usage:** Which tabs are most frequently used (Local File, Google Drive, Box, Settings).
- **Analysis Modes:** Usage of different analysis modes (e.g., `full`, `filename-only`, `experimental`).

### File Processing
- **Total Files Processed:** The total number of files processed by the application.
- **Processing Outcomes:** A breakdown of file processing results:
    - Success (`pass`)
    - Warning (`warning`)
    - Failure (`fail`)
    - Error (application errors during processing)
- **File Sizes and Types:** Distribution of file sizes and types being processed.

### Performance & Errors
- **Processing Time:** The average time taken to analyze a file.
- **Application Errors:** Capturing and logging of unhandled exceptions and other errors.
- **API Errors:** Errors related to third-party services like Google Drive and Box.

## 3. Implementation Strategy

### a. Analytics Service (`analytics-service.ts`)

A new centralized service will be created at `packages/web/src/services/analytics-service.ts`. This service will be a singleton and will provide a simple API for tracking events and errors.

**Key Responsibilities:**
- **User Identification:** Generate and manage a unique anonymous user ID stored in `localStorage`.
- **Event Tracking:** A `trackEvent(eventName, properties)` method to send analytics data.
- **Error Tracking:** A `trackError(error, context)` method to log errors with relevant context.
- **Data Transmission:** Send data to a backend endpoint using `navigator.sendBeacon` for reliability.

### b. Backend Endpoint

A new cloud function will be created to serve as the analytics endpoint (e.g., `/api/analytics`). Initially, this function will log the received data to the console. In the future, it can be configured to store the data in a database like Firestore or a data warehouse like BigQuery.

### c. Integration with Existing Code

The `analyticsService` will be integrated into the following parts of the application:

- **`packages/web/src/components/App.svelte`:**
    - Track `page_view` on initial load.
    - Track `tab_navigation` when the user switches between tabs (`$currentTab` store).

- **`packages/web/src/bridge/service-coordinator.ts`:**
    - Track authentication events: `google_signin_success`, `google_signin_error`, `box_signin_success`, etc.

- **`packages/web/src/services/audio-analysis-service.ts`:**
    - **`analyzeAudioFile` function:**
        - Track `analysis_started` event with file details (size, type, analysis mode).
        - Wrap the analysis logic in a `try...catch` block to track `analysis_error`.
        - Track `analysis_completed` event with the final `status` (`pass`, `warning`, `fail`) and other results.

### d. User Identification

- On the first visit, a unique user ID (UUID) will be generated and stored in `localStorage`.
- This ID will be included in every analytics event to track user sessions and journeys.
- If a user logs in, the anonymous ID can be associated with their authenticated user ID for more detailed tracking.

## 4. Phased Rollout

### Phase 1: Core Metrics (MVP)
1.  Implement the `analytics-service.ts`.
2.  Create the basic backend endpoint (logging only).
3.  Integrate tracking for file processing outcomes (`analysis_completed`) in `audio-analysis-service.ts`.
4.  Track application errors.

### Phase 2: User Engagement
1.  Add tracking for tab navigation in `App.svelte`.
2.  Track authentication events in `service-coordinator.ts`.
3.  Track analysis mode usage.

### Phase 3: Performance & Advanced Metrics
1.  Add tracking for file processing time.
2.  Implement more detailed error context.
3.  Set up a proper data store for the analytics data (e.g., Firestore).

## 5. Future Enhancements

- **Dashboard:** Create a dashboard to visualize the collected analytics data.
- **A/B Testing:** Use the analytics framework to conduct A/B tests for new features.
- **Real-time Monitoring:** Set up real-time monitoring and alerting for critical errors.
- **User Cohort Analysis:** Analyze the behavior of different user cohorts over time.
