# Clipping Analysis Plan

**Date:** October 14, 2025
**Status:** Enhanced - Ready for Implementation
**Last Updated:** October 14, 2025

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
1. **Detects clipped samples** at exactly ±1.0 (hard clipping)
2. **Detects near-clipping** at 0.98-0.999 (warning threshold)
3. **Groups consecutive samples** into clipping regions with gap tolerance
4. **Tracks per-channel statistics** for stereo files
5. **Calculates density metrics** (event count, distribution, duration)
6. **Provides actionable feedback** with detailed timestamps and severity assessment

### Key Enhancements Based on Research

**Gap Tolerance:**
Following industry standards (ClipDaT algorithm), allow up to 3 samples to dip below ±1.0 while still being part of the same clipping region. This handles intermittent clipping more accurately.

**Sample Rate Adaptive Threshold:**
The minimum consecutive samples threshold adapts to sample rate:
- 44.1 kHz: 2-3 samples minimum
- 96 kHz: 4-5 samples minimum
- Formula: `Math.max(2, Math.floor(sampleRate / 20000))`

**Multi-Level Detection:**
- **Hard Clipping:** Samples at exactly ±1.0 (ERROR level)
- **Near Clipping:** Samples at 0.98-0.999 (WARNING level - proactive alert)

## 4. Implementation Plan

### Step 1: Implement `analyzeClipping` function

*   In `packages/core/level-analyzer.js`, create a new function called `analyzeClipping`.
    *   **Note:** Use `level-analyzer.js` (not `audio-analyzer.js`) to keep all advanced analysis features together (noise floor, reverb, silence, mic bleed, etc.)
*   This function will take an `AudioBuffer` and `sampleRate` as input.

#### Detection Algorithm

1. **Calculate adaptive threshold:** `minConsecutiveSamples = Math.max(2, Math.floor(sampleRate / 20000))`
2. **Iterate through each channel** separately to track per-channel statistics
3. **Detect clipped samples** at exactly ±1.0
4. **Detect near-clipping samples** at 0.98 ≤ |sample| < 1.0
5. **Group consecutive samples** with gap tolerance (allow up to 3 samples below threshold)
6. **Track region boundaries** for timestamp reporting

#### Return Object Structure

```javascript
{
  // Overall statistics
  clippedSamples: 1250,              // Total hard-clipped samples
  clippedPercentage: 0.5,            // Percentage of hard-clipped samples
  nearClippingSamples: 500,          // Total near-clipping samples
  nearClippingPercentage: 0.2,       // Percentage of near-clipping samples

  // Density metrics
  clippingEventCount: 5,             // Number of distinct hard clipping regions
  nearClippingEventCount: 12,        // Number of distinct near-clipping regions
  maxConsecutiveClipped: 8820,       // Longest hard clipping region (samples)
  avgClippingDuration: 0.05,         // Average hard clipping region duration (seconds)

  // Per-channel breakdown (for stereo/multi-channel)
  perChannel: [
    {
      channel: 0,
      name: 'left',
      clippedSamples: 1250,
      clippedPercentage: 1.0,
      nearClippingSamples: 300,
      nearClippingPercentage: 0.3,
      regionCount: 3
    },
    {
      channel: 1,
      name: 'right',
      clippedSamples: 0,
      clippedPercentage: 0,
      nearClippingSamples: 200,
      nearClippingPercentage: 0.2,
      regionCount: 0
    }
  ],

  // Detailed regions (sorted by severity/duration)
  clippingRegions: [
    {
      startTime: 12.5,               // Start time in seconds
      endTime: 12.7,                 // End time in seconds
      duration: 0.2,                 // Duration in seconds
      channel: 0,                    // Channel index
      channelName: 'left',           // Channel name
      sampleCount: 8820,             // Clipped samples in this region
      peakSample: 1.0,               // Maximum sample value in region
      type: 'hard'                   // 'hard' or 'near'
    },
    // ... more regions (sorted by duration desc)
  ]
}
```

### Step 2: Integrate `analyzeClipping` into the Analysis Workflow

*   In `packages/core/level-analyzer.js`, call the `analyzeClipping` function from `analyzeAudioBuffer` (following the same pattern as other analyses).
*   Add the clipping analysis results to the returned results object.

### Step 3: Update the UI

*   **`ResultsTable.svelte`:**
    *   Add a new "Clipping" column to the experimental mode table.
    *   Display clipped percentage with enhanced color-coding based on severity AND density:

#### Severity Classification Logic

```javascript
function getClippingSeverity(result) {
  const { clippedPercentage, clippingEventCount, nearClippingPercentage, perChannel } = result;

  // Hard clipping thresholds
  if (clippedPercentage > 1 || clippingEventCount > 50) {
    return { level: 'error', label: 'Severe clipping detected' };
  }

  if (clippedPercentage > 0.1 || clippingEventCount > 10) {
    return { level: 'warning', label: `${clippedPercentage.toFixed(2)}% clipped` };
  }

  // Near-clipping warning
  if (nearClippingPercentage > 1) {
    return { level: 'warning', label: 'Near clipping detected' };
  }

  // All clear
  return { level: 'success', label: 'No clipping detected' };
}
```

#### Display Format

*   **Success (Green):** "No clipping detected"
*   **Warning (Orange):**
    *   "0.15% clipped (3 events)" - for hard clipping
    *   "Near clipping: 1.2%" - for near-clipping warning
*   **Error (Red):**
    *   "2.5% clipped (52 events)" - severe or widespread

#### Tooltip Content

Follow the same pattern as Silence, Speech Overlap, and Mic Bleed:

```
Clipping Detection
━━━━━━━━━━━━━━━━━
Detects audio samples at maximum values (±1.0) which indicate
distortion from overdriven recording levels.

Hard Clipping: 0.5% (5 regions)
Near Clipping: 1.2% (12 regions)

Worst Clipping Regions (Hard):
• Left: 0:12-0:13 (0.2s, 8820 samples)
• Left: 1:45-1:46 (0.1s, 4410 samples)
• Right: 2:30-2:31 (0.15s, 6615 samples)

Per-Channel Breakdown:
• Left: 1.0% clipped, 0.3% near
• Right: 0.0% clipped, 0.2% near

Tip: Reduce input gain or apply normalization with headroom
```

*   Use the `conversational-cell` class and `cursor: help` for tooltip functionality.

*   **Update experimental status logic:**
    *   Hard clipping > 1% OR > 50 events → contributes to overall "error" status
    *   Hard clipping 0.1-1% OR 10-50 events → contributes to overall "warning" status
    *   Near clipping > 1% → contributes to overall "warning" status

### Step 4: Update Documentation

*   Create a new document, `packages/web/docs/clipping-analysis.md`, to provide a detailed explanation of the new feature, its metrics, and how to interpret the results.

## 5. Benefits of Enhanced Approach

### Core Benefits

*   **Accurate and Reliable:** Detects actual PCM clipping by checking for samples at exactly ±1.0 in the Web Audio API's normalized float representation.
*   **Avoids False Positives:** Adaptive consecutive-sample requirement (based on sample rate) prevents flagging single stray samples.
*   **Handles Intermittent Clipping:** Gap tolerance (3-sample allowance) accurately groups clipping regions, following ClipDaT algorithm standards.
*   **Actionable Feedback:** Timestamp-based clipping regions allow users to locate and fix the exact problematic sections.
*   **Consistent UX:** Follows the same pattern as other experimental features (Silence, Speech Overlap, Mic Bleed) for a familiar user experience.

### Enhanced Capabilities

*   **Proactive Warning System:** Near-clipping detection (0.98-0.999) warns users before actual clipping occurs.
*   **Per-Channel Insight:** Stereo breakdown shows which channel has clipping issues, critical for conversational audio.
*   **Density-Aware Severity:** Considers both percentage AND event count to distinguish between isolated incidents and widespread issues.
*   **Sample Rate Adaptive:** Threshold automatically adjusts for high sample rate recordings (96kHz, 192kHz).
*   **Detailed Diagnostics:** Provides event count, max consecutive duration, and average duration for better troubleshooting.

## 6. Implementation Priority

### Phase 1: Core Implementation (Must Have)
1. ✅ Exactly ±1.0 threshold detection
2. ✅ Adaptive consecutive sample requirement
3. ✅ Gap tolerance (3-sample allowance)
4. ✅ Region grouping with timestamps
5. ✅ Percentage-based metrics
6. ✅ Per-channel tracking

### Phase 2: Enhanced Metrics (High Priority)
1. ✅ Clipping density metrics (event count, max duration, avg duration)
2. ✅ Near-clipping detection (0.98-0.999 threshold)
3. ✅ Enhanced severity classification (percentage + density)
4. ✅ Detailed tooltip with per-channel breakdown

### Phase 3: Future Enhancements (Optional)
1. Soft clipping detection (more advanced distortion analysis)
2. Clipping repair suggestions (specific dB reduction recommendations)
3. Histogram visualization of clipping distribution
4. Integration with normalization recommendations

## 7. Research References

This implementation is based on industry best practices and academic research:

*   **ClipDaT Algorithm:** Uses gap tolerance and consecutive sample thresholds (2-3 samples minimum)
*   **Industry Standards:** Near-clipping threshold at 0.98-0.999, with mastering recommendation to peak at -0.3 dB
*   **Sample Rate Adaptation:** Higher sample rates require more consecutive samples to avoid false positives
*   **Per-Channel Analysis:** Essential for stereo/multi-channel recordings in professional workflows
