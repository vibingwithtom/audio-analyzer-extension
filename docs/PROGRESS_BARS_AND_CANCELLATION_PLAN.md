# Progress Bars and Cancellation Improvements - Implementation Plan

## Problem Statement

**Issue 1: No Progress Feedback**
- Large audio files (60MB+, >1 hour duration) take 3+ minutes to analyze in experimental mode
- No visual feedback during analysis makes UI appear frozen
- User doesn't know which stage of analysis is running or how long it will take

**Issue 2: Slow Cancellation**
- Cancel button doesn't work immediately - can take several seconds
- Missing cancellation checks in most analysis functions
- No "Cancelling..." feedback when user requests cancellation

## Current State Analysis

### Cancellation Coverage in LevelAnalyzer

**Functions WITH cancellation checks:**
- ✅ `analyzeAudioBuffer()` - Peak level analysis (line 33, every 10K samples)
- ✅ `analyzeClipping()` - Clipping detection (line 973, every sample)

**Functions WITHOUT cancellation checks:**
- ❌ `analyzeNoiseFloor()` - Can process 44,100 windows for 1-hour file
- ❌ `estimateReverb()` - Deep nested loops with emergency brake but no cancel check
- ❌ `analyzeSilence()` - Processes all chunks without cancel check
- ❌ `analyzeStereoSeparation()` - Processes all blocks without cancel check
- ❌ `analyzeMicBleed()` - Processes all blocks without cancel check
- ❌ `analyzeConversationalAudio()` - Processes all blocks without cancel check

### Progress Callback Support

**Current state:**
- `LevelAnalyzer.analyzeAudioBuffer()` already accepts `progressCallback` parameter
- Callbacks work for: peak levels, noise floor, normalization, reverb, silence, clipping
- Service layer (`audio-analysis-service.ts`) doesn't expose progress callbacks
- UI components don't have progress state or display

## Solution Design

### Part 1: Improve Cancellation (Core Library)

**File:** `packages/core/level-analyzer.js`

#### 1.1: Create Custom Cancellation Error

Add a custom error class at the top of the file for type-safe cancellation handling:

```javascript
/**
 * Custom error thrown when audio analysis is cancelled by user.
 * Allows calling code to distinguish cancellation from other errors.
 */
export class AnalysisCancelledError extends Error {
  constructor(message = 'Analysis was cancelled by user', stage = null) {
    super(message);
    this.name = 'AnalysisCancelledError';
    this.stage = stage; // Optional: which analysis stage was interrupted
  }
}
```

**Benefits:**
- Type-safe error handling with `instanceof` checks
- No reliance on error message string matching
- Can add metadata (e.g., which stage was cancelled)
- Future-proof for additional cancellation features

#### 1.2: Define Cancellation Check Constants

Add constants at the top of the `LevelAnalyzer` class for tunable cancellation intervals:

```javascript
export class LevelAnalyzer {
  // Cancellation check frequencies (balance between responsiveness and overhead)
  static CANCELLATION_CHECK_INTERVALS = {
    SAMPLE_LOOP: 10000,    // Peak/clipping: check every 10K samples (~0.2s @ 48kHz)
    WINDOW_LOOP: 1000,     // Noise floor: check every 1K windows (~1s)
    BLOCK_LOOP: 100,       // Stereo/bleed/overlap: check every 100 blocks (~25s @ 250ms blocks)
    ONSET_LOOP: 100,       // Reverb: check every 100 onsets
    CHUNK_LOOP: 1000,      // Silence: check every 1K chunks (~1s)
    SEGMENT_LOOP: 1        // Consistency: check every segment (~15s)
  };

  constructor() {
    this.analysisInProgress = false;
  }
  // ...
}
```

**Benefits:**
- Single source of truth for check frequencies
- Easy to tune based on performance testing
- Self-documenting with comments
- Potential for future user configuration

#### 1.3: Add Cancellation Checks

Add cancellation checks to all analysis functions using the pattern:

```javascript
if (iterationCount % LevelAnalyzer.CANCELLATION_CHECK_INTERVALS.BLOCK_LOOP === 0
    && !this.analysisInProgress) {
  throw new AnalysisCancelledError('Analysis cancelled', 'stereo-separation');
}
```

**Specific changes:**

1. **`analyzeNoiseFloor()`** (lines 401-549)
   - Add check in window loop (line 425)
   - Use `CANCELLATION_CHECK_INTERVALS.WINDOW_LOOP` (every 1000 windows)
   - Current loop processes ~88,200 windows for 1-hour file @ 44.1kHz
   ```javascript
   if (i % LevelAnalyzer.CANCELLATION_CHECK_INTERVALS.WINDOW_LOOP === 0
       && !this.analysisInProgress) {
     throw new AnalysisCancelledError('Analysis cancelled', 'noise-floor');
   }
   ```

2. **`estimateReverb()`** (lines 290-399)
   - Add check in onset loop (line 304)
   - Use `CANCELLATION_CHECK_INTERVALS.ONSET_LOOP` (every 100 onsets)
   - Add check in channel loop (line 300): Check at channel boundaries
   - Already has some yielding but no cancel check
   ```javascript
   if (onsetCount % LevelAnalyzer.CANCELLATION_CHECK_INTERVALS.ONSET_LOOP === 0
       && !this.analysisInProgress) {
     throw new AnalysisCancelledError('Analysis cancelled', 'reverb');
   }
   ```

3. **`analyzeSilence()`** (lines 136-288)
   - Add check in chunk classification loop (line 155)
   - Use `CANCELLATION_CHECK_INTERVALS.CHUNK_LOOP` (every 1000 chunks)
   - Add check in filtering loop (line 178)
   - Current loop processes ~72,000 chunks for 1-hour file
   ```javascript
   if (i % LevelAnalyzer.CANCELLATION_CHECK_INTERVALS.CHUNK_LOOP === 0
       && !this.analysisInProgress) {
     throw new AnalysisCancelledError('Analysis cancelled', 'silence');
   }
   ```

4. **`analyzeStereoSeparation()`** (lines 585-679)
   - Add check in block loop (line 605)
   - Use `CANCELLATION_CHECK_INTERVALS.BLOCK_LOOP` (every 100 blocks)
   - Synchronous function, needs cancel checks
   ```javascript
   if (blockCount % LevelAnalyzer.CANCELLATION_CHECK_INTERVALS.BLOCK_LOOP === 0
       && !this.analysisInProgress) {
     throw new AnalysisCancelledError('Analysis cancelled', 'stereo-separation');
   }
   ```

5. **`analyzeMicBleed()`** (lines 687-917)
   - Add check in block loop (line 710)
   - Use `CANCELLATION_CHECK_INTERVALS.BLOCK_LOOP` (every 100 blocks)
   - Synchronous function, needs cancel checks
   ```javascript
   if (blockCount % LevelAnalyzer.CANCELLATION_CHECK_INTERVALS.BLOCK_LOOP === 0
       && !this.analysisInProgress) {
     throw new AnalysisCancelledError('Analysis cancelled', 'mic-bleed');
   }
   ```

6. **`analyzeConversationalAudio()`** (lines 981-1027)
   - Add check in RMS block calculation loop (line 1001)
   - Use `CANCELLATION_CHECK_INTERVALS.BLOCK_LOOP` (every 100 blocks)
   - Synchronous function, needs cancel checks
   ```javascript
   if (blockCount % LevelAnalyzer.CANCELLATION_CHECK_INTERVALS.BLOCK_LOOP === 0
       && !this.analysisInProgress) {
     throw new AnalysisCancelledError('Analysis cancelled', 'conversational');
   }
   ```

7. **`analyzeOverlappingSpeech()`** (lines 1035-1137)
   - Add check in block loop (line 1054)
   - Use `CANCELLATION_CHECK_INTERVALS.BLOCK_LOOP` (every 100 blocks)
   - Called from `analyzeConversationalAudio()`
   ```javascript
   if (i % LevelAnalyzer.CANCELLATION_CHECK_INTERVALS.BLOCK_LOOP === 0
       && !this.analysisInProgress) {
     throw new AnalysisCancelledError('Analysis cancelled', 'overlap-speech');
   }
   ```

8. **`analyzeChannelConsistency()`** (lines 1156-1311)
   - Add check in segment loop (line 1169)
   - Use `CANCELLATION_CHECK_INTERVALS.SEGMENT_LOOP` (every segment ~15s)
   - Called from `analyzeConversationalAudio()`
   ```javascript
   if (segmentStart % LevelAnalyzer.CANCELLATION_CHECK_INTERVALS.SEGMENT_LOOP === 0
       && !this.analysisInProgress) {
     throw new AnalysisCancelledError('Analysis cancelled', 'channel-consistency');
   }
   ```

### Part 2: Add Progress Callbacks (Service Layer)

**File:** `packages/web/src/services/audio-analysis-service.ts`

**Changes:**

1. **Import AnalysisCancelledError:**
```typescript
import { AudioAnalyzer, LevelAnalyzer, CriteriaValidator, AnalysisCancelledError } from '@audio-analyzer/core';
```

2. **Update `AnalysisOptions` interface (lines 8-18):**
```typescript
export interface AnalysisOptions {
  analysisMode: AnalysisMode;
  preset?: PresetConfig | null;
  presetId?: string;
  criteria?: any;
  scriptsList?: string[];
  speakerId?: string;
  skipIndividualTracking?: boolean;
  // NEW: Progress callback for UI feedback
  progressCallback?: (message: string, progress: number) => void;
}
```

3. **Update `analyzeFullFile()` function (line 130):**
   - Extract `progressCallback` from options
   - Pass to `analyzeExperimental()`

4. **Update `analyzeExperimental()` function (line 198):**
   - Add `progressCallback` parameter
   - Pass callback to `levelAnalyzer.analyzeAudioBuffer(audioBuffer, progressCallback, true)`

5. **Handle AnalysisCancelledError in `analyzeAudioFile()` catch block:**
```typescript
} catch (error) {
  // Handle cancellation gracefully (don't track as error)
  if (error instanceof AnalysisCancelledError) {
    analyticsService.track('analysis_cancelled', {
      filename,
      stage: error.stage,
      analysisMode: options.analysisMode,
      fileSize: file.size,
    });
    throw error; // Re-throw for UI to handle
  }

  // Always track other errors
  analyticsService.track('analysis_error', {
    filename,
    error: error instanceof Error ? error.message : String(error),
    analysisMode: options.analysisMode,
    presetId: options.presetId,
    fileSize: file.size,
    fileType: file instanceof File ? file.name.split('.').pop()?.toLowerCase() : 'unknown',
  });
  throw error;
}
```

**Benefits:**
- Distinguish cancellation from actual errors in analytics
- Allows UI to handle cancellation differently (no error message)
- Type-safe error handling

### Part 3: Add Progress UI (Components)

**Progress Bar Design:**

```
╔═══════════════════════════════════════════════╗
║ Analyzing file 3 of 10: large-audio-file.mp3 ║
║ Detecting clipping... 97%                     ║
║ [████████████████████░]                       ║
╚═══════════════════════════════════════════════╝
```

Or when cancelling:
```
╔═══════════════════════════════════════════════╗
║ Cancelling analysis...                        ║
║ [████████████████░░░░]                        ║
╚═══════════════════════════════════════════════╝
```

**Component Changes:**

#### File: `packages/web/src/components/LocalFileTab.svelte`

1. Add progress state (in `<script>` section):
```svelte
let analysisProgress = $state({
  visible: false,
  filename: '',
  message: '',
  progress: 0,
  cancelling: false
});
```

2. Add progress callback function:
```svelte
function createProgressCallback(filename: string) {
  return (message: string, progress: number) => {
    analysisProgress.visible = true;
    analysisProgress.filename = filename;
    analysisProgress.message = message;
    analysisProgress.progress = progress;
  };
}
```

3. Update `analyzeAudioFile()` calls to pass callback:
```svelte
const result = await analyzeAudioFile(file, {
  analysisMode: $currentAnalysisMode,
  preset,
  presetId: $currentPresetId,
  criteria,
  progressCallback: createProgressCallback(file.name)
});
```

4. Update cancel handler to show "Cancelling..." feedback:
```svelte
function handleCancel() {
  if (levelAnalyzerInstance) {
    analysisProgress.cancelling = true;
    analysisProgress.message = 'Cancelling...';
    levelAnalyzerInstance.cancelAnalysis();
  }
}
```

5. Handle AnalysisCancelledError in analysis try/catch:
```svelte
try {
  const result = await analyzeAudioFile(file, {
    analysisMode: $currentAnalysisMode,
    preset,
    presetId: $currentPresetId,
    criteria,
    progressCallback: createProgressCallback(file.name)
  });
  // Handle successful result...
} catch (error) {
  if (error instanceof AnalysisCancelledError) {
    // Cancellation is not an error - just reset UI
    analysisProgress.visible = false;
    analysisProgress.cancelling = false;
    return; // Don't show error message
  }
  // Handle actual errors...
} finally {
  analysisProgress.visible = false;
  analysisProgress.cancelling = false;
}
```

6. Add progress bar UI with disabled cancel button (in template):
```svelte
{#if analysisProgress.visible}
  <div class="analysis-progress">
    <div class="progress-filename">
      Analyzing: {analysisProgress.filename}
    </div>
    <div class="progress-message">
      {analysisProgress.message} {Math.round(analysisProgress.progress * 100)}%
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: {analysisProgress.progress * 100}%"></div>
    </div>
    {#if analysisProgress.cancelling}
      <button class="cancel-button" disabled>
        Cancelling...
      </button>
    {:else}
      <button class="cancel-button" on:click={handleCancel}>
        Cancel
      </button>
    {/if}
  </div}
{/if}
```

**Benefits of disabled button during cancellation:**
- Prevents double-clicks or multiple cancel requests
- Clear visual feedback that cancellation is in progress
- Standard UX pattern users expect

**Note:** If cancellation gets stuck (rare edge case), user can refresh the page as last resort.

7. Add CSS for progress bar and cancel button:
```css
.analysis-progress {
  margin: 1rem 0;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.progress-filename {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.progress-message {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--accent-color);
  transition: width 0.3s ease;
}

.cancel-button {
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  background: var(--error-color, #dc3545);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: opacity 0.2s ease;
}

.cancel-button:hover:not(:disabled) {
  opacity: 0.9;
}

.cancel-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

#### File: `packages/web/src/components/GoogleDriveTab.svelte`

**Similar changes to LocalFileTab, PLUS:**

1. Add batch context to progress display:
```svelte
{#if analysisProgress.visible}
  <div class="analysis-progress">
    <div class="progress-filename">
      {#if analysisProgress.batchTotal > 1}
        Analyzing file {analysisProgress.batchCurrent} of {analysisProgress.batchTotal}: {analysisProgress.filename}
      {:else}
        Analyzing: {analysisProgress.filename}
      {/if}
    </div>
    <!-- Rest of progress UI -->
  </div>
{/if}
```

2. Update state to include batch context:
```svelte
let analysisProgress = $state({
  visible: false,
  filename: '',
  message: '',
  progress: 0,
  cancelling: false,
  batchCurrent: 0,
  batchTotal: 0
});
```

3. Update progress callback to include batch info:
```svelte
function createProgressCallback(filename: string, current: number, total: number) {
  return (message: string, progress: number) => {
    analysisProgress.visible = true;
    analysisProgress.filename = filename;
    analysisProgress.message = message;
    analysisProgress.progress = progress;
    analysisProgress.batchCurrent = current;
    analysisProgress.batchTotal = total;
  };
}
```

#### File: `packages/web/src/components/BoxTab.svelte`

**Same changes as GoogleDriveTab** (includes batch context)

### Part 4: Testing Strategy

**Test Cases:**

1. **Single File Progress:**
   - Upload 60MB+ MP3 file (>1 hour duration)
   - Switch to experimental mode
   - Verify progress bar appears and updates smoothly
   - Verify filename is displayed
   - Verify progress percentages increase from 0-100%
   - Verify all analysis stages are shown (peak, noise floor, reverb, silence, clipping)

2. **Batch Progress:**
   - Select Google Drive folder with multiple large files
   - Start batch analysis
   - Verify "File X of Y" context is shown
   - Verify progress bar resets between files
   - Verify filename updates for each file

3. **Cancellation Responsiveness:**
   - Start analysis on large file
   - Click cancel during each stage:
     - During peak analysis (0-50%)
     - During noise floor (50-90%)
     - During reverb (93%)
     - During silence (95%)
     - During clipping (97-100%)
   - Verify "Cancelling..." message appears immediately
   - Verify analysis stops within 1-2 seconds maximum
   - Verify UI returns to ready state

4. **Cancel During Batch:**
   - Start batch with 5+ files
   - Cancel during 2nd or 3rd file
   - Verify cancellation works promptly
   - Verify partial results are preserved

5. **No Regression:**
   - Run all 739 existing tests
   - Verify no performance degradation from cancellation checks
   - Verify audio-only mode (no experimental) still works fast

## Implementation Order

1. **Core cancellation improvements** (Level 1 - Critical)
   - Add cancellation checks to all LevelAnalyzer functions
   - Test cancellation responsiveness

2. **Service layer progress support** (Level 2 - Required)
   - Add progressCallback to AnalysisOptions
   - Wire up callbacks through service layer

3. **UI progress indicators** (Level 3 - User-facing)
   - LocalFileTab (single file)
   - GoogleDriveTab (batch context)
   - BoxTab (batch context)

4. **Testing and refinement** (Level 4 - Quality)
   - Test with large files
   - Verify cancellation works in all stages
   - Check for performance impact
   - Deploy to beta for user testing

## Success Criteria

- ✅ Progress bar visible during experimental analysis
- ✅ Progress updates at least every second
- ✅ Filename displayed in progress indicator
- ✅ Batch context shown (X of Y files)
- ✅ Cancellation works within 2 seconds from any stage
- ✅ "Cancelling..." feedback shown immediately on cancel
- ✅ All 739 tests still pass
- ✅ No noticeable performance degradation

## Performance Considerations

**Cancellation Check Frequency:**
- Too frequent: Performance impact from flag checks
- Too infrequent: Slow cancellation response
- Target: Check every 100-1000 iterations depending on loop frequency
- Goal: <1% performance overhead, <2s cancellation delay

**Progress Callback Frequency:**
- Already has yielding (`setTimeout`) every 100K samples
- Progress updates piggyback on existing yield points
- No additional performance impact expected

## Rollback Plan

If issues arise:
1. Core changes are isolated to `level-analyzer.js`
2. Service changes are backward compatible (optional callback)
3. UI changes are additive (progress bar can be hidden)
4. Can deploy without UI changes if needed
5. Can disable cancellation checks if performance issues found

## Future Enhancements (Out of Scope)

- Progress bar for audio-only mode (very fast, may not be needed)
- Time remaining estimate (requires historical data)
- Progress persistence across page refresh (complex)
- Cancel button in progress bar itself (UX improvement)
