# Plan to Improve Noise Floor Analysis (V2)

**Date:** October 15, 2025
**Status:** Planning

## 1. Overview

This document provides a critical analysis of the current noise floor calculation methods and proposes a more accurate and reliable multi-pass approach. This revised plan (V2) incorporates a deeper analysis of the existing `analyzeSilence` function, addresses a potential circular dependency, and adds a formal validation and testing strategy.

## 2. Analysis of Current Methods & Dependencies

### 2.1. `analyzeNoiseFloor` (RMS-based)

*   **Method:** Calculates the average RMS of the quietest 20% of the audio.
*   **Flaws:** Highly vulnerable to outliers and assumes a fixed percentage of silence, which is unreliable.

### 2.2. `analyzeNoiseFloorHistogram` (Histogram-based)

*   **Method:** Finds the most common dB level by creating a histogram of the entire file's RMS values.
*   **Flaws:** Can be skewed by quiet speech, music, or other low-level sounds that are not true background noise. The histogram's bin resolution is also a critical but undefined parameter.

### 2.3. `analyzeSilence` (Dependency Analysis)

*   **Method:** Uses a dynamic threshold set 25% of the way between a *pre-supplied* noise floor and the peak dB to identify silent chunks.
*   **Critical Flaw for Original Plan:** This function **requires a noise floor value as an input**, creating a circular dependency in the original plan where it was to be used to *find* the noise floor.
*   **Conclusion:** We cannot use `analyzeSilence` directly to get the silent segments for the initial noise floor calculation. We must first calculate a preliminary noise floor using a different method.

## 3. Proposed Solution: A Multi-Pass Approach

To break the circular dependency and produce a highly accurate result, a new three-pass approach is proposed for a new `analyzeNoiseFloor` function.

1.  **Pass 1: Preliminary Silence Identification.** Perform a quick pass over the audio to identify segments that are almost certainly silence. This will be done using a conservative, fixed RMS threshold (e.g., equivalent to -60 dBFS). This pass does not need to be perfect; its goal is to gather a clean subset of silent samples.

2.  **Pass 2: Initial Histogram & Noise Floor Calculation.** Create a histogram using *only* the sample data from the silent segments identified in Pass 1. The peak of this histogram will be our first, much more accurate noise floor estimate. This avoids contamination from quiet speech.

3.  **Pass 3: Definitive Silence Identification & Final Noise Floor.** Use the accurate noise floor value from Pass 2 as the input for the existing, powerful `analyzeSilence` function. This will yield a highly accurate map of all true silent segments. A final histogram is created from these definitive segments to calculate the final, most precise noise floor value.

## 4. Implementation Plan

### Step 1: Deprecate `analyzeNoiseFloor` (Old RMS method)

*   In `packages/core/level-analyzer.js`, rename the existing `analyzeNoiseFloor` to `_analyzeNoiseFloorRMS_DEPRECATED`.
*   Update any internal calls that may still use it to point to the new `analyzeNoiseFloor` once it's created.

### Step 2: Implement the New `analyzeNoiseFloor` function

*   In `packages/core/level-analyzer.js`, create a new `async function analyzeNoiseFloor(audioBuffer)`.
*   **Pass 1 Implementation:**
    *   Iterate through the `audioBuffer` in 20ms chunks.
    *   Use a fixed linear threshold corresponding to **-60 dBFS**.
    *   Collect all chunks whose RMS value is below this threshold into a "preliminary silence" buffer.
*   **Pass 2 Implementation:**
    *   Create a histogram of the sample values from the "preliminary silence" buffer.
    *   **Histogram Bin Size:** Use a resolution of **0.5 dB** per bin, ranging from -120 dB to 0 dB. This provides a good balance between granularity and smoothness.
    *   Find the peak of the histogram to determine the `initialNoiseFloorDb`.
*   **Pass 3 Implementation:**
    *   Call the existing `analyzeSilence` function, passing it the `initialNoiseFloorDb` calculated in the previous step.
    *   This will return a definitive list of `silenceSegments`.
    *   Create a final histogram (0.5 dB resolution) using the audio data from these `silenceSegments`.
    *   The peak of this final histogram is the final `noiseFloorDb` result.
*   **Edge Case Handling:**
    *   **No Silence Detected:** If Pass 1 finds no silence below the -60 dBFS threshold, the function should not fail. It should instead fall back to using the `analyzeNoiseFloorHistogram` method on the whole file and flag the result as "low confidence".
    *   **Very Short Files:** For files under 200ms, bypass this complex analysis and return -Infinity, as a meaningful noise floor cannot be determined.

### Step 3: Integrate and Update UI

*   In `analyzeAudioBuffer`, replace the call to the old noise floor function with the new `analyzeNoiseFloor`.
*   Update the tooltip for the "Noise Floor" metric in the results display to explain the new, more robust methodology: "Calculated by creating a statistical histogram of the quietest passages of the audio to provide a highly accurate measurement of the background noise."

### Step 4: Validation and Testing (New)

A new test suite file, `noise-floor.test.js`, will be created.

*   **Test Audio Files:**
    1.  `silence_minus_50db.wav`: A 10-second file of pure white noise at exactly -50 dBFS.
    2.  `speech_with_clean_silence.wav`: A voiceover file with distinct silent passages where the noise floor is known to be ~-65 dBFS.
    3.  `compressed_music_no_silence.wav`: A loud, heavily compressed rock song with no perceptible silence.
    4.  `ticking_clock.wav`: A file with a quiet background noise and periodic loud ticks. This will test the "sound island" filtering.
    5.  `fade_in_out.wav`: A file that fades in from silence and fades out to silence.

*   **Unit Tests & Success Criteria:**
    1.  **Test 1 (Accuracy):**
        *   **File:** `silence_minus_50db.wav`
        *   **Criteria:** The new `analyzeNoiseFloor` must return a value between -50.5 dB and -49.5 dB.
    2.  **Test 2 (Real-world Accuracy):**
        *   **File:** `speech_with_clean_silence.wav`
        *   **Criteria:** The new function must return a value within 2 dB of the known -65 dBFS noise floor (i.e., between -67 dB and -63 dB). The old RMS method should be asserted to be *less* accurate.
    3.  **Test 3 (Edge Case - No Silence):**
        *   **File:** `compressed_music_no_silence.wav`
        *   **Criteria:** The function must not crash and should return a result with the "low confidence" flag.
    4.  **Test 4 (Robustness to Outliers):**
        *   **File:** `ticking_clock.wav`
        *   **Criteria:** The noise floor reported should be that of the quiet background, not the ticks. The result should be very close to the value from Test 2.
    5.  **Test 5 (Leading/Trailing Silence):**
        *   **File:** `fade_in_out.wav`
        *   **Criteria:** The analysis should correctly identify the pure silence at the beginning and end and use it to calculate an accurate noise floor approaching -Infinity.

### Step 5: Update Documentation

*   Update all relevant internal architecture and analysis documents to reflect the new multi-pass implementation.

## 5. Future Enhancements: Gaussian Mixture Model (GMM)

The GMM approach remains a valid future enhancement. It could potentially replace the multi-pass histogram method with a more mathematically rigorous model for separating audio components. This should only be considered after the success of the V2 plan is validated.

## 6. Benefits of the New Approach

*   **More Accurate:** By isolating true silent passages, the result will be a much better representation of the actual noise floor.
*   **More Reliable:** The method is far more robust to outliers, quiet speech, and varying types of audio content.
*   **Improved Downstream Analysis:** A better noise floor measurement will directly improve the accuracy of other analyses that depend on it, such as speech overlap and silence detection.
