# Plan to Improve Noise Floor Analysis

**Date:** October 14, 2025
**Status:** Planning

## 1. Overview

The current implementation includes two methods for calculating the noise floor: an RMS-based method (`analyzeNoiseFloor`) and a histogram-based method (`analyzeNoiseFloorHistogram`). This document provides a critical analysis of both approaches and proposes a plan for a more accurate and reliable noise floor analysis.

## 2. Analysis of Current Methods

### `analyzeNoiseFloor` (RMS-based)

*   **Method:** Calculates the average RMS of the quietest 20% of the audio.
*   **Flaws:**
    *   Vulnerable to outliers.
    *   Assumes a fixed percentage of silence.
    *   Uses arbitrary window sizes and percentages.

### `analyzeNoiseFloorHistogram` (Histogram-based)

*   **Method:** Finds the most common dB level in the audio by creating a histogram.
*   **Strengths:**
    *   More robust to outliers.
    *   Doesn't assume a fixed percentage of silence.
*   **Flaws:**
    *   Bin resolution may not be granular enough.
    *   Can be skewed by low-level audio.

## 3. Proposed Solution: Histogram of Silent Segments

To address the limitations of the current methods, I propose a new approach that combines silence detection with histogram analysis.

The new method will:

1.  **Identify silent segments:** Use a silence detection algorithm to find all the silent parts of the audio.
2.  **Create a histogram of silent segments:** Create a histogram of only the silent segments. This will prevent quiet speech and other low-level sounds from skewing the results.
3.  **Find the peak of the histogram:** The peak of the histogram will be the most common dB level in the silent segments, which is a more accurate representation of the noise floor.

## 4. Implementation Plan

### Step 1: Deprecate `analyzeNoiseFloor`

*   Remove the `analyzeNoiseFloor` function from `packages/core/level-analyzer.js`.
*   Update all calls to `analyzeNoiseFloor` to use `analyzeNoiseFloorHistogram` instead.

### Step 2: Implement the New `analyzeNoiseFloor` function

*   In `packages/core/level-analyzer.js`, create a new function called `analyzeNoiseFloor` that implements the "Histogram of Silent Segments" approach.
*   This function will take an `AudioBuffer` as input.
*   It will use the existing `analyzeSilence` function to identify the silent segments.
*   It will then create a histogram of the dB levels of the silent segments and return the peak of the histogram as the noise floor.

### Step 3: Update the UI

*   No major UI changes are required, as the new `analyzeNoiseFloor` function will simply provide a more accurate value for the existing "Noise Floor" metric.
*   We should consider updating the tooltip for the "Noise Floor" column to explain the new method.

### Step 4: Update Documentation

*   Update all relevant documentation to reflect the new implementation of the noise floor analysis.

## 5. Future Enhancements: Gaussian Mixture Model (GMM)

For even more advanced analysis, we could consider using a Gaussian Mixture Model (GMM) to model the distribution of the audio levels. A GMM can separate the audio into different components (e.g., noise, quiet speech, loud speech) and provide a more accurate estimate of the noise floor. This is a more complex approach, but it's also more powerful and flexible.

## 6. Benefits of the New Approach

*   **More Accurate and Reliable:** The new method will provide a more accurate and reliable measurement of the noise floor.
*   **More Robust:** The new method will be more robust to outliers and will work well for a wider range of audio types.
*   **Improved User Experience:** By providing a more accurate noise floor measurement, we can improve the accuracy of other analyses that depend on it (e.g., speech overlap, silence detection).
