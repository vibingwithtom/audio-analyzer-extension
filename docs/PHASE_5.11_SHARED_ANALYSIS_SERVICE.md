# Phase 5.11: Shared Analysis Service

## Status: 📝 PLANNING

**Created:** October 12, 2025

## Overview

This phase addresses critical technical debt by extracting the duplicated audio file analysis logic from `LocalFileTab`, `GoogleDriveTab`, and future `BoxTab` into a single, reusable service module. Currently, the core analysis logic is copy-pasted across tabs, making bug fixes and feature additions error-prone and time-consuming.

This refactoring will complement Phase 5.10's shared display component, completing the separation of concerns: tabs handle their specific data sources, the analysis service processes files, and the display component renders results.

### Problem: Duplicated Analysis Logic

Currently, each tab component independently implements identical logic for:
- Creating `LevelAnalyzer` instances per file
- Calling `analyzeAudioBuffer()` with appropriate flags
- Adding stereo separation analysis
- Adding mic bleed analysis
- Running validation against selected presets
- Error handling and result formatting

**Example of current duplication:**

**LocalFileTab.svelte (lines 157-185):**
```typescript
// Advanced analysis (ONLY in experimental mode)
let advancedResults = null;
if ($analysisMode === 'experimental' && file.size > 0) {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Create a new LevelAnalyzer instance for each file
  const levelAnalyzer = new LevelAnalyzer();

  // Run level analysis with experimental features
  advancedResults = await levelAnalyzer.analyzeAudioBuffer(audioBuffer, null, true);

  // Add stereo separation analysis
  const stereoSeparation = levelAnalyzer.analyzeStereoSeparation(audioBuffer);
  if (stereoSeparation) {
    advancedResults.stereoSeparation = stereoSeparation;
  }

  // Add mic bleed analysis (only for stereo files)
  const micBleed = levelAnalyzer.analyzeMicBleed(audioBuffer);
  if (micBleed) {
    advancedResults.micBleed = micBleed;
  }
}
```

**GoogleDriveTab.svelte (lines 183-199):**
```typescript
// Advanced analysis (ONLY in experimental mode)
let advancedResults = null;
if ($analysisMode === 'experimental' && file.size > 0) {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Create a new LevelAnalyzer instance for each file to avoid concurrent analysis conflicts
  const levelAnalyzer = new LevelAnalyzer();

  // Run level analysis with experimental features
  advancedResults = await levelAnalyzer.analyzeAudioBuffer(audioBuffer, null, true);

  // Add stereo separation analysis
  const stereoSeparation = levelAnalyzer.analyzeStereoSeparation(audioBuffer);
  if (stereoSeparation) {
    advancedResults.stereoSeparation = stereoSeparation;
  }

  // Add mic bleed analysis (only for stereo files)
  const micBleed = levelAnalyzer.analyzeMicBleed(audioBuffer);
  if (micBleed) {
    advancedResults.micBleed = micBleed;
  }
}
```

This exact pattern appears in both tabs and will be needed in BoxTab, making it the perfect candidate for extraction.

### Solution: A Centralized Analysis Service

We will create `src/services/audio-analysis-service.ts`, a pure TypeScript module that encapsulates all file analysis logic. This service will be imported and used by all tab components.

---

## Implementation Plan

### 1. Create the Analysis Service Module

**File:** `src/services/audio-analysis-service.ts`

**Core Function Signature:**
```typescript
import { AudioAnalyzer, LevelAnalyzer, CriteriaValidator } from '@audio-analyzer/core';
import type { AudioResults, AnalysisMode } from '../types';
import type { Preset } from '../presets';

export interface AnalysisOptions {
  analysisMode: AnalysisMode;
  preset?: Preset | null;
  metadataOnly?: boolean;
}

/**
 * Analyzes an audio file and returns comprehensive results.
 *
 * @param file - The audio file to analyze (File or Blob)
 * @param options - Analysis configuration options
 * @returns Promise resolving to AudioResults
 * @throws Error if analysis fails
 */
export async function analyzeAudioFile(
  file: File | Blob,
  options: AnalysisOptions
): Promise<AudioResults> {
  const { analysisMode, preset, metadataOnly = false } = options;

  // Extract filename
  const filename = file instanceof File ? file.name : 'unknown';

  try {
    // For metadata-only mode, return early with just filename info
    if (metadataOnly || analysisMode === 'filename-only') {
      return await analyzeMetadataOnly(file, filename, preset);
    }

    // Full analysis path
    return await analyzeFullFile(file, filename, analysisMode, preset);

  } catch (error) {
    // Standardized error handling
    return {
      filename,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      fileSize: file.size
    };
  }
}

/**
 * Analyzes only file metadata (no audio decoding)
 */
async function analyzeMetadataOnly(
  file: File | Blob,
  filename: string,
  preset?: Preset | null
): Promise<AudioResults> {
  const result: AudioResults = {
    filename,
    fileSize: file.size,
    status: 'pass'
  };

  // Validate filename against preset if provided
  if (preset?.filenameValidation) {
    const validation = validateFilename(filename, preset);
    result.validation = { filename: validation };
    result.status = validation.status;
  }

  return result;
}

/**
 * Performs full audio analysis including decoding and advanced metrics
 */
async function analyzeFullFile(
  file: File | Blob,
  filename: string,
  analysisMode: AnalysisMode,
  preset?: Preset | null
): Promise<AudioResults> {
  // Basic audio analysis
  const audioAnalyzer = new AudioAnalyzer();
  const arrayBuffer = await file.arrayBuffer();
  const basicResults = await audioAnalyzer.analyze(arrayBuffer, filename);

  let result: AudioResults = {
    ...basicResults,
    status: 'pass'
  };

  // Advanced/Experimental analysis
  if (analysisMode === 'experimental' && file.size > 0) {
    const advancedResults = await analyzeExperimental(arrayBuffer);
    result = { ...result, ...advancedResults };
  }

  // Validation against preset criteria
  if (preset?.criteria && analysisMode !== 'filename-only') {
    const validation = CriteriaValidator.validateResults(
      result,
      preset.criteria,
      analysisMode === 'filename-only'
    );
    result.validation = validation;
    result.status = determineOverallStatus(validation);
  }

  return result;
}

/**
 * Runs experimental analysis: reverb, noise floor, stereo separation, mic bleed
 */
async function analyzeExperimental(arrayBuffer: ArrayBuffer): Promise<Partial<AudioResults>> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Create a new LevelAnalyzer instance to avoid concurrent analysis conflicts
  const levelAnalyzer = new LevelAnalyzer();

  // Run level analysis with experimental features (reverb, noise floor, silence)
  const advancedResults = await levelAnalyzer.analyzeAudioBuffer(audioBuffer, null, true);

  // Add stereo separation analysis
  const stereoSeparation = levelAnalyzer.analyzeStereoSeparation(audioBuffer);
  if (stereoSeparation) {
    advancedResults.stereoSeparation = stereoSeparation;
  }

  // Add mic bleed analysis (only meaningful for stereo files)
  const micBleed = levelAnalyzer.analyzeMicBleed(audioBuffer);
  if (micBleed) {
    advancedResults.micBleed = micBleed;
  }

  return advancedResults;
}

/**
 * Validates filename against preset rules
 */
function validateFilename(filename: string, preset: Preset): ValidationResult {
  // Implementation depends on preset.filenameValidation type
  // This logic already exists in the tabs and should be moved here
  // ...
}

/**
 * Determines overall status based on validation results
 */
function determineOverallStatus(validation: ValidationResults): 'pass' | 'warning' | 'fail' {
  let hasFailure = false;
  let hasWarning = false;

  Object.values(validation).forEach(v => {
    if (v.status === 'fail') hasFailure = true;
    if (v.status === 'warning') hasWarning = true;
  });

  if (hasFailure) return 'fail';
  if (hasWarning) return 'warning';
  return 'pass';
}
```

### 2. Refactor Tab Components to Use the Service

**Before (in each tab):**
```typescript
async function processFile(file: File) {
  processing = true;
  error = '';

  try {
    // 50+ lines of duplicated analysis logic
    const audioAnalyzer = new AudioAnalyzer();
    const arrayBuffer = await file.arrayBuffer();
    // ... etc ...
  } catch (err) {
    error = err.message;
  } finally {
    processing = false;
  }
}
```

**After (in each tab):**
```typescript
import { analyzeAudioFile } from '../services/audio-analysis-service';

async function processFile(file: File) {
  processing = true;
  error = '';

  try {
    const result = await analyzeAudioFile(file, {
      analysisMode: $analysisMode,
      preset: $currentPresetId ? availablePresets[$currentPresetId] : null,
      metadataOnly: $analysisMode === 'filename-only'
    });

    currentResult = result;
    resultsMode = $analysisMode;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Analysis failed';
  } finally {
    processing = false;
  }
}
```

### 3. Update Each Tab Component

**LocalFileTab.svelte:**
- Remove `processFile()` internal logic (lines ~157-185, ~350-380)
- Import and call `analyzeAudioFile()`
- Keep only tab-specific logic (file upload handling, UI state)

**GoogleDriveTab.svelte:**
- Remove `processBatchFiles()` analysis logic (lines ~183-199)
- Import and call `analyzeAudioFile()`
- Keep only Google Drive-specific logic (auth, file downloads)

**BoxTab.svelte (when implemented):**
- Use `analyzeAudioFile()` from the start
- No duplication needed

### 4. Add Unit Tests (Optional but Recommended)

Since this is a pure function with no UI dependencies, it's highly testable:

```typescript
// src/services/audio-analysis-service.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeAudioFile } from './audio-analysis-service';

describe('analyzeAudioFile', () => {
  it('should handle metadata-only mode without decoding audio', async () => {
    const file = new File([], 'test.wav');
    const result = await analyzeAudioFile(file, {
      analysisMode: 'filename-only'
    });

    expect(result.filename).toBe('test.wav');
    expect(result.sampleRate).toBeUndefined();
  });

  // More tests...
});
```

---

## Benefits

1. **Single Source of Truth**: Analysis logic exists in one place. Bug fixes apply everywhere.
2. **Easier Testing**: Pure function can be unit tested independently of UI.
3. **Simplified Tab Components**: Tabs become 50-100 lines shorter, focusing only on their specific concerns.
4. **Faster Box Implementation**: Box tab just imports the service, no copy-pasting needed.
5. **Type Safety**: Centralized types and interfaces prevent inconsistencies.
6. **Performance Optimizations**: Any future optimizations (e.g., Web Workers) only need to be added once.

---

## Files to Create

- **`src/services/audio-analysis-service.ts`**: (New file) ~200-250 lines

## Files to Modify

- **`src/components/LocalFileTab.svelte`**: Remove ~80 lines of duplicated analysis logic
- **`src/components/GoogleDriveTab.svelte`**: Remove ~80 lines of duplicated analysis logic
- **`src/types.ts`**: May need to export additional types for the service

---

## Success Criteria

- [ ] `audio-analysis-service.ts` is created with `analyzeAudioFile()` function
- [ ] `LocalFileTab.svelte` uses the service instead of inline logic
- [ ] `GoogleDriveTab.svelte` uses the service instead of inline logic
- [ ] All four analysis modes work correctly (full, audio-only, filename-only, experimental)
- [ ] Experimental analysis includes stereo separation and mic bleed
- [ ] Validation against presets works identically to before
- [ ] No visual or functional regressions in any tab
- [ ] Code duplication is significantly reduced (150+ lines removed across tabs)

---

## Testing Strategy

### Manual Testing Checklist

**LocalFileTab:**
- [ ] Upload single file, verify all analysis modes work
- [ ] Upload batch files, verify all analysis modes work
- [ ] Test experimental mode shows stereo separation and mic bleed
- [ ] Test validation against presets

**GoogleDriveTab:**
- [ ] Process single file, verify all analysis modes work
- [ ] Process folder batch, verify all analysis modes work
- [ ] Test experimental mode shows all metrics
- [ ] Test validation against presets

**Cross-Tab Consistency:**
- [ ] Same file analyzed in LocalFileTab and GoogleDriveTab produces identical results
- [ ] Error messages are consistent across tabs

---

## Estimated Time

- **Service Creation:** 1 hour
- **LocalFileTab Refactoring:** 30 minutes
- **GoogleDriveTab Refactoring:** 30 minutes
- **Testing:** 30 minutes
- **Total:** 2-2.5 hours

---

## Dependencies

- ✅ **Phase 5.9.2**: Google Drive Batch Processing (established the patterns we're extracting)
- ⏳ **Phase 5.10**: Shared Results Display (optional dependency, can be done before or after)

---

## Notes

- This refactoring is **low-risk** because it's purely moving code, not changing behavior
- The service is a pure function with clear inputs/outputs, making it easy to test
- Consider adding this service as a stepping stone toward Web Worker-based analysis in the future
- After this phase, implementing BoxTab will be significantly easier
