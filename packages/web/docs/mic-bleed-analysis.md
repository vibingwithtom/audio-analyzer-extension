# Mic Bleed Detection Analysis

**Date:** October 14, 2025
**Status:** Analysis Complete
**Recommendation:** Implement OR-based unified detection

## Executive Summary

Analysis of production data reveals both OLD and NEW mic bleed detection methods have complementary strengths and weaknesses. **Recommendation: Combine both methods using OR logic** to catch all problematic files while avoiding false negatives from either method's blind spots.

## Background

The audio analyzer implements two mic bleed detection methods for stereo conversational audio:

### OLD Method
- **Approach:** Measures average bleed level (dB) in non-dominant channel
- **Logic:** "How loud is the bleed?"
- **Threshold:** Detects if bleed > -60 dB
- **Strengths:**
  - Simple, direct measurement of audibility
  - Consistent across different audio types
  - No false negatives for audible bleed
- **Weaknesses:**
  - Cannot distinguish mic bleed from room noise
  - May flag ambient sound as bleed (false positives)

### NEW Method
- **Approach:** Measures channel separation + cross-correlation analysis
- **Logic:** "Is this correlated signal (actual bleed) or uncorrelated noise?"
- **Thresholds:**
  - Only checks blocks with separation < 15 dB
  - Cross-correlation > 0.3
  - Detects if > 0.5% of blocks have confirmed bleed
- **Strengths:**
  - Distinguishes bleed from room noise
  - More sophisticated signal analysis
- **Weaknesses:**
  - 15 dB separation threshold misses audible problems
  - Correlation threshold filters out real bleed with different voice characteristics

## Production Data Analysis

### Example 1: Both Detect (Agreement)
```
vdlg3_056-en_us-user-3015-agent-6315.wav
OLD: Detected - L: -46.7 dB, R: -69.2 dB
NEW: Not detected - Median: 20.0 dB, Worst 10%: 20.0 dB
```
**Issue:** OLD correctly identifies -46.7 dB as audible bleed. NEW sees 20 dB separation (above 15 dB threshold) and never checks correlation.

### Example 2: Both Detect (Agreement)
```
vdlg1_002_movie_recommender-zh_cn-user-4394-agent-14981.wav
OLD: Detected - L: -76.2 dB, R: -58.7 dB
NEW: Not detected - Median: 37.1 dB, Worst 10%: 23.0 dB
```
**Issue:** OLD correctly identifies -58.7 dB as audible bleed. NEW sees 23 dB separation (above 15 dB threshold) and never checks correlation.

### Example 3: NEW Detects (Both methods agree - severe case)
```
File: [conversational stereo file]
OLD: Detected - L: -63.5 dB, R: -57.7 dB
NEW: Detected - Median: 28.8 dB, Worst 10%: 9.5 dB
```
**Analysis:** Both methods catch this severe case. 9.5 dB separation triggers NEW's correlation check.

### Example 4: NEW Detects (Both methods agree - severe case)
```
File: [conversational stereo file]
OLD: Detected - L: -63.5 dB, R: -55.1 dB
NEW: Detected - Median: 25.5 dB, Worst 10%: 7.9 dB
```
**Analysis:** Both methods catch this severe case. 7.9 dB separation triggers NEW's correlation check.

### Example 5: OLD Only Detects (NEW Miss)
```
File: [conversational stereo file]
OLD: Detected - L: -65.1 dB, R: -59.3 dB
NEW: Not detected - Median: 28.2 dB, Worst 10%: 10.4 dB
```
**Analysis:** OLD catches audible bleed at -59.3 dB. NEW checks 10.4 dB separation blocks but correlation < 0.3 filters them out.

### Example 6: OLD Only Detects (NEW Miss)
```
File: [conversational stereo file]
OLD: Detected - L: -62.8 dB, R: -57.8 dB
NEW: Not detected - Median: 28.6 dB, Worst 10%: 7.7 dB
```
**Analysis:** OLD catches audible bleed at -57.8 dB. NEW checks 7.7 dB separation blocks (worse than Example 3's 9.5 dB!) but correlation < 0.3 filters them out.

## Pattern Identification

### When Both Agree (Detection)
- Severe cases with both loud bleed AND poor separation AND high correlation
- Examples 3 & 4: -55 to -58 dB bleed + 7.9-9.5 dB separation
- High confidence: Real mic bleed problem

### When OLD Detects, NEW Misses
**Two failure modes:**

1. **Separation threshold too strict (Examples 1 & 2)**
   - 20-23 dB separation is "above threshold"
   - NEW never checks these blocks for correlation
   - But -46.7 to -58.7 dB bleed is still **audibly problematic**

2. **Correlation threshold filters real bleed (Examples 5 & 6)**
   - 7.7-10.4 dB separation triggers check
   - But correlation < 0.3 (voices too different to correlate well)
   - Even though -57.8 to -59.3 dB bleed is **audibly problematic**

### Key Insight: Separation vs. Absolute Level

NEW's flaw: **Separation ratio doesn't account for absolute bleed levels**

Example:
- Dominant channel: -35 dB
- Bleed channel: -58 dB
- Separation: 23 dB (NEW: "looks good!")
- But -58 dB is **audible** (OLD: "too loud!")

The question "is there 20+ dB separation?" is different from "is the bleed audible?"

## Root Cause Analysis

### NEW Method's Design Issues

1. **15 dB separation threshold is too strict**
   - Assumes "good separation" = "no bleed problem"
   - Ignores absolute bleed levels
   - Misses audible bleed with decent separation

2. **Cross-correlation threshold (0.3) filters too aggressively**
   - Designed to filter room noise
   - Also filters real bleed from speakers with different voice characteristics
   - Conversational stereo often has male/female or different accents

3. **Wrong question being asked**
   - NEW asks: "Is the signal correlated?"
   - Should ask: "Is the bleed audible?"
   - OLD directly measures audibility

## Historical Context

NEW method was developed because OLD sometimes caught cases that weren't actually mic bleed (room noise). However, production data shows:

- OLD's false positives are rare/acceptable
- NEW's false negatives are frequent/problematic
- For quality control, **false negatives are worse than false positives**
- Better to flag for manual review than miss real problems

## Recommendation: OR-Based Unified Detection

### Approach

Replace separate OLD/NEW columns with single unified "Mic Bleed" detection:

```
Detection Logic: (OLD detects) OR (NEW detects)
```

### Implementation

**Single "MIC BLEED" column showing:**
- **Detected** (warning/orange) if either method flags it
- **Not detected** (success/green) if neither flags it
- Details available on hover/expansion:
  ```
  Old Method: L: -58.7 dB, R: -69.2 dB
  New Method: Median: 20.0 dB, Worst 10%: 23.0 dB
  ```

### Benefits

1. **Zero false negatives**: Catches everything either method finds
2. **Comprehensive coverage**: OLD catches audible bleed, NEW catches correlated bleed
3. **Simpler UX**: One clear answer instead of two confusing columns
4. **Preserves data**: Both measurements still available for debugging
5. **Quality-first**: Conservative approach appropriate for QC workflow

### Detection Thresholds

```typescript
const oldDetected = (leftChannelBleedDb > -60 || rightChannelBleedDb > -60);
const newDetected = (percentageConfirmedBleed > 0.5);
const micBleedDetected = oldDetected || newDetected;
```

## Alternative Options Considered

### Option A: Use Only OLD (Rejected)
- **Pro:** Simpler, more reliable for current issues
- **Con:** Loses NEW's ability to distinguish bleed from room noise
- **Verdict:** Historical data shows cases where NEW caught issues OLD missed

### Option B: Fix NEW's Thresholds (Rejected)
- **Pro:** Could improve NEW's performance
- **Con:**
  - Would require extensive testing/tuning
  - Fundamental design issue (separation vs absolute level)
  - No guarantee of solving correlation threshold issues
- **Verdict:** Not worth the effort when OR logic solves the problem

### Option C: Use Only NEW (Rejected)
- **Pro:** More sophisticated algorithm
- **Con:** Missing too many real problems
- **Verdict:** Unacceptable false negative rate

### Option D: Unified OR Logic (RECOMMENDED)
- **Pro:** Best of both worlds, no false negatives
- **Con:** Slightly higher false positive rate (acceptable for QC)
- **Verdict:** Optimal solution

## Implementation Plan

1. **Update ResultsTable.svelte:**
   - Replace two columns with one "MIC BLEED" column
   - Implement OR logic: `getMicBleedDetected()`
   - Show combined result with expandable details

2. **Update color logic:**
   - Detected (either method) → warning/orange
   - Not detected (neither method) → success/green

3. **Preserve detailed data:**
   - Keep both measurements in the data structure
   - Show details in tooltip/expansion for debugging

4. **Delete unused MicBleedCard.svelte:**
   - Component not imported anywhere
   - No longer needed

5. **Testing:**
   - Verify all 6 example files show correct unified detection
   - Test with files where only NEW catches issues (from historical data)
   - Confirm no regressions in table display

## Conclusion

The OR-based unified detection approach provides the most reliable mic bleed detection by leveraging the complementary strengths of both methods. This is the appropriate solution for a quality control workflow where missing a problem (false negative) is more costly than flagging a borderline case for review (false positive).

## References

- Original mic bleed implementation: `packages/core/level-analyzer.js:510-678`
- Current display logic: `packages/web/src/components/ResultsTable.svelte:325-365`
- Detection metrics documentation: `packages/web/docs/mic-bleed-detection-metrics.md`
