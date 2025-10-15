# Clipping Analysis Plan

**Date:** October 14, 2025
**Status:** Ready for Implementation

## 1. Overview

This document outlines the plan to implement a clipping detection feature in the audio analysis tool. Clipping is a form of waveform distortion that occurs when an amplifier is overdriven. It's a common and significant audio quality issue that should be flagged to the user.

## 2. Technical Background

**PCM to Float Conversion:**
While the source files are primarily WAV PCM (integer format: 16-bit = -32768 to +32767, 24-bit = -8388608 to +8388607), the Web Audio API's `AudioContext.decodeAudioData()` automatically converts these to floating-point format normalized to the range `[-1.0, 1.0]`.

This means:
- A PCM sample at maximum value (e.g., 32767 in 16-bit) becomes exactly `1.0`
- A PCM sample at minimum value (e.g., -32768 in 16-bit) becomes exactly `-1.0`
- Clipping detection should look for samples at **exactly ±1.0**

## 3. Recommended Approach

A single-pass analysis that:
1. Detects all clipped samples (samples at exactly ±1.0)
2. Groups consecutive clipped samples into clipping regions
3. Tracks location and severity of clipping
4. Provides actionable feedback with timestamps

## 4. Implementation Plan

### Step 1: Implement `analyzeClipping` function

*   In `packages/core/level-analyzer.js`, create a new function called `analyzeClipping`.
    *   **Note:** Use `level-analyzer.js` (not `audio-analyzer.js`) to keep all advanced analysis features together (noise floor, reverb, silence, mic bleed, etc.)
*   This function will take an `AudioBuffer` and `sampleRate` as input.
*   It will iterate through the samples of each channel and check if they are at exactly **±1.0**.
*   To avoid flagging single stray samples, it will only count a section as "clipped" if **3 or more consecutive samples** are at ±1.0.
*   The function will return an object with the following information:
    *   `clippedSamples`: The total number of clipped samples across all channels.
    *   `clippedPercentage`: Percentage of total samples that are clipped.
    *   `clippingRegions`: An array of objects, where each object represents a region of clipping with:
        *   `startTime`: Start time in seconds
        *   `endTime`: End time in seconds
        *   `duration`: Duration in seconds
        *   `channel`: Which channel (0 = left, 1 = right, etc.)
        *   `sampleCount`: Number of clipped samples in this region

### Step 2: Integrate `analyzeClipping` into the Analysis Workflow

*   In `packages/core/level-analyzer.js`, call the `analyzeClipping` function from `analyzeAudioBuffer` (following the same pattern as other analyses).
*   Add the clipping analysis results to the returned results object.

### Step 3: Update the UI

*   **`ResultsTable.svelte`:**
    *   Add a new "Clipping" column to the experimental mode table.
    *   Display clipped percentage with color-coding:
        *   **Success (Green)**: < 0.1% clipped samples
        *   **Warning (Orange)**: 0.1% - 1% clipped samples
        *   **Error (Red)**: > 1% clipped samples
    *   Show "Not detected" if no clipping (success color).
    *   Add tooltip following the same pattern as Silence, Speech Overlap, and Mic Bleed:
        *   Brief explanation of clipping detection
        *   List of worst clipping regions (top 5-10) with timestamps in M:SS-M:SS (duration) format
        *   Only show regions if clipping detected
    *   Use the `conversational-cell` class and `cursor: help` for tooltip functionality.

*   **Update experimental status logic:**
    *   Clipping > 1% should contribute to overall "error" status
    *   Clipping 0.1-1% should contribute to overall "warning" status

### Step 4: Update Documentation

*   Create a new document, `packages/web/docs/clipping-analysis.md`, to provide a detailed explanation of the new feature, its metrics, and how to interpret the results.

## 5. Benefits of this Approach

*   **Accurate and Reliable:** Detects actual PCM clipping by checking for samples at exactly ±1.0 in the Web Audio API's normalized float representation.
*   **Avoids False Positives:** 3-consecutive-sample requirement prevents flagging single stray samples.
*   **Actionable Feedback:** Timestamp-based clipping regions allow users to locate and fix the exact problematic sections.
*   **Consistent UX:** Follows the same pattern as other experimental features (Silence, Speech Overlap, Mic Bleed) for a familiar user experience.
*   **Severity Awareness:** Percentage-based metrics with color-coded thresholds help users quickly assess the severity of clipping issues.
