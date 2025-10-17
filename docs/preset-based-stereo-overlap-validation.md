# Preset-Based Stereo Type and Speech Overlap Validation

## Problem Statement

The current stereo separation confidence validation has two fundamental issues:

1. **Duration Blindness**: Percentage-based confidence thresholds don't account for file length
   - 2-hour file at 80% confidence = 24 minutes of uncertain blocks
   - 30-second file at 80% confidence = 6 seconds of uncertain blocks
   - Both get same "warning" status, but represent very different quality issues

2. **Missing Preset Context**: All files are validated the same way, regardless of their intended use
   - Bilingual files REQUIRE Conversational Stereo (structural requirement)
   - Auditions files REQUIRE mono (shouldn't have channel separation)
   - Different presets have different stereo and overlap requirements

## Solution Design

Move from universal validation to **preset-based validation** with two independent checks:

### 1. Stereo Type Validation (Structural)
Validates that the file has the correct stereo architecture for the preset.

### 2. Speech Overlap Validation (Quality)
Validates that speech overlap is within acceptable thresholds for the preset.

Both validations are **optional** - only run if the preset defines requirements.

---

## Implementation Details

### Preset Configuration Schema

```typescript
export interface PresetConfig {
  // ... existing fields

  // NEW: Required stereo types (optional)
  stereoType?: string[]; // e.g., ['Conversational Stereo']

  // NEW: Speech overlap thresholds (optional)
  maxOverlapWarning?: number; // e.g., 5 = warn if >5% overlap
  maxOverlapFail?: number;    // e.g., 10 = fail if >10% overlap
}
```

### Validation Logic

#### Stereo Type Validation (Binary: Pass/Fail)

**When to run**: Only if preset has `stereoType` defined

**Logic**:
- ✅ **Pass**: Detected stereo type is in the preset's `stereoType` array
- ❌ **Fail**: Detected stereo type is NOT in the preset's `stereoType` array

**No warning zone** - structural requirements are binary (correct or wrong)

**Edge cases** (all fail if not in allowed types):
- Silent
- Undetermined
- Mixed Stereo
- Mono as Stereo
- Mono in Left/Right Channel

#### Speech Overlap Validation (Three States: Pass/Warning/Fail)

**When to run**: Only if preset has `maxOverlapWarning` AND `maxOverlapFail` defined

**Logic**:
- ✅ **Pass**: Overlap ≤ maxOverlapWarning
- ⚠️ **Warning**: maxOverlapWarning < overlap ≤ maxOverlapFail
- ❌ **Fail**: Overlap > maxOverlapFail

**Only applies to stereo files** with conversational analysis data

---

## Preset Configurations

### Bilingual Conversational
```typescript
'bilingual-conversational': {
  name: 'Bilingual Conversational',
  fileType: ['wav'],
  sampleRate: ['48000'],
  bitDepth: ['16', '24'],
  channels: ['2'],
  minDuration: '',
  stereoType: ['Conversational Stereo'], // REQUIRED
  maxOverlapWarning: 5,  // Warn if >5% overlap
  maxOverlapFail: 10,    // Fail if >10% overlap
  supportsFilenameValidation: true,
  filenameValidationType: 'bilingual-pattern'
}
```

### P2B2 Pairs (Stereo)
```typescript
'p2b2-pairs-stereo': {
  name: 'P2B2 Pairs (Stereo)',
  fileType: ['wav'],
  sampleRate: ['44100', '48000'],
  bitDepth: ['16', '24'],
  channels: ['2'],
  minDuration: '',
  stereoType: ['Conversational Stereo'], // REQUIRED
  maxOverlapWarning: 3,  // Stricter thresholds
  maxOverlapFail: 8
}
```

### P2B2 Pairs (Mixed)
```typescript
'p2b2-pairs-mixed': {
  name: 'P2B2 Pairs (Mixed)',
  fileType: ['wav'],
  sampleRate: ['44100', '48000'],
  bitDepth: ['16', '24'],
  channels: ['1', '2'],
  minDuration: '',
  stereoType: ['Conversational Stereo'], // Only checked for 2-channel files
  maxOverlapWarning: 3,
  maxOverlapFail: 8
}
```

### Auditions: Character Recordings
```typescript
'auditions-character-recordings': {
  name: 'Auditions: Character Recordings',
  fileType: ['wav'],
  sampleRate: ['48000'],
  bitDepth: ['24'],
  channels: ['1'],
  minDuration: '120'
  // No stereoType or overlap validation (mono files)
}
```

### Auditions: Emotional Voice
```typescript
'auditions-emotional-voice': {
  name: 'Auditions: Emotional Voice',
  fileType: ['wav'],
  sampleRate: ['48000'],
  bitDepth: ['16', '24'],
  channels: ['1', '2'],
  minDuration: '5'
  // No stereoType or overlap validation (permissive preset)
}
```

### Character Recordings
```typescript
'character-recordings': {
  name: 'Character Recordings',
  fileType: ['wav'],
  sampleRate: ['48000'],
  bitDepth: ['24'],
  channels: ['1'],
  minDuration: ''
  // No stereoType or overlap validation (mono files)
}
```

### P2B2 Pairs (Mono)
```typescript
'p2b2-pairs-mono': {
  name: 'P2B2 Pairs (Mono)',
  fileType: ['wav'],
  sampleRate: ['44100', '48000'],
  bitDepth: ['16', '24'],
  channels: ['1'],
  minDuration: ''
  // No stereoType or overlap validation (mono files)
}
```

### Three Hour
```typescript
'three-hour': {
  name: 'Three Hour',
  fileType: ['wav'],
  sampleRate: ['48000'],
  bitDepth: ['24'],
  channels: ['1'],
  minDuration: '',
  supportsFilenameValidation: true,
  filenameValidationType: 'script-match',
  gdriveOnly: true
  // No stereoType or overlap validation (mono files)
}
```

### Custom
```typescript
'custom': {
  name: 'Custom'
  // User-defined, no preset validation
}
```

---

## Validation Method Signatures

### CriteriaValidator.validateStereoType()
```javascript
/**
 * Validates stereo type against preset requirements
 * @param {object} stereoSeparation - Stereo separation analysis results
 * @param {PresetConfig} preset - Selected preset configuration
 * @returns {object} { status: 'pass'|'fail', message: string }
 */
static validateStereoType(stereoSeparation, preset) {
  // Skip if preset doesn't define stereoType requirement
  if (!preset.stereoType || preset.stereoType.length === 0) {
    return null; // No validation needed
  }

  // Skip if file isn't stereo
  if (!stereoSeparation) {
    return { status: 'fail', message: 'Not a stereo file' };
  }

  const detectedType = stereoSeparation.stereoType;

  if (preset.stereoType.includes(detectedType)) {
    return { status: 'pass', message: detectedType };
  } else {
    return {
      status: 'fail',
      message: `Expected ${preset.stereoType.join(' or ')}, found ${detectedType}`
    };
  }
}
```

### CriteriaValidator.validateSpeechOverlap()
```javascript
/**
 * Validates speech overlap against preset thresholds
 * @param {object} conversationalAnalysis - Conversational audio analysis results
 * @param {PresetConfig} preset - Selected preset configuration
 * @returns {object} { status: 'pass'|'warning'|'fail', message: string, percentage: number }
 */
static validateSpeechOverlap(conversationalAnalysis, preset) {
  // Skip if preset doesn't define overlap thresholds
  if (preset.maxOverlapWarning === undefined || preset.maxOverlapFail === undefined) {
    return null; // No validation needed
  }

  // Skip if no overlap data
  if (!conversationalAnalysis?.overlap) {
    return null;
  }

  const overlapPct = conversationalAnalysis.overlap.overlapPercentage;

  if (overlapPct <= preset.maxOverlapWarning) {
    return {
      status: 'pass',
      message: `${overlapPct.toFixed(1)}% overlap`,
      percentage: overlapPct
    };
  } else if (overlapPct <= preset.maxOverlapFail) {
    return {
      status: 'warning',
      message: `${overlapPct.toFixed(1)}% overlap (>${preset.maxOverlapWarning}%)`,
      percentage: overlapPct
    };
  } else {
    return {
      status: 'fail',
      message: `${overlapPct.toFixed(1)}% overlap (>${preset.maxOverlapFail}%)`,
      percentage: overlapPct
    };
  }
}
```

---

## Integration Points

### 1. Update Preset Definitions
**File**: `/packages/web/src/settings/types.ts`
- Add `stereoType`, `maxOverlapWarning`, `maxOverlapFail` to `PresetConfig` interface
- Update all preset configurations in `DEFAULT_PRESETS`

### 2. Update Validation Methods
**File**: `/packages/core/criteria-validator.js`
- **Remove**: `validateStereoSeparation()` (old confidence-based validation)
- **Add**: `validateStereoType(stereoSeparation, preset)`
- **Add**: `validateSpeechOverlap(conversationalAnalysis, preset)`

### 3. Update Export Integration
**File**: `/packages/web/src/utils/export-utils.ts`
- Remove stereo confidence validation logic
- Add stereo type validation (check against preset)
- Add speech overlap validation (check against preset thresholds)
- Update quality check messages and recommendations

### 4. Update UI Color Coding
**File**: `/packages/web/src/components/ResultsTable.svelte`
- Update stereo separation column to use preset-based validation
- Keep speech overlap column separate (already exists)
- Apply color coding based on validation results

### 5. Update Tests
- Remove old stereo confidence tests (`stereo-validation.test.js`)
- Add new stereo type validation tests (preset-based)
- Add new speech overlap validation tests (threshold-based)
- Update export tests to use new validation logic

---

## Examples of Validation Results

### Example 1: Bilingual File (Correct)
**File**: 2-channel WAV, detected as "Conversational Stereo", 3% overlap
**Preset**: Bilingual Conversational (requires Conversational Stereo, maxOverlapWarning: 5%, maxOverlapFail: 10%)

**Results**:
- Stereo Type: ✅ Pass - "Conversational Stereo"
- Speech Overlap: ✅ Pass - "3.0% overlap"
- Overall: ✅ PASS

### Example 2: Bilingual File (Wrong Stereo Type)
**File**: 2-channel WAV, detected as "Mono as Stereo", 2% overlap
**Preset**: Bilingual Conversational

**Results**:
- Stereo Type: ❌ Fail - "Expected Conversational Stereo, found Mono as Stereo"
- Speech Overlap: ✅ Pass - "2.0% overlap"
- Overall: ❌ FAIL (stereo type wrong)

### Example 3: Bilingual File (Too Much Overlap)
**File**: 2-channel WAV, detected as "Conversational Stereo", 12% overlap
**Preset**: Bilingual Conversational

**Results**:
- Stereo Type: ✅ Pass - "Conversational Stereo"
- Speech Overlap: ❌ Fail - "12.0% overlap (>10%)"
- Overall: ❌ FAIL (excessive overlap)

### Example 4: Bilingual File (Warning Zone)
**File**: 2-channel WAV, detected as "Conversational Stereo", 7% overlap
**Preset**: Bilingual Conversational

**Results**:
- Stereo Type: ✅ Pass - "Conversational Stereo"
- Speech Overlap: ⚠️ Warning - "7.0% overlap (>5%)"
- Overall: ⚠️ WARNING (overlap in concerning range)

### Example 5: Auditions File (No Validation)
**File**: 1-channel WAV
**Preset**: Auditions: Character Recordings (no stereo/overlap requirements)

**Results**:
- Stereo Type: (not checked - mono file)
- Speech Overlap: (not checked - no thresholds defined)
- Overall: Validated on other criteria only (sample rate, bit depth, etc.)

---

## Migration Notes

### What Gets Removed
1. `CriteriaValidator.validateStereoSeparation()` method (confidence-based validation)
2. Stereo confidence thresholds in export-utils.ts
3. Stereo confidence tests in `stereo-validation.test.js`
4. Stereo confidence color coding logic in ResultsTable.svelte

### What Gets Added
1. `stereoType`, `maxOverlapWarning`, `maxOverlapFail` fields to preset configurations
2. `CriteriaValidator.validateStereoType()` method (preset-based)
3. `CriteriaValidator.validateSpeechOverlap()` method (preset-based)
4. Preset-aware validation in export and UI
5. New tests for preset-based validation

### Backward Compatibility
- Presets without `stereoType` or overlap thresholds skip those validations
- Existing validation (sample rate, bit depth, channels, duration) unchanged
- Custom preset continues to allow user-defined criteria

---

## Success Criteria

✅ Stereo type validation is preset-aware (Bilingual requires Conversational Stereo, etc.)

✅ Speech overlap validation uses thresholds (pass/warning/fail zones)

✅ Both validations are optional (only run if preset defines requirements)

✅ No more duration-blind percentage validation

✅ All 841+ tests pass

✅ Export includes correct quality checks and recommendations

✅ UI shows color-coded validation results

✅ Works in dev environment and production
