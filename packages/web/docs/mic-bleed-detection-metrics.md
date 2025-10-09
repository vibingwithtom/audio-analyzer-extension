# Mic Bleed Detection Metrics Explained

This document explains the metrics used in the hybrid mic bleed detection system for analyzing conversational stereo audio files.

## Overview

When analyzing conversational stereo files (where each channel has a separate speaker), we want to detect if one speaker's voice "bleeds" into the other speaker's microphone. The hybrid approach uses separation ratios and cross-correlation to provide accurate detection.

---

## Median Separation

**What it measures:**
- For every 250ms block where one person is talking (dominant channel), we calculate:
  ```
  Separation (dB) = Dominant Channel Level - Quiet Channel Level
  ```
- The median is the "middle value" of all these separation measurements across the entire recording

**What it tells you:**
- **High median (>20dB)**: Most of the time, when one person talks, their mic picks them up MUCH louder than the other person's mic does
- **Good median (15-20dB)**: Decent isolation most of the time
- **Low median (<15dB)**: The channels aren't well separated - you're hearing a lot of the other person throughout

**Example:**
- Person A speaks at -15dB on their mic
- Person A's voice bleeds into Person B's mic at -40dB
- Separation = -15 - (-40) = **25dB** ✅ Good!

**Interpretation:**
This metric shows your **typical** recording quality throughout the file.

---

## Worst 10% Separation (P10)

**What it measures:**
- Sorts all separation values from worst to best
- Takes the value at the 10th percentile
- Shows you how bad things get in the problematic sections

**What it tells you:**
- **High P10 (>15dB)**: Even in the worst moments, separation is acceptable
- **Medium P10 (10-15dB)**: Some problematic sections but might be salvageable
- **Low P10 (<10dB)**: The worst sections have significant bleed - likely to hear crosstalk

**Why this matters:**
- You could have great median separation (18dB average) but if 10% of your file has terrible separation (5dB), those sections will have audible crosstalk
- This catches **intermittent problems** like:
  - One speaker leaning closer to the other's mic
  - Both speakers talking simultaneously
  - Movement during recording
  - Volume changes

**Interpretation:**
This metric shows your **worst-case** recording quality and catches problems that might be hidden by good average metrics.

---

## Percentage of Confirmed Bleed

**What it measures:**
- Of all the blocks analyzed, what percentage show both:
  1. Poor separation (<15dB)
  2. High cross-correlation (>0.3) between channels

**What it tells you:**
- **Low % (≤5%)**: Very little confirmed voice bleed
- **Medium % (5-10%)**: Some sections with noticeable bleed
- **High % (>10%)**: Significant portions of the recording have voice crosstalk

**Why cross-correlation matters:**
The correlation analysis distinguishes between two causes of poor separation:
- **Poor separation + high correlation** = Voice bleed (the mic is picking up the other speaker's voice)
- **Poor separation + low correlation** = Room noise (just background ambience, HVAC, etc.)

**Interpretation:**
This metric shows how much of your recording has **actual voice crosstalk** (not just room noise).

---

## Real-World Examples

### Example 1: Good Recording ✅
```
Median Separation: 22dB (typical blocks are clean)
P10 Separation: 16dB (even the worst 120 blocks are acceptable)
% Confirmed Bleed: 2%
Result: Clean recording throughout
```

### Example 2: Problematic Recording ⚠️
```
Median Separation: 18dB (sounds okay overall)
P10 Separation: 8dB (120 blocks have severe bleed)
% Confirmed Bleed: 7%
Result: Most is fine, but ~10% has audible crosstalk
```

### Example 3: Bad Recording ❌
```
Median Separation: 12dB (poor isolation throughout)
P10 Separation: 5dB (worst sections are terrible)
% Confirmed Bleed: 15%
Result: Significant bleed throughout, crosstalk audible
```

---

## Combined Interpretation

The three metrics work together to give you a complete picture:

**Scenario:** "This file has good typical separation (20dB), but 15% of the time it drops to 12dB, and 8% of those sections show confirmed voice bleed."

This tells you:
1. **Overall quality** is good (Median Separation)
2. **Some sections** have problems (P10 Separation)
3. **How much** is actual voice vs noise (% Confirmed Bleed)
4. **Where** the problems occur (timestamps of worst blocks)

---

## Comparison to Old Method

### Old Method (Average Bleed Level)
- Calculates average RMS level in the quiet channel during dominant periods
- Compares to fixed -40dB threshold
- **Problems:**
  - Averages across entire file (can hide problems)
  - Fixed threshold (doesn't account for volume differences)
  - Can't distinguish bleed from room noise
  - Volume-dependent (quiet recordings pass easier)

### New Method (Separation Ratio + Correlation)
- Calculates relative separation for each block
- Uses industry-standard separation thresholds (15-20dB)
- Confirms bleed with cross-correlation
- **Benefits:**
  - Shows distribution of quality (median + P10)
  - Volume-independent
  - Distinguishes voice bleed from room noise
  - Provides actionable data (timestamps of problems)

---

## Thresholds Used

### Median Separation
- **Green (Pass)**: ≥20dB
- **Yellow (Warning)**: 15-20dB
- **Red (Fail)**: <15dB

### P10 Separation (Worst 10%)
- **Green (Pass)**: ≥15dB
- **Yellow (Warning)**: 10-15dB
- **Red (Fail)**: <10dB

### % Confirmed Bleed
- **Green (Pass)**: ≤5%
- **Yellow (Warning)**: 5-10%
- **Red (Fail)**: >10%

### Overall Conclusion
**Fail** if:
- % Confirmed Bleed >10% OR P10 Separation <10dB

**Warning** if:
- % Confirmed Bleed 5-10% OR P10 Separation 10-15dB

**Pass** otherwise

---

## Technical Details

### Block Size
250ms blocks (variable sample count depending on sample rate)

### Dominance Threshold
One channel must be 1.5x louder (RMS) than the other to be considered "dominant"

### Correlation Threshold
0.3 correlation coefficient to confirm actual voice bleed (lower than typical 0.7 because speech correlation is complex)

### Separation Threshold for Concern
15dB - below this, we run cross-correlation to check if it's actual bleed

---

## When to Use This Analysis

This analysis is **only** run for files identified as "Conversational Stereo" by the stereo separation analyzer, where:
- Both channels have distinct dominant periods (left >10%, right >10%)
- Not primarily balanced/mixed content

For other stereo types (Mono as Stereo, Mixed Stereo, etc.) or mono files, mic bleed analysis is not applicable.
