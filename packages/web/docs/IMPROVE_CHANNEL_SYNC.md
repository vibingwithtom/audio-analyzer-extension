# Plan to Improve the "Channel Sync" Feature

**Date:** October 14, 2025
**Status:** Planning

## 1. Overview

The current "Channel Sync" feature in the experimental analysis is not providing useful information for conversational stereo audio. It incorrectly flags natural conversational turn-taking as a synchronization issue. This plan outlines the steps to replace the flawed implementation with a more robust and meaningful analysis based on cross-correlation.

## 2. Problems with the Current Implementation

*   **Incorrect Logic:** The feature measures the time difference between the start and end of audio in each channel. In a conversation, it's expected that one person will start and stop talking at different times than the other.
*   **Misleading Results:** The current implementation almost always reports a "sync issue" for conversational audio, which is confusing and unhelpful for users.
*   **Lack of Actionable Feedback:** The feature doesn't provide any actionable feedback. It simply reports that the channels are "out of sync" without providing any information about the cause or severity of the issue.

## 3. Proposed Solution: Cross-Correlation Analysis

To address these issues, we will replace the current implementation with a new "Channel Sync" feature based on cross-correlation. This approach will provide a more accurate and meaningful analysis of channel synchronization.

The new feature will:

*   **Identify the true offset:** Use cross-correlation to determine the precise time offset between the left and right channels.
*   **Detect clock drift:** Analyze the offset over time to detect if the recording devices had different clock speeds.
*   **Find latency spikes:** Identify sudden changes in the offset that could indicate recording glitches.

## 4. Implementation Plan

### Step 1: Remove the Existing `analyzeChannelSync` Function

*   Delete the `analyzeChannelSync` function from `packages/core/level-analyzer.js`.

### Step 2: Implement the New `analyzeChannelSync` Function

*   In `packages/core/level-analyzer.js`, create a new function that implements the cross-correlation analysis.
*   The function will return an object with the following information:
    *   `initialOffsetMs`: The initial offset between the channels in milliseconds.
    *   `clockDrift`: A boolean indicating if clock drift was detected.
    *   `latencySpikes`: An array of timestamps where latency spikes were detected.

### Step 3: Update `analyzeConversationalAudio`

*   Modify the `analyzeConversationalAudio` function in `packages/core/level-analyzer.js` to call the new `analyzeChannelSync` function and include its results in the returned object.

### Step 4: Update the UI

*   **`ResultsTable.svelte`:**
    *   Replace the existing "Channel Sync" column with a new column that displays the results from the new analysis.
    *   Display the initial offset in milliseconds.
    *   Use icons or badges to indicate if clock drift or latency spikes were detected.
    *   Update the tooltip to explain the new metrics.
*   **`ResultsDisplay.svelte`:**
    *   Modify the `getExperimentalStatus` function to interpret the new "Channel Sync" results.
    *   The logic for determining the overall status will be updated to reflect the new data. For example, a significant clock drift might result in a "warning" or "fail" status.

### Step 5: Update Documentation

*   Update `packages/web/docs/conversational-audio-analysis-plan.md` to reflect the new implementation of the "Channel Sync" feature.
*   Create a new document, `packages/web/docs/channel-sync-analysis.md`, to provide a detailed explanation of the new feature, its metrics, and how to interpret the results.

## 5. Benefits of the New Approach

*   **Accurate and Meaningful Results:** The new feature will provide accurate and meaningful information about channel synchronization.
*   **Actionable Feedback:** The results will be actionable, allowing users to identify and address real synchronization issues.
*   **Improved User Experience:** The new feature will be more intuitive and easier to understand, improving the overall user experience.
