# Export Functionality Plan

## Feature: Export Results List

**Goal:** Enable users to export the displayed audio analysis results into a downloadable file, primarily CSV format for easy spreadsheet integration.

### Phase 1: Define Export Format and Data Structure

*   **Format:** CSV (Comma Separated Values) as the primary export format.
*   **Data Mapping:** Determine which fields from the `AudioResults` object should be included and how nested data should be flattened into columns.
    *   **Example Headers:** Filename, Peak Level (dB), Normalization Status, Reverb (Overall RT60), Reverb (Left RT60), Reverb (Right RT60), Clipping (Percentage), Clipping (Events), Silence (Lead), Silence (Trail), Silence (Max), Stereo Type, Speech Overlap (%), Channel Consistency (%), Mic Bleed (Detected).
    *   **Consideration:** Export all available detailed data if `experimentalMode` is active.

### Phase 2: Implement Data Extraction and Formatting Utility

*   **File:** Create a new utility file: `packages/web/src/utils/export-utils.ts`.
*   **Function:** Add an asynchronous function `exportResultsToCsv(results: AudioResults[], filename: string): Promise<void>`.
*   **Logic:**
    1.  **Generate Headers:** Dynamically create CSV headers based on the chosen data mapping.
    2.  **Format Rows:** Iterate through the `results` array. For each `AudioResults` object, extract and format the data into a CSV row, handling:
        *   Numeric formatting (e.g., `toFixed(2)`).
        *   Boolean/status mapping (e.g., `true`/`false`, `pass`/`fail`).
        *   Flattening nested objects (e.g., `result.reverbAnalysis.perChannelRt60[0].medianRt60` for Left RT60).
        *   Handling `undefined`/`null` values gracefully (e.g., `N/A` or empty string).
    3.  **Combine:** Join headers and rows with newline characters to form the complete CSV string.

### Phase 3: UI Integration (Add Export Button)

*   **Component:** Modify `packages/web/src/components/ResultsDisplay.svelte`.
*   **Element:** Add a button (e.g., "Export to CSV") near the results table or in a relevant control area.
*   **Event Handler:** Implement an `onClick` handler for the button that:
    1.  Retrieves the current `results` array.
    2.  Generates a dynamic filename (e.g., `audio_analysis_results_YYYYMMDD_HHMMSS.csv`).
    3.  Calls `exportResultsToCsv` from the utility file.

### Phase 4: Implement File Download

*   **Location:** Within the `exportResultsToCsv` function.
*   **Logic:**
    1.  Create a `Blob` object from the generated CSV string, specifying `type: 'text/csv;charset=utf-8;'`.
    2.  Create a temporary URL for the Blob using `URL.createObjectURL()`.
    3.  Programmatically create an `<a>` element, set its `href` to the Blob URL and its `download` attribute to the desired filename.
    4.  Programmatically `click()` the `<a>` element to trigger the download.
    5.  Revoke the object URL using `URL.revokeObjectURL()` to release memory.

### Considerations:

*   **User Feedback:** Provide visual feedback (e.g., temporary "Exporting..." message) during the export process.
*   **Error Handling:** Gracefully handle cases where there are no results to export.
*   **Accessibility:** Ensure the export button is accessible.
