# Audio Analyzer: Testing & Refactoring Strategy

**Status:** 🟡 Planning
**Started:** October 9, 2025
**Target Completion:** November 2025

---

## Executive Summary

This document outlines a comprehensive strategy to improve code quality, maintainability, and test coverage for the Audio Analyzer web application. The project currently has **zero test coverage** and a **3,159-line god class** that handles all application logic, making it difficult to maintain and extend safely.

**Strategy:** Test infrastructure first, build comprehensive test suite, then refactor with TypeScript, and migrate to component-based architecture.

**Development Approach:** LLM-assisted development with human review and testing cycles.

**Timeline:** ~2 weeks of development work across 5 phases (actual calendar time depends on review cycles)

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Why Testing First?](#why-testing-first)
3. [LLM-First Development Approach](#llm-first-development-approach)
4. [Phase 1: Test Infrastructure Setup](#phase-1-test-infrastructure-setup)
5. [Phase 2: Core Business Logic Tests](#phase-2-core-business-logic-tests)
6. [Phase 3: Integration Tests](#phase-3-integration-tests)
7. [Phase 4: Refactoring with TypeScript](#phase-4-refactoring-with-typescript)
8. [Phase 5: Svelte Migration](#phase-5-svelte-migration)
9. [Detailed Refactoring Plan](#detailed-refactoring-plan)
10. [Success Metrics](#success-metrics)
11. [GitHub Issues](#github-issues)
12. [Progress Tracking](#progress-tracking)

---

## Current State Analysis

### Architecture Overview

**Monorepo Structure:**
- ✅ `packages/core`: Well-organized (1,731 lines across 6 focused files)
- ⚠️ `packages/web/src/main.js`: **3,159 lines** - massive god class
- ✅ `packages/web/src/google-auth.js`: 417 lines
- ✅ `packages/web/src/box-auth.js`: 367 lines

### Core Package (Good Structure)
```
packages/core/
├── audio-analyzer.js      (186 lines)
├── batch-processor.js     (313 lines)
├── criteria-validator.js  (238 lines)
├── google-drive.js        (167 lines)
├── index.js              (105 lines)
└── level-analyzer.js      (722 lines)
```

### Web Package (Needs Refactoring)
```
packages/web/src/
├── main.js                   (3,159 lines) ⚠️ GOD CLASS
├── google-auth.js            (417 lines)
├── box-auth.js               (367 lines)
├── config.js                 (1,121 lines data)
├── bilingual-validation-data.json (1MB)
└── styles.css                (23,341 lines)
```

### Critical Issues

#### 1. God Class Anti-Pattern
`main.js` handles everything:
- ❌ UI initialization & DOM management (~200 lines)
- ❌ State management (settings, file processing, batch mode) (~300 lines)
- ❌ File handlers (local, Google Drive, Box) (~600 lines)
- ❌ Display logic (single file vs batch - **DUPLICATED**) (~500 lines)
- ❌ Validation logic (~400 lines)
- ❌ Audio playback (~200 lines)
- ❌ Advanced analysis (~400 lines)
- ❌ Auth status management (~200 lines)
- ❌ Settings management (~400 lines)

#### 2. Code Duplication
- **Display Logic:** `validateAndDisplayResults()` (single file) vs `showBatchResults()` (batch) - nearly identical logic
- **Filename Validation Settings:** Duplicated 3 times for local/Google Drive/Box
- **File Processing:** Similar patterns repeated for each source
- **Column Visibility:** Separate implementations for single vs batch tables

#### 3. Testing & Quality
- ❌ **Zero test coverage**
- ❌ No testing framework configured
- ❌ Only stub test scripts in package.json
- ❌ No CI/CD testing pipeline
- ❌ High risk of regressions when making changes

#### 4. Tight Coupling
- Business logic mixed with UI logic
- Hard to test individual components
- Difficult to reuse code
- Changes in one area affect many others

#### 5. No Type Safety
- ❌ No TypeScript or JSDoc
- ❌ Runtime errors from type mismatches
- ❌ Poor IDE autocomplete
- ❌ Difficult for LLMs to infer correct usage

---

## Why Testing First?

### Critical Reasoning

**✅ Pros of Testing First:**

1. **Safety Net:** Tests verify refactoring doesn't break existing functionality
2. **Risk Mitigation:** 3,159 lines = high chance of breaking subtle behaviors
3. **Documentation:** Tests document current behavior before we change it
4. **Confidence:** Can refactor aggressively with comprehensive coverage
5. **Edge Cases:** Will discover hidden bugs during test writing
6. **Regression Prevention:** Catches issues immediately during refactoring

**❌ Risks of Refactoring Without Tests:**

1. **No Verification:** How do you know the refactor works correctly?
2. **Silent Failures:** Subtle bugs may not be noticed until production
3. **Fear of Change:** Without tests, developers become afraid to touch code
4. **Time Loss:** Debugging production issues takes far longer than writing tests
5. **False Confidence:** Code may look better but behave differently

### Real-World Example

Consider the recent bug fix: "Audio Quality Analysis checkbox not working for single files"

- **With Tests:** Would have caught this immediately
- **Without Tests:** Required manual testing on beta, multiple deployments
- **Risk:** Could have shipped broken to production

**After refactoring without tests, how would we verify:**
- Filename validation still works for all patterns?
- Metadata-only mode behaves correctly?
- Batch processing handles errors properly?
- Google Drive/Box authentication flows work?
- Advanced analysis calculations are correct?

**Answer:** We couldn't, reliably.

---

## LLM-First Development Approach

### Why This Matters for LLM-Assisted Development

This project will be developed **primarily by LLMs** (Claude, etc.) with human review. This fundamentally changes the priorities:

#### Testing is **Critical** (Not Just Nice-to-Have)
- **LLMs generate code fast** but need verification
- Tests are executable specifications that LLMs can understand
- Without tests, you can't verify LLM-generated code works until production
- **Verdict:** Testing becomes THE most important phase

#### TypeScript is **Essential** (Not Optional)
- Types are documentation that LLMs can parse reliably
- Prevents "looks correct but crashes at runtime" code
- Helps LLMs infer intent without asking questions
- Enables better autocomplete and error detection during generation
- **Verdict:** TypeScript should be added during refactoring, not later

#### Component Architecture is **Valuable** (Not Future Work)
- Smaller, focused modules are easier for LLMs to reason about
- Clear boundaries reduce context needed for each task
- Component-based frameworks (React/Vue/Svelte) have extensive training data
- "Add a file upload component" is clearer than "modify lines 900-1000 of main.js"
- **Verdict:** Framework migration should happen sooner than originally planned

#### Documentation is **Required** (Not Optional)
- LLMs need architectural context to make good decisions
- Rationale for decisions prevents LLMs from undoing intentional choices
- Test descriptions guide LLM test generation
- **Verdict:** All modules and decisions must be documented

### Development Workflow

**Typical cycle:**
1. LLM generates code/tests based on specifications
2. Human reviews diffs and logic
3. Run tests to verify correctness
4. Deploy to beta for integration testing
5. Human validates in beta
6. Merge to production

**Bottleneck:** Human review and testing cycles, not development time

### Timeline Considerations

**Est. times are LLM development time** (not human developer time with meetings, context switching, etc.)

**Actual calendar time depends on:**
- How quickly you review changes
- Beta testing cycles
- Decision points requiring your input
- Issues discovered during testing

**Example:** Phase 2 (Core Tests) = "2-3 days" of LLM work, but might take 1-2 weeks calendar time depending on your availability.

---

## Phase 1: Test Infrastructure Setup

**Status:** ⬜ Not Started
**LLM Development Time:** 2-3 hours
**Calendar Time:** 1 day (with review cycles)
**Owner:** TBD

### Goals

- Set up modern testing framework (Vitest)
- Configure code coverage reporting
- Create test file structure
- Establish testing patterns
- Write sample tests to verify setup

### Tasks

#### 1.1 Install Dependencies ⬜

```bash
npm install --save-dev vitest @vitest/ui c8 jsdom
```

**Dependencies:**
- `vitest`: Fast test framework (built for Vite)
- `@vitest/ui`: Interactive test UI
- `c8`: Code coverage tool (native V8 coverage)
- `jsdom`: DOM environment for browser testing

#### 1.2 Configure Vitest ⬜

Create `packages/web/vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.js',
        '**/*.spec.js'
      ]
    }
  },
  resolve: {
    alias: {
      '@audio-analyzer/core': path.resolve(__dirname, '../core')
    }
  }
});
```

#### 1.3 Update package.json Scripts ⬜

Add to `packages/web/package.json`:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:run": "vitest run"
  }
}
```

#### 1.4 Create Test Structure ⬜

```
packages/web/
├── src/
│   ├── main.js
│   ├── google-auth.js
│   └── box-auth.js
└── tests/                          ← NEW
    ├── unit/
    │   ├── validation.test.js
    │   ├── criteria.test.js
    │   └── formatting.test.js
    ├── integration/
    │   ├── file-processing.test.js
    │   └── batch-processing.test.js
    ├── helpers/
    │   ├── test-utils.js
    │   └── mock-data.js
    └── setup.js
```

#### 1.5 Write Sample Tests ⬜

Create `tests/unit/validation.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { WebAudioAnalyzer } from '../src/main.js';

describe('Filename Validation', () => {
  it('should validate Bilingual filename format', () => {
    const analyzer = new WebAudioAnalyzer();
    const result = analyzer.validateBilingualFilename(
      'CONV12345-EN-user-001-agent-002.wav'
    );
    expect(result.status).toBe('pass');
  });

  it('should reject invalid Bilingual filename', () => {
    const analyzer = new WebAudioAnalyzer();
    const result = analyzer.validateBilingualFilename('invalid.wav');
    expect(result.status).toBe('fail');
  });
});
```

#### 1.6 Verify Setup ⬜

```bash
npm run test
npm run test:coverage
```

Expected: Tests pass, coverage report generated.

### Deliverables

- [ ] Vitest installed and configured
- [ ] Coverage reporting working
- [ ] Test file structure created
- [ ] Sample tests passing
- [ ] Documentation updated

### GitHub Issues

- [ ] Issue #TBD: Set up Vitest and testing infrastructure

---

## Phase 2: Core Business Logic Tests

**Status:** ⬜ Not Started
**LLM Development Time:** 2-3 days
**Calendar Time:** 1-2 weeks (with review cycles)
**Owner:** TBD
**Goal:** 60%+ coverage of core business logic

### Priority Areas (Highest ROI)

#### 2.1 Filename Validation Tests ⬜

**Target:** `validateBilingualFilename()`, `validateFilename()` (Three Hour)

Test cases:
- ✅ Valid Bilingual patterns
- ✅ Invalid Bilingual patterns
- ✅ SPONTANEOUS prefix handling
- ✅ Three Hour script matching
- ✅ Speaker ID validation
- ✅ Edge cases (special characters, empty strings, etc.)

**Files:** `tests/unit/filename-validation.test.js`

**Estimated Coverage:** ~150 lines of critical validation logic

#### 2.2 Criteria Validation Tests ⬜

**Target:** `validateCriteria()`, criteria validator logic

Test cases:
- ✅ Sample rate validation (all presets)
- ✅ Bit depth validation
- ✅ Channel validation (mono, stereo, mixed)
- ✅ File type validation
- ✅ Duration validation (SPONTANEOUS files)
- ✅ Metadata-only mode handling
- ✅ Overall status calculation

**Files:** `tests/unit/criteria-validation.test.js`

**Estimated Coverage:** ~200 lines of validation logic

#### 2.3 File Type Detection Tests ⬜

**Target:** `getFileTypeFromName()`

Test cases:
- ✅ All supported extensions (wav, mp3, flac, aac, m4a, ogg)
- ✅ Case insensitivity
- ✅ Unknown file types
- ✅ Missing extensions

**Files:** `tests/unit/file-type.test.js`

**Estimated Coverage:** ~30 lines

#### 2.4 Result Formatting Tests ⬜

**Target:** `formatResults()`, formatting logic

Test cases:
- ✅ Sample rate formatting (Hz, kHz)
- ✅ File size formatting (bytes, KB, MB)
- ✅ Duration formatting (seconds, minutes)
- ✅ Bit depth formatting
- ✅ Unknown value handling

**Files:** `tests/unit/result-formatting.test.js`

**Estimated Coverage:** ~100 lines

#### 2.5 Preset Configuration Tests ⬜

**Target:** `getPresetConfigurations()`, preset logic

Test cases:
- ✅ All preset configurations loaded correctly
- ✅ Filename validation types set correctly
- ✅ Criteria defaults for each preset
- ✅ Custom preset handling

**Files:** `tests/unit/presets.test.js`

**Estimated Coverage:** ~80 lines

#### 2.6 Overall Status Calculation Tests ⬜

**Target:** `getOverallStatus()`

Test cases:
- ✅ Pass when all criteria pass
- ✅ Fail when any criteria fail
- ✅ Warning when criteria have warnings
- ✅ Metadata-only mode ignoring audio fields
- ✅ Filename validation status integration
- ✅ Priority ordering (fail > warning > pass)

**Files:** `tests/unit/overall-status.test.js`

**Estimated Coverage:** ~50 lines

### Test Utilities

Create `tests/helpers/mock-data.js`:
```javascript
export const mockAudioFile = {
  name: 'test-audio.wav',
  size: 1024000,
  type: 'audio/wav'
};

export const mockAnalysisResults = {
  filename: 'test-audio.wav',
  fileSize: 1024000,
  fileType: 'WAV',
  sampleRate: 48000,
  bitDepth: 16,
  channels: 2,
  duration: 120
};

export const mockValidationResults = {
  sampleRate: { status: 'pass' },
  bitDepth: { status: 'pass' },
  channels: { status: 'pass' },
  fileType: { status: 'pass' }
};
```

### Success Criteria

- [ ] 60%+ code coverage achieved
- [ ] All core validation logic tested
- [ ] Edge cases covered
- [ ] Tests are fast (<5 seconds total)
- [ ] Tests are reliable (no flaky tests)

### GitHub Issues

- [ ] Issue #TBD: Add Bilingual filename validation tests
- [ ] Issue #TBD: Add Three Hour filename validation tests
- [ ] Issue #TBD: Add criteria validation tests
- [ ] Issue #TBD: Add result formatting tests
- [ ] Issue #TBD: Add preset configuration tests

---

## Phase 3: Integration Tests

**Status:** ⬜ Not Started
**LLM Development Time:** 1-2 days
**Calendar Time:** 1 week (with review cycles)
**Owner:** TBD

### Goals

- Test complete workflows end-to-end
- Verify component interactions
- Test error handling
- Mock external dependencies (auth, file APIs)

### Integration Test Areas

#### 3.1 File Processing Workflows ⬜

**Target:** `handleFileSelect()`, `handleGoogleDriveFile()`, `handleBoxFile()`

Test cases:
- ✅ Local file upload and analysis
- ✅ Metadata-only mode for local files
- ✅ Full audio analysis mode
- ✅ Error handling (invalid files, decode errors)
- ✅ Progress indicators
- ✅ Result display

**Files:** `tests/integration/file-processing.test.js`

#### 3.2 Batch Processing ⬜

**Target:** `handleBatchFiles()`, `handleGoogleDriveBatch()`, `handleBoxBatch()`

Test cases:
- ✅ Multiple file processing
- ✅ Folder processing
- ✅ Progress tracking
- ✅ Cancellation
- ✅ Error handling (mixed success/failure)
- ✅ Summary statistics
- ✅ Metadata-only batch mode

**Files:** `tests/integration/batch-processing.test.js`

#### 3.3 Auth State Management ⬜

**Target:** Auth status updates, sign in/out flows

Test cases:
- ✅ Google Drive auth status display
- ✅ Box auth status display
- ✅ Sign in flow (mocked)
- ✅ Sign out flow
- ✅ Token expiration handling

**Files:** `tests/integration/auth-management.test.js`

#### 3.4 Display Rendering ⬜

**Target:** `validateAndDisplayResults()`, `showBatchResults()`

Test cases:
- ✅ Single file result display
- ✅ Batch results table
- ✅ Validation status badges
- ✅ Filename validation display
- ✅ Column visibility (metadata-only mode)
- ✅ Audio player display

**Files:** `tests/integration/display-rendering.test.js`

### Mocking Strategy

Create `tests/helpers/test-utils.js`:
```javascript
import { vi } from 'vitest';

export function mockGoogleAuth() {
  return {
    isSignedIn: vi.fn(() => true),
    getFileMetadata: vi.fn(() => Promise.resolve({
      name: 'test.wav',
      size: '1024000'
    })),
    downloadFile: vi.fn(() => Promise.resolve(new Blob()))
  };
}

export function mockBoxAuth() {
  return {
    isAuthenticated: vi.fn(() => true),
    getFileMetadata: vi.fn(() => Promise.resolve({
      name: 'test.wav',
      size: 1024000
    })),
    downloadFile: vi.fn(() => Promise.resolve(new Blob()))
  };
}

export function mockAudioContext() {
  return {
    decodeAudioData: vi.fn(() => Promise.resolve({
      sampleRate: 48000,
      duration: 120,
      numberOfChannels: 2
    }))
  };
}
```

### Success Criteria

- [ ] All major workflows tested
- [ ] External dependencies properly mocked
- [ ] Error paths covered
- [ ] Tests run reliably
- [ ] Coverage above 70% overall

### GitHub Issues

- [ ] Issue #TBD: Add file processing integration tests
- [ ] Issue #TBD: Add batch processing integration tests
- [ ] Issue #TBD: Add auth management tests
- [ ] Issue #TBD: Add display rendering tests

---

## Phase 4: Refactoring with TypeScript

**Status:** ⬜ Not Started
**LLM Development Time:** 3-5 days
**Calendar Time:** 2 weeks (with review cycles)
**Owner:** TBD

### Prerequisites

✅ Comprehensive test suite (Phases 1-3 complete)
✅ 70%+ code coverage
✅ All tests passing

### Goals

- Extract modules and create clean architecture
- **Add TypeScript types to all new modules**
- Eliminate code duplication
- Maintain test coverage throughout

### Refactoring Priorities

#### 4.1 Unify Display Logic ⬜

**Problem:** Duplicate logic in `validateAndDisplayResults()` and `showBatchResults()`

**Solution:** Treat single file as "batch of 1"

**Before:**
- `validateAndDisplayResults()` - single file display
- `showBatchResults()` - batch display
- ~500 lines of duplicated logic

**After:**
```javascript
// Unified display
showResults(results, options = {}) {
  const isSingleFile = results.length === 1;
  const isMetadataOnly = options.metadataOnly;

  // Single display logic
  this.renderResultsTable(results, { isSingleFile, isMetadataOnly });
}
```

**Impact:** Reduce ~200 lines of duplication

**Testing:** Existing tests should all pass

**Files to modify:**
- `src/main.js` (lines 2086-2798)

**GitHub Issue:** #TBD

#### 4.2 Extract File Handlers ⬜

**Problem:** File processing logic mixed into main class

**Solution:** Create dedicated handler classes

**After:**
```javascript
// src/handlers/local-file-handler.js
export class LocalFileHandler {
  async process(file, options) { ... }
}

// src/handlers/google-drive-handler.js
export class GoogleDriveFileHandler {
  constructor(auth) { ... }
  async process(fileId, options) { ... }
}

// src/handlers/box-file-handler.js
export class BoxFileHandler {
  constructor(auth) { ... }
  async process(fileId, options) { ... }
}

// src/handlers/base-handler.js
export class BaseFileHandler {
  validateFilename(filename, config) { ... }
  createMetadataOnlyResult(metadata) { ... }
}
```

**Impact:** Remove ~600 lines from main.js

**Testing:** Integration tests verify handlers work

**Files to create:**
- `src/handlers/base-handler.js`
- `src/handlers/local-file-handler.js`
- `src/handlers/google-drive-handler.js`
- `src/handlers/box-file-handler.js`

**Files to modify:**
- `src/main.js` (lines 900-1900)

**GitHub Issue:** #TBD

#### 4.3 Settings Management Module ⬜

**Problem:** Settings logic duplicated for local/Google Drive/Box

**Solution:** Centralized settings manager

**After:**
```javascript
// src/settings-manager.js
export class SettingsManager {
  constructor() {
    this.settings = this.loadSettings();
  }

  loadSettings() { ... }
  saveSettings() { ... }

  // Filename validation settings
  getFilenameValidationConfig(source) { ... }
  setFilenameValidationEnabled(source, enabled) { ... }
  setAudioAnalysisEnabled(source, enabled) { ... }

  // Criteria settings
  getCriteria() { ... }
  saveCriteria(criteria) { ... }

  // Dark mode
  isDarkMode() { ... }
  setDarkMode(enabled) { ... }
}
```

**Impact:** Remove ~400 lines from main.js

**Testing:** Unit tests for settings manager

**Files to create:**
- `src/settings-manager.js`
- `tests/unit/settings-manager.test.js`

**Files to modify:**
- `src/main.js` (lines 275-760)

**GitHub Issue:** #TBD

#### 4.4 Validation Module ⬜

**Problem:** Validation logic scattered throughout main.js

**Solution:** Dedicated validation module

**After:**
```javascript
// src/validation/filename-validator.js
export class FilenameValidator {
  validateBilingual(filename) { ... }
  validateThreeHour(filename, scripts, speakerId) { ... }
}

// src/validation/criteria-validator.js (already exists in core)
// Move web-specific validation here

// src/validation/validation-display.js
export class ValidationDisplay {
  renderFilenameValidation(result) { ... }
  renderCriteriaValidation(results) { ... }
  getStatusBadge(status) { ... }
}
```

**Impact:** Remove ~400 lines from main.js

**Testing:** Unit tests already exist, move and expand

**Files to create:**
- `src/validation/filename-validator.js`
- `src/validation/validation-display.js`

**Files to modify:**
- `src/main.js` (lines 1222-1650)

**GitHub Issue:** #TBD

#### 4.5 UI Controller Separation ⬜

**Problem:** DOM manipulation mixed with business logic

**Solution:** Separate UI controller

**After:**
```javascript
// src/ui/ui-controller.js
export class UIController {
  constructor() {
    this.initializeElements();
    this.attachEventListeners();
  }

  // DOM element management
  initializeElements() { ... }

  // Event handling
  attachEventListeners() { ... }

  // UI state
  showLoading() { ... }
  showResults() { ... }
  showError(message) { ... }

  // Tab management
  switchTab(tabName) { ... }
}
```

**Impact:** Remove ~200 lines from main.js

**Testing:** Integration tests verify UI works

**Files to create:**
- `src/ui/ui-controller.js`
- `src/ui/loading-controller.js`
- `src/ui/tab-controller.js`

**Files to modify:**
- `src/main.js` (lines 80-275, 2481-2512)

**GitHub Issue:** #TBD

#### 4.6 Add TypeScript Types ⬜

**Problem:** No type safety, LLMs can't infer correct usage

**Solution:** Add TypeScript to all new modules (or JSDoc as interim)

**Approach:**
```typescript
// Option 1: Full TypeScript
// Rename .js files to .ts, add type annotations

// Option 2: JSDoc (easier migration)
/**
 * @typedef {Object} ValidationResult
 * @property {'pass'|'fail'} status
 * @property {string} [issue]
 */

/**
 * @param {string} filename
 * @returns {ValidationResult}
 */
function validateFilename(filename) { ... }
```

**Priority modules for types:**
1. File handlers (high LLM usage)
2. Validation modules (complex logic)
3. Settings manager (state management)
4. Display logic (prevent errors)

**Impact:** Catch bugs during development, improve LLM code generation

**Testing:** TypeScript compiler catches type errors

**GitHub Issue:** #TBD

### Refactoring Strategy

For each refactoring task:

1. **Extract** - Create new module/class
2. **Test** - Write tests for new module
3. **Migrate** - Move code from main.js
4. **Verify** - Run full test suite
5. **Integrate** - Update main.js to use new module
6. **Test Again** - Verify all tests still pass
7. **Commit** - Small, focused commits

### Target Architecture

**After Refactoring:**

```
packages/web/src/
├── main.js                  (~800 lines)  ← 74% reduction
├── handlers/
│   ├── base-handler.js
│   ├── local-file-handler.js
│   ├── google-drive-handler.js
│   └── box-file-handler.js
├── validation/
│   ├── filename-validator.js
│   └── validation-display.js
├── ui/
│   ├── ui-controller.js
│   ├── loading-controller.js
│   └── tab-controller.js
├── settings-manager.js
├── google-auth.js
├── box-auth.js
└── config.js
```

### Success Criteria

- [ ] main.js reduced to <1000 lines
- [ ] Zero code duplication in display logic
- [ ] All business logic separated from UI
- [ ] **TypeScript types added to all new modules**
- [ ] All tests passing
- [ ] No regressions in functionality
- [ ] Code coverage maintained or improved

### GitHub Issues

- [ ] Issue #TBD: Unify single/batch display logic
- [ ] Issue #TBD: Extract file handler classes
- [ ] Issue #TBD: Create settings management module
- [ ] Issue #TBD: Extract validation module
- [ ] Issue #TBD: Separate UI controller
- [ ] Issue #TBD: Add TypeScript types to all modules

---

## Phase 5: Svelte Migration

**Status:** ⬜ Not Started
**LLM Development Time:** 3-5 days
**Calendar Time:** 2 weeks (with review cycles)
**Owner:** TBD

### Prerequisites

✅ Phase 4 complete (clean, typed, tested modules)
✅ All tests passing
✅ 75%+ code coverage

### Why Svelte?

**For LLM-assisted development:**
- Component boundaries make it easy for LLMs to work in isolation
- Svelte has extensive training data
- Simpler than React/Vue (less boilerplate)
- Compiles to vanilla JS (minimal bundle overhead)
- Reactive by default (less manual state management)

**Bundle impact:** +10KB gzipped (vs +170KB for React)

### Migration Strategy

#### 5.1 Set Up Svelte ⬜

```bash
npm install --save-dev svelte @sveltejs/vite-plugin-svelte
```

Update `vite.config.js`:
```javascript
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  // ... rest of config
});
```

#### 5.2 Convert One Tab at a Time ⬜

**Order:** Local Files → Google Drive → Box → Settings

**For each tab:**
1. Create Svelte component
2. Port logic from main.js
3. Update tests to work with components
4. Verify functionality in beta
5. Merge when tests pass

**Example:**
```svelte
<!-- src/components/LocalFileTab.svelte -->
<script>
  import { LocalFileHandler } from '../handlers/local-file-handler';
  import ResultsTable from './ResultsTable.svelte';

  let file = null;
  let results = null;

  async function handleFile(event) {
    file = event.target.files[0];
    results = await handler.process(file);
  }
</script>

<div class="tab-content">
  <FileUpload on:file={handleFile} />
  {#if results}
    <ResultsTable {results} />
  {/if}
</div>
```

#### 5.3 Shared Components ⬜

**Create reusable components:**
- `ResultsTable.svelte` (unified single/batch display)
- `FileUpload.svelte`
- `StatusBadge.svelte`
- `ValidationDisplay.svelte`

**Benefits:**
- Eliminates remaining duplication
- LLMs can work on components independently
- Easier to test in isolation

#### 5.4 Update Tests ⬜

**Use Svelte Testing Library:**
```javascript
import { render, fireEvent } from '@testing-library/svelte';
import LocalFileTab from '../components/LocalFileTab.svelte';

test('handles file upload', async () => {
  const { getByLabelText } = render(LocalFileTab);
  const input = getByLabelText('Upload file');

  await fireEvent.change(input, { target: { files: [mockFile] } });

  // Assertions...
});
```

### Target Architecture

**After Svelte Migration:**
```
packages/web/src/
├── main.js                  (~200 lines)  ← Just app initialization
├── components/              ← NEW
│   ├── App.svelte
│   ├── LocalFileTab.svelte
│   ├── GoogleDriveTab.svelte
│   ├── BoxTab.svelte
│   ├── SettingsTab.svelte
│   ├── ResultsTable.svelte  ← Unified display!
│   ├── FileUpload.svelte
│   └── ValidationDisplay.svelte
├── handlers/
│   ├── local-file-handler.ts
│   ├── google-drive-handler.ts
│   └── box-file-handler.ts
├── validation/
│   ├── filename-validator.ts
│   └── validation-display.ts
├── settings-manager.ts
├── google-auth.js
└── box-auth.js
```

### Success Criteria

- [ ] All tabs converted to Svelte components
- [ ] Shared ResultsTable component eliminates duplication
- [ ] main.js reduced to ~200 lines (app initialization only)
- [ ] All tests updated and passing
- [ ] Bundle size increase <15KB gzipped
- [ ] No regressions in functionality
- [ ] Better component boundaries for future LLM development

### GitHub Issues

- [ ] Issue #TBD: Set up Svelte and vite plugin
- [ ] Issue #TBD: Convert Local File tab to Svelte
- [ ] Issue #TBD: Convert Google Drive tab to Svelte
- [ ] Issue #TBD: Convert Box tab to Svelte
- [ ] Issue #TBD: Create shared ResultsTable component
- [ ] Issue #TBD: Update all tests for Svelte components

---

## Detailed Refactoring Plan

### Code Sections to Refactor

#### main.js Section Breakdown

| Lines | Section | Target | Priority |
|-------|---------|--------|----------|
| 80-170 | `initializeElements()` | Extract to UIController | Medium |
| 171-274 | `attachEventListeners()` | Extract to UIController | Medium |
| 275-337 | Settings: load/save | Extract to SettingsManager | High |
| 338-408 | Auth status management | Extract to AuthManager | Medium |
| 409-521 | Criteria management | Extract to CriteriaManager | High |
| 522-753 | Preset & validation settings | Extract to SettingsManager | High |
| 900-1000 | `handleFileSelect()` | Extract to LocalFileHandler | High |
| 1085-1220 | `handleGoogleDriveUrl()` | Extract to GoogleDriveHandler | High |
| 1222-1270 | `validateFilename()` | Extract to FilenameValidator | High |
| 1729-1900 | `handleBoxUrl()` | Extract to BoxHandler | High |
| 2086-2210 | `validateAndDisplayResults()` | Refactor to unified display | **Critical** |
| 2798-3000 | `showBatchResults()` | Refactor to unified display | **Critical** |

---

## Success Metrics

### Test Coverage Targets

- **Phase 1 Complete:** Testing infrastructure functional
- **Phase 2 Complete:** ≥60% code coverage (core logic)
- **Phase 3 Complete:** ≥70% code coverage (integration)
- **Phase 4 Complete:** ≥75% code coverage (refactored + typed code)
- **Phase 5 Complete:** ≥75% coverage maintained (component-based)

### Code Quality Metrics

- **main.js Line Count:** ~200 lines (from 3,159) - 94% reduction
- **Code Duplication:** 0% in display logic
- **Type Coverage:** 100% of new modules have TypeScript/JSDoc types
- **Component Architecture:** Clear separation of concerns
- **Test Suite Speed:** <30 seconds full run
- **Test Reliability:** 0 flaky tests

### Functional Metrics

- **Zero Regressions:** All existing functionality works
- **All Tests Passing:** 100% pass rate
- **CI/CD:** Automated testing on all PRs
- **Documentation:** All new modules and components documented
- **LLM-Ready:** Clear boundaries for LLM-assisted development

---

## GitHub Issues

This section tracks GitHub issues created for this project.

### Phase 1: Test Infrastructure
- [ ] #TBD: Set up Vitest and testing infrastructure

### Phase 2: Core Tests
- [ ] #TBD: Add Bilingual filename validation tests
- [ ] #TBD: Add Three Hour filename validation tests
- [ ] #TBD: Add criteria validation tests
- [ ] #TBD: Add result formatting tests
- [ ] #TBD: Add preset configuration tests

### Phase 3: Integration Tests
- [ ] #TBD: Add file processing integration tests
- [ ] #TBD: Add batch processing integration tests
- [ ] #TBD: Add auth management tests
- [ ] #TBD: Add display rendering tests

### Phase 4: Refactoring with TypeScript
- [ ] #TBD: Unify single/batch display logic
- [ ] #TBD: Extract file handler classes
- [ ] #TBD: Create settings management module
- [ ] #TBD: Extract validation module
- [ ] #TBD: Separate UI controller
- [ ] #TBD: Add TypeScript types to all modules

### Phase 5: Svelte Migration
- [ ] #TBD: Set up Svelte and vite plugin
- [ ] #TBD: Convert Local File tab to Svelte
- [ ] #TBD: Convert Google Drive tab to Svelte
- [ ] #TBD: Convert Box tab to Svelte
- [ ] #TBD: Create shared ResultsTable component
- [ ] #TBD: Update all tests for Svelte components

---

## Progress Tracking

### Master Checklist

#### Phase 1: Test Infrastructure (2-3 hours LLM time / 1 day calendar)
- [ ] Install Vitest + dependencies
- [ ] Configure vitest.config.js
- [ ] Update package.json scripts
- [ ] Create test file structure
- [ ] Write sample tests
- [ ] Verify setup works
- [ ] **Phase 1 Complete** ✅

#### Phase 2: Core Business Logic Tests (2-3 days LLM / 1-2 weeks calendar)
- [ ] Filename validation tests (Bilingual)
- [ ] Filename validation tests (Three Hour)
- [ ] Criteria validation tests
- [ ] File type detection tests
- [ ] Result formatting tests
- [ ] Preset configuration tests
- [ ] Overall status calculation tests
- [ ] **Phase 2 Complete** ✅ (60%+ coverage)

#### Phase 3: Integration Tests (1-2 days LLM / 1 week calendar)
- [ ] File processing workflow tests
- [ ] Batch processing tests
- [ ] Auth state management tests
- [ ] Display rendering tests
- [ ] Mock utilities created
- [ ] **Phase 3 Complete** ✅ (70%+ coverage)

#### Phase 4: Refactoring with TypeScript (3-5 days LLM / 2 weeks calendar)
- [ ] Unify display logic
- [ ] Extract file handlers
- [ ] Create settings manager
- [ ] Extract validation module
- [ ] Separate UI controller
- [ ] Add TypeScript/JSDoc types to all modules
- [ ] Update tests for new structure
- [ ] Verify no regressions
- [ ] **Phase 4 Complete** ✅ (main.js <1000 lines + typed)

#### Phase 5: Svelte Migration (3-5 days LLM / 2 weeks calendar)
- [ ] Set up Svelte + vite plugin
- [ ] Convert Local File tab
- [ ] Convert Google Drive tab
- [ ] Convert Box tab
- [ ] Convert Settings tab
- [ ] Create shared ResultsTable component
- [ ] Update all tests for components
- [ ] Verify bundle size impact
- [ ] Verify no regressions
- [ ] **Phase 5 Complete** ✅ (main.js ~200 lines + components)

### Completion Dates

- **Phase 1 Started:** _____
- **Phase 1 Completed:** _____
- **Phase 2 Started:** _____
- **Phase 2 Completed:** _____
- **Phase 3 Started:** _____
- **Phase 3 Completed:** _____
- **Phase 4 Started:** _____
- **Phase 4 Completed:** _____
- **Phase 5 Started:** _____
- **Phase 5 Completed:** _____

### Total Timeline

**LLM Development Time:** ~2 weeks of actual work
**Calendar Time:** 4-8 weeks (depending on review cycles)
**Bottleneck:** Human review, testing, and decision-making

---

## Notes & Decisions

### Key Decisions

**Decision 1:** Testing framework choice - Vitest
**Rationale:** Native Vite integration, fast, modern API, great DX
**Date:** October 9, 2025

**Decision 2:** Testing before refactoring
**Rationale:** Safety net prevents regressions, documents behavior
**Date:** October 9, 2025

**Decision 3:** LLM-first development approach
**Rationale:** Project will be primarily developed by LLMs with human review
**Date:** October 9, 2025

**Decision 4:** Add TypeScript during refactoring (Phase 4)
**Rationale:** Types help LLMs generate correct code, catch errors early
**Date:** October 9, 2025

**Decision 5:** Migrate to Svelte (Phase 5)
**Rationale:** Component boundaries help LLM development, minimal bundle impact
**Date:** October 9, 2025

### Lessons Learned

_(To be filled in as work progresses)_

### Blockers & Risks

_(To be tracked as issues arise)_

---

## References

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Refactoring Patterns](https://refactoring.guru/refactoring/catalog)
- Main repo: https://github.com/vibingwithtom/audio-analyzer
- Production: https://audio-analyzer.tinytech.site
- Beta: https://audio-analyzer.tinytech.site/beta

---

**Last Updated:** October 9, 2025
**Document Owner:** @vibingwithtom
