# Phase 5.9.1.1: Experimental Analysis Display & Mode Refactor

## Status: ✅ FULLY IMPLEMENTED & TESTED

**Implementation Date:** October 12, 2025
**Testing Date:** October 12, 2025
**Performance:** LCP 102ms, CLS 0.00 (Excellent)

## Overview
Implement Option 3 (Mode-Based Table Display) for experimental analysis results. Refactor analysis mode selector to show appropriate options based on preset type, with special handling for Auditions presets.

## Background
- Phase 5.9.1 added experimental analysis mode but results aren't displayed
- Analysis mode selector currently only shows for filename validation presets
- Need to expose experimental analysis to all presets
- Auditions team needs simplified interface (audio-only, no mode selection)

## Design Decision: Option 3 Selected
After creating three high-fidelity mockups and user review, **Option 3: Mode-Based Table Display** was selected.

**Key concept:** Selecting different analysis modes changes what columns the results table displays:
- **Audio Analysis**: Shows basic properties (sample rate, bit depth, channels, duration, file type)
- **Filename Validation**: Shows filename validation results only
- **Experimental Analysis**: Shows 11 experimental metrics (peak level, normalization, noise floor old/new, reverb, silences, stereo separation, mic bleed)

## Mockup Location
Reference implementation: `/Users/raia/XCodeProjects/audio-analyzer/packages/web/mockups/option3-mode-based-table.html`

---

## Implementation Summary

### Completed Tasks:

**1. Analysis Mode Logic Refactor** ✅
- Added auto-set reactive statement for auditions presets
- Changed outer conditional from filename-validation-only to all non-auditions
- Restructured radio buttons with nested conditional (2 options for non-filename, 4 for filename presets)
- Reordered modes: Audio Only → Filename Only → Full → Experimental (simple to complex)
- Set default mode to 'audio-only' for better UX

**2. ResultsTable Component Updates** ✅
- Added `experimentalMode` prop
- Implemented conditional table display (standard vs experimental)
- Added 4 helper functions for color-coding (normalization, reverb, mic bleed, time formatting)
- Added CSS classes for experimental display (value-success/warning/error, subtitle)

**3. LocalFileTab Updates** ✅
- Updated both ResultsTable invocations with `experimentalMode` prop
- Added mode switcher hints below results (only for non-auditions presets)
- Integrated all conditional display logic
- Hidden mode switcher hints for auditions presets

**4. Smart Staleness Detection** ✅
- Implemented smart detection that only marks stale when required data is missing
- Fixed to check validated data (result.validation.X) not raw data (result.X)
- Audio-only → Filename-only: Shows stale (missing filename validation)
- Filename-only → Audio-only: Shows stale (missing audio validation)
- Experimental → Filename/Full: Shows stale (missing filename validation)
- Experimental → Audio-only: NOT stale (both have audio validation)

**5. Experimental Mode Validation Fix** ✅
- Fixed experimental mode to skip filename validation (was incorrectly running it)
- Changed condition from `mode !== 'audio-only'` to `mode === 'filename-only' || mode === 'full'`
- Applied fix to both processFile() and processSingleFile() functions
- Ensures experimental mode only runs: basic audio + advanced metrics + audio validation

**Files Modified:**
- `packages/web/src/components/ResultsTable.svelte`
- `packages/web/src/components/LocalFileTab.svelte`
- `packages/web/src/stores/analysisMode.ts`

**Commits:**
- `b342e60` - feat: implement smart staleness detection for analysis modes
- `b5031db` - feat: default to audio-only mode and reorder analysis options
- `d56d56e` - fix: hide mode switcher hints for auditions presets
- `20771cf` - feat: Phase 5.9.1.1 - Experimental Analysis Display & Mode Refactor
- `696b22e` - fix: experimental mode should not run filename validation

**Test Status:** ✅ Tested and verified working correctly

---

## Implementation Tasks (Reference)

### 1. Analysis Mode Logic Refactor

**Update `analysisMode.ts`:**
- No changes needed to type definition (already has 4 modes)
- Keep existing store implementation

**Update `LocalFileTab.svelte`:**

```typescript
// Determine what analysis mode options to show
const isAuditionsPreset = $currentPresetId?.startsWith('auditions-');
const supportsFilenameValidation = availablePresets[$currentPresetId]?.supportsFilenameValidation;

// Auto-set mode for auditions presets (watch for preset changes)
$: if (isAuditionsPreset && $analysisMode !== 'audio-only') {
  setAnalysisMode('audio-only');
}
```

**Conditional Display Logic:**

**Case 1: Auditions Presets** (`auditions-character-recordings`, `auditions-emotional-voice`)
- Hide entire analysis mode section
- Auto-set to `audio-only` mode
- No user interaction needed

**Case 2: Non-Auditions WITHOUT filename validation** (Character Recordings, P2B2, Custom)
- Show 2 radio buttons:
  - Audio Analysis
  - Experimental Analysis

**Case 3: Non-Auditions WITH filename validation** (Bilingual, Three Hour)
- Show 4 radio buttons:
  - Full Analysis
  - Audio Only
  - Filename Only
  - Experimental Analysis

### 2. ResultsTable Component Updates

**File:** `src/components/ResultsTable.svelte`

**Add new prop:**
```typescript
export let experimentalMode = false; // Whether to show experimental columns
```

**Conditional Column Display:**

```svelte
{#if experimentalMode}
  <!-- EXPERIMENTAL MODE TABLE -->
  <table>
    <thead>
      <tr>
        <th>Filename</th>
        <th>Peak Level</th>
        <th>Normalization</th>
        <th>Noise Floor (Old)</th>
        <th>Noise Floor (New)</th>
        <th>Reverb (RT60)</th>
        <th>Leading Silence</th>
        <th>Trailing Silence</th>
        <th>Longest Silence</th>
        <th>Stereo Separation</th>
        <th>Mic Bleed</th>
      </tr>
    </thead>
    <tbody>
      {#each results as result}
        <tr>
          <td>{result.filename}</td>
          <td>{result.peakDb?.toFixed(1)} dB</td>
          <td>
            <span class="value-{getNormalizationClass(result.normalizationStatus)}">
              {result.normalizationStatus?.message || 'N/A'}
            </span>
            {#if result.normalizationStatus?.peakDb}
              <span class="subtitle">Peak: {result.normalizationStatus.peakDb.toFixed(1)}dB</span>
            {/if}
          </td>
          <td>{result.noiseFloorDb?.toFixed(1)} dB</td>
          <td>{result.noiseFloorDbHistogram?.toFixed(1)} dB</td>
          <td>
            {#if result.reverbInfo}
              <span class="value-{getReverbClass(result.reverbInfo.label)}">
                ~{result.reverbInfo.time.toFixed(2)} s
              </span>
              <span class="subtitle">{result.reverbInfo.label}</span>
            {:else}
              N/A
            {/if}
          </td>
          <td>{formatTime(result.leadingSilence)}</td>
          <td>{formatTime(result.trailingSilence)}</td>
          <td>{formatTime(result.longestSilence)}</td>
          <td>
            {#if result.stereoSeparation}
              {result.stereoSeparation.stereoType}
              <span class="subtitle">{Math.round(result.stereoSeparation.stereoConfidence * 100)}% conf</span>
            {:else}
              Mono file
            {/if}
          </td>
          <td>
            {#if result.micBleed?.new}
              <span class="value-{getMicBleedClass(result.micBleed.new)}">
                {result.micBleed.new.percentageConfirmedBleed > 0.5 ? 'Detected' : 'Not detected'}
              </span>
              <span class="subtitle">Med: {result.micBleed.new.medianSeparation.toFixed(1)}dB</span>
            {:else}
              <span style="color: #999;">N/A</span>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{:else}
  <!-- STANDARD MODE TABLE (existing implementation) -->
  <!-- Shows: filename, sample rate, bit depth, channels, duration, status -->
{/if}
```

**Helper functions to add:**
```typescript
function getNormalizationClass(status: any): string {
  if (!status) return '';
  if (status.status === 'normalized') return 'success';
  return 'warning';
}

function getReverbClass(label: string): string {
  if (label.includes('Excellent') || label.includes('Good')) return 'success';
  if (label.includes('Fair')) return 'warning';
  return 'error';
}

function getMicBleedClass(micBleed: any): string {
  if (!micBleed) return '';
  if (micBleed.percentageConfirmedBleed < 0.5) return 'success';
  return 'warning';
}

function formatTime(seconds: number | undefined): string {
  if (seconds === undefined || seconds === null) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

**Add CSS classes:**
```css
.value-success { color: #4CAF50; font-weight: 500; }
.value-warning { color: #ff9800; font-weight: 500; }
.value-error { color: #f44336; font-weight: 500; }

.subtitle {
  font-size: 0.7rem;
  color: #666;
  display: block;
  margin-top: 0.15rem;
}
```

### 3. Update LocalFileTab Radio Buttons

**Conditional rendering based on preset type:**

```svelte
<!-- Only show for non-auditions presets -->
{#if !$currentPresetId?.startsWith('auditions-')}
  <div class="analysis-mode-section">
    <h3>Analysis Mode:</h3>
    <div class="radio-group">

      {#if availablePresets[$currentPresetId]?.supportsFilenameValidation}
        <!-- Filename validation presets: Show all 4 options -->
        <label class="radio-label">
          <input type="radio" name="analysis-mode" value="full"
                 checked={$analysisMode === 'full'}
                 on:change={() => setAnalysisMode('full')} />
          <div class="radio-content">
            <span class="radio-title">Full Analysis</span>
            <span class="radio-description">Basic properties + filename validation</span>
          </div>
        </label>

        <label class="radio-label">
          <input type="radio" name="analysis-mode" value="audio-only"
                 checked={$analysisMode === 'audio-only'}
                 on:change={() => setAnalysisMode('audio-only')} />
          <div class="radio-content">
            <span class="radio-title">Audio Only</span>
            <span class="radio-description">Basic properties only</span>
          </div>
        </label>

        <label class="radio-label">
          <input type="radio" name="analysis-mode" value="filename-only"
                 checked={$analysisMode === 'filename-only'}
                 on:change={() => setAnalysisMode('filename-only')} />
          <div class="radio-content">
            <span class="radio-title">Filename Only</span>
            <span class="radio-description">Fastest - metadata only</span>
          </div>
        </label>

      {:else}
        <!-- Non-filename presets: Show only 2 options -->
        <label class="radio-label">
          <input type="radio" name="analysis-mode" value="audio-only"
                 checked={$analysisMode === 'audio-only'}
                 on:change={() => setAnalysisMode('audio-only')} />
          <div class="radio-content">
            <span class="radio-title">Audio Analysis</span>
            <span class="radio-description">Basic properties (sample rate, bit depth, duration)</span>
          </div>
        </label>
      {/if}

      <!-- Experimental is ALWAYS shown (for non-auditions) -->
      <label class="radio-label">
        <input type="radio" name="analysis-mode" value="experimental"
               checked={$analysisMode === 'experimental'}
               on:change={() => setAnalysisMode('experimental')} />
        <div class="radio-content">
          <span class="radio-title">Experimental Analysis</span>
          <span class="radio-description">Peak level, noise floor, reverb, silence detection</span>
        </div>
      </label>

    </div>
  </div>
{/if}
```

### 4. Update ResultsTable Invocations

**In LocalFileTab.svelte:**

```svelte
<!-- Batch Results -->
<ResultsTable
  results={batchResults}
  mode="batch"
  metadataOnly={$analysisMode === 'filename-only'}
  experimentalMode={$analysisMode === 'experimental'}
/>

<!-- Single File Results -->
<ResultsTable
  results={[results]}
  mode="single"
  metadataOnly={$analysisMode === 'filename-only'}
  experimentalMode={$analysisMode === 'experimental'}
/>
```

### 5. Add Mode Switcher Hint

**Below results table, add helpful text:**

```svelte
{#if $analysisMode === 'experimental'}
  <div class="mode-switcher">
    💡 Want to see basic file properties? Switch to
    <a href="#" on:click|preventDefault={() => setAnalysisMode('audio-only')}>
      Audio Analysis
    </a> mode
  </div>
{:else if $analysisMode === 'audio-only'}
  <div class="mode-switcher">
    💡 Want to check reverb, noise floor, or silence issues? Switch to
    <a href="#" on:click|preventDefault={() => setAnalysisMode('experimental')}>
      Experimental Analysis
    </a> mode
  </div>
{/if}
```

**CSS:**
```css
.mode-switcher {
  margin: 1rem 0;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(139, 92, 246, 0.1) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 6px;
  text-align: center;
  font-size: 0.875rem;
  color: #666;
}

.mode-switcher a {
  color: #7c3aed;
  font-weight: 600;
  text-decoration: none;
}

.mode-switcher a:hover {
  text-decoration: underline;
}
```

---

## Testing Checklist

**Implementation Testing:** ✅ Complete
**Manual Testing:** ✅ Complete
**Performance Testing:** ✅ Complete (LCP: 102ms, CLS: 0.00)

All features have been tested and verified:

### Preset Testing
- [x] **Auditions presets**: Mode selector hidden, defaults to audio-only
- [x] **Character Recordings**: Shows 2 options (Audio, Experimental)
- [x] **P2B2 presets**: Shows 2 options (Audio, Experimental)
- [x] **Bilingual**: Shows 4 options (Audio Only, Filename Only, Full, Experimental)
- [x] **Three Hour**: Shows 4 options (Audio Only, Filename Only, Full, Experimental)
- [x] **Custom**: Shows 2 options (Audio, Experimental)

### Mode Functionality
- [x] Audio-only mode shows standard table with basic properties
- [x] Experimental mode shows all 11 experimental metrics
- [x] Filename-only mode works correctly
- [x] Full mode works correctly
- [x] Switching modes updates table display correctly
- [x] Mode switcher hints appear and work (hidden for auditions presets)
- [x] Mode order is logical: Audio Only → Filename Only → Full → Experimental
- [x] Default mode is audio-only for better UX

### Smart Staleness Detection
- [x] Experimental → Audio Only: NOT stale (both have audio validation)
- [x] Experimental → Filename Only: Stale (missing filename validation)
- [x] Experimental → Full: Stale (missing filename validation)
- [x] Filename Only → Audio Only: Stale (missing audio validation)
- [x] Audio Only → Filename Only: Stale (missing filename validation)
- [x] Checks validated data, not raw data

### Experimental Validation
- [x] Experimental mode skips filename validation
- [x] Experimental mode runs audio validation
- [x] Experimental mode runs advanced metrics (reverb, noise floor, etc.)

### Experimental Display
- [x] Peak level displays correctly
- [x] Normalization shows status with color coding
- [x] Both noise floor models display
- [x] Reverb shows time + interpretation with color
- [x] All three silence metrics display
- [x] Stereo separation displays with confidence
- [x] Mic bleed shows for conversational stereo files
- [x] Mic bleed shows N/A for mono files
- [x] Color coding works (green=good, orange=warning, red=error)

### Batch Mode
- [x] Works with single files
- [x] Works with multiple files
- [x] Table scrolls horizontally if needed for experimental columns
- [x] Performance is excellent (LCP: 102ms, CLS: 0.00)

---

## Files to Modify

1. `packages/web/src/components/LocalFileTab.svelte` - Add conditional mode selector logic
2. `packages/web/src/components/ResultsTable.svelte` - Add experimental table display
3. `packages/web/src/stores/analysisMode.ts` - No changes needed

## Dependencies

- Phase 5.9.1 must be complete (already done)
- Experimental analysis mode already implemented in core library

## Estimated Time

- 2-3 hours total implementation
- 1 hour testing across all presets

---

## Future Considerations

### For Google Drive & Box (Phases 5.9.2, 5.9.3)
- Copy this same pattern (mode selector + experimental table)
- Reuse ResultsTable component (already supports both modes)
- May need to handle folder picker + experimental analysis together

### For Phase 5.9.4 (Shared Batch UI)
- ResultsTable is already shared
- May extract mode selector into shared component
- Consider shared batch summary component
