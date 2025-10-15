# Plan to Improve the "Speech Overlap" Feature

**Date:** October 14, 2025
**Status:** Planning

## 1. Overview

The current "Speech Overlap" feature provides a good baseline for detecting when both speakers are talking simultaneously in a conversational stereo recording. However, it can be improved to provide more accurate and nuanced results. This plan outlines the steps to enhance the "Speech Overlap" feature to better distinguish between natural conversational interjections and problematic crosstalk.

## 2. Limitations of the Current Implementation

*   **Fixed Threshold:** The speech detection threshold is fixed at 20dB above the noise floor, which may not be optimal for all recordings.
*   **No Distinction for Interjections:** The analysis doesn't distinguish between true crosstalk and short, natural interjections.
*   **No Consideration for Mic Bleed:** The analysis doesn't account for mic bleed, which can lead to false positives.

## 3. Proposed Enhancements

To address these limitations, we will implement the following enhancements:

*   **Dynamic Speech Threshold:** Implement a dynamic threshold that adapts to the loudness of each speaker.
*   **Short Interjection Filtering:** Add logic to filter out short, isolated instances of overlap.
*   **Integration with Mic Bleed Analysis:** Adjust the overlap detection algorithm based on the results of the "Mic Bleed" analysis.
*   **Severity Analysis:** Provide a more nuanced severity analysis that classifies overlap as "low," "medium," or "high."

## 4. Implementation Plan

### Step 1: Implement Dynamic Speech Threshold

*   In `packages/core/level-analyzer.js`, modify the `analyzeOverlappingSpeech` function to calculate a dynamic speech threshold for each channel.
*   The threshold could be based on the average loudness of each speaker, or a percentage of the peak level.

### Step 2: Add Short Interjection Filtering

*   In the `analyzeOverlappingSpeech` function, add logic to ignore instances of overlap that are shorter than a certain duration (e.g., 500ms).
*   This will help to reduce the number of false positives caused by natural conversational interjections.

### Step 3: Integrate with Mic Bleed Analysis

*   Modify the `analyzeOverlappingSpeech` function to take the results of the `analyzeMicBleed` function as input.
*   If significant mic bleed is detected, the overlap detection algorithm will be adjusted to be less sensitive.

### Step 4: Implement Severity Analysis

*   Instead of just a percentage, the `analyzeOverlappingSpeech` function will return a more detailed analysis of the overlap, including:
    *   `overlapPercentage`: The total percentage of overlap.
    *   `overlapSeverity`: A classification of the overlap as "low," "medium," or "high."
    *   `overlapInstances`: An array of objects, where each object represents an instance of overlap and includes its start time, end time, and severity.

### Step 5: Update the UI

*   **`ResultsTable.svelte`:**
    *   Update the "Speech Overlap" column to display the new severity analysis.
    *   Use icons or badges to indicate the severity of the overlap.
    *   Update the tooltip to provide more detailed information about the overlap instances.
*   **`ResultsDisplay.svelte`:**
    *   Update the `getExperimentalStatus` function to interpret the new "Speech Overlap" results.

### Step 6: Update Documentation

*   Update `packages/web/docs/conversational-audio-analysis-plan.md` to reflect the new implementation of the "Speech Overlap" feature.
*   Create a new document, `packages/web/docs/speech-overlap-analysis.md`, to provide a detailed explanation of the new feature, its metrics, and how to interpret the results.

## 5. Benefits of the New Approach

*   **More Accurate Results:** The new feature will provide more accurate and reliable results by filtering out noise and natural conversational interjections.
*   **Actionable Feedback:** The severity analysis and detailed overlap instances will provide users with more actionable feedback.
*   **Improved User Experience:** The new feature will be more intuitive and easier to understand, improving the overall user experience.
