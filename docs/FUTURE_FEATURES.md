# Future Features and Enhancements

This document outlines potential future features and significant enhancements for the Audio Analyzer application.

## 1. Google Sheets Integration for Export

**Concept:** Allow users to directly export analysis results to a new or existing Google Sheet, rather than just downloading a CSV file.

**Requirements:**
*   **Google Sheets API Integration:** Utilize the Google Sheets API to programmatically create and populate spreadsheets.
*   **OAuth Scopes:** The application's Google OAuth authentication would need to request additional scopes specifically for Google Sheets (`https://www.googleapis.com/auth/spreadsheets`).
*   **User Interface:** Develop UI elements for:
    *   Initiating the Google Sheets export.
    *   Allowing the user to choose between creating a new sheet or updating an existing one.
    *   Potentially selecting a target folder in Google Drive.
*   **Data Mapping:** Define how the `AudioResults` data maps to columns and rows within a Google Sheet.
*   **Error Handling:** Implement robust error handling for API failures, permission issues, and rate limits.

**Benefits:**
*   More seamless integration for users already working within the Google ecosystem.
*   Eliminates the manual step of uploading a CSV file to Google Sheets.

**Considerations:**
*   **Increased Complexity:** This is a significantly more complex feature than CSV export, requiring substantial development effort for API integration, authentication flow adjustments, and UI.
*   **User Experience:** Ensure a clear and intuitive user experience for granting permissions and managing sheet creation/updates.

## 2. Web Worker Implementation for Parallel Processing

**Concept:** Offload CPU-intensive audio analysis tasks to Web Workers to improve UI responsiveness and leverage multi-core processors for faster analysis, especially for multi-channel audio.

**Details:** (Refer to `docs/WEB_WORKER_STRATEGY.md` for a detailed breakdown)

