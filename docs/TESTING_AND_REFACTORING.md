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
4. [Git & Branching Strategy](#git--branching-strategy)
5. [Phase 1: Test Infrastructure Setup](#phase-1-test-infrastructure-setup)
6. [Phase 2: Core Business Logic Tests](#phase-2-core-business-logic-tests)
7. [Phase 3: Integration Tests](#phase-3-integration-tests)
8. [Phase 4: Refactoring with TypeScript](#phase-4-refactoring-with-typescript)
9. [Phase 5: Svelte Migration](#phase-5-svelte-migration)
10. [Detailed Refactoring Plan](#detailed-refactoring-plan)
11. [Success Metrics](#success-metrics)
12. [GitHub Issues](#github-issues)
13. [Progress Tracking](#progress-tracking)

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

## Git & Branching Strategy

### Overview

This project follows a **phase-based branching strategy** with frequent deployments to beta for testing. Each phase gets its own feature branch, with optional sub-branches for complex tasks.

### Branch Structure

```
main (production-ready, always stable)
├── feature/phase-1-test-infrastructure
├── feature/phase-2-3-comprehensive-tests
├── feature/phase-4-typescript-refactor
│   ├── feature/phase-4-typescript-setup
│   ├── feature/phase-4-file-handlers
│   ├── feature/phase-4-settings-manager
│   └── feature/phase-4-validation-module
└── feature/phase-5-svelte-migration
```

### Workflow by Phase

#### Phase 1: Test Infrastructure
```bash
git checkout -b feature/phase-1-test-infrastructure
# Complete all Phase 1 tasks (Vitest setup, config, sample tests)
# Run tests locally
# Merge to main (low risk - just adds tooling, no app changes)
```

**Merge Criteria:**
- ✅ Vitest installed and configured
- ✅ Sample tests passing
- ✅ Coverage reporting works
- ✅ No changes to application code

**Risk Level:** Low (tooling only)

#### Phases 2-3: Test Writing
```bash
git checkout -b feature/phase-2-3-comprehensive-tests
# Write all unit tests (Phase 2)
# Write all integration tests (Phase 3)
# Deploy to beta frequently to verify tests work
# Merge to main when 70%+ coverage achieved
```

**Merge Criteria:**
- ✅ 70%+ code coverage
- ✅ All tests passing
- ✅ No changes to application code (tests only)

**Risk Level:** Low (tests only, no refactoring yet)

**Rationale:** Combining Phases 2-3 since both are "writing tests" with no refactoring.

#### Phase 4: TypeScript Refactoring

**Option A: Single Branch (Recommended for small team)**
```bash
git checkout -b feature/phase-4-typescript-refactor
# Complete all Phase 4 tasks incrementally
# Commit after each major extraction (TypeScript setup, handlers, settings, etc.)
# Deploy to beta after each significant change
# Merge to main after all extractions complete and beta verified
```

**Option B: Sub-Branches (For larger changes or parallel work)**
```bash
# 4.1 TypeScript Setup
git checkout -b feature/phase-4-typescript-setup
# Set up TypeScript infrastructure
# Merge to main (enables creating .ts files)

# 4.2-4.6 Major Extractions
git checkout -b feature/phase-4-file-handlers
git checkout -b feature/phase-4-settings-manager
# etc. - one branch per major extraction
# Merge each to main after beta verification
```

**Merge Criteria (per extraction or final):**
- ✅ All tests passing
- ✅ TypeScript type checking passing
- ✅ Beta deployment tested and verified
- ✅ No regressions in functionality
- ✅ Code coverage maintained or improved

**Risk Level:** Medium-High (refactoring existing code)

**Beta Testing Required:** Yes - deploy after each major change

#### Phase 5: Svelte Migration
```bash
git checkout -b feature/phase-5-svelte-migration
# Convert one tab at a time
# Commit after each tab conversion
# Deploy to beta after each tab
# Merge to main after all tabs converted and verified
```

**Workflow per Tab:**
1. Write component tests (test-first)
2. Convert tab to Svelte
3. Run tests
4. Deploy to beta
5. Verify in beta
6. Commit
7. Repeat for next tab

**Merge Criteria:**
- ✅ All tabs converted
- ✅ All component tests passing (90%+ coverage per component)
- ✅ Bundle size increase <15KB
- ✅ Beta testing complete
- ✅ No regressions

**Risk Level:** High (major architectural change)

**Beta Testing Required:** Yes - after each tab and final

### Key Principles

#### 1. Always Deploy to Beta Before Merging to Main
- **Critical for Phases 4 and 5** where refactoring/migration happens
- Verify functionality manually in beta environment
- Catch issues before production

#### 2. Keep Main Stable
- Main branch should always be production-ready
- Only merge after beta verification passes
- If main breaks, fix immediately

#### 3. Small, Frequent Commits
- Commit after completing each logical unit of work
- Use descriptive commit messages (conventional commits format)
- Makes it easier to identify and revert issues

#### 4. Commit Message Format
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` New features
- `fix:` Bug fixes
- `refactor:` Code restructuring without functional changes
- `test:` Adding or updating tests
- `docs:` Documentation updates
- `chore:` Maintenance tasks (dependencies, config)

**Examples:**
```
feat: add Vitest testing infrastructure

test: add filename validation tests for Bilingual preset

refactor: extract file handlers to TypeScript modules
- Created BaseFileHandler abstract class
- Implemented LocalFileHandler, GoogleDriveHandler, BoxFileHandler
- Moved ~600 lines from main.js

fix: resolve TypeScript type errors in settings manager
```

#### 5. One Phase Branch = One PR (or Multiple Small PRs)
- For review purposes, each phase can be one PR
- Or split into multiple PRs if phase is large (e.g., Phase 4 sub-branches)
- Easier to review smaller, focused changes

### Deployment Workflow

**Every deployment follows this pattern:**

```bash
# 1. Make changes on feature branch
git add .
git commit -m "feat: add TypeScript file handlers"

# 2. Deploy to beta
cd packages/web
npm run deploy:beta

# 3. Test in beta
# Visit https://audio-analyzer.tinytech.site/beta/
# Verify changes work correctly

# 4. If beta passes, merge to main
git checkout main
git merge feature/phase-4-file-handlers

# 5. Deploy to production
cd packages/web
npm run deploy

# 6. Verify production
# Visit https://audio-analyzer.tinytech.site
```

### Emergency Rollback

If production breaks:

```bash
# Option 1: Revert the merge commit
git revert -m 1 <merge-commit-hash>
git push origin main

# Option 2: Fix forward (if issue is minor)
git checkout -b hotfix/fix-production-issue
# Make fix
git commit -m "fix: resolve production issue"
git push origin hotfix/fix-production-issue
# Deploy to beta, test, then merge to main
```

### Branch Lifecycle

**Creating a branch:**
```bash
git checkout main
git pull origin main
git checkout -b feature/phase-X-description
```

**Keeping branch up to date:**
```bash
# If main has changed while you're working
git checkout main
git pull origin main
git checkout feature/phase-X-description
git merge main
# Resolve any conflicts
```

**Cleaning up after merge:**
```bash
# Delete local branch
git branch -d feature/phase-X-description

# Delete remote branch (if pushed)
git push origin --delete feature/phase-X-description
```

### Decision Rationale

**Why phase-based branches?**
- ✅ Clear scope per branch
- ✅ Easier to track progress
- ✅ Manageable PR sizes
- ✅ Can pause/resume phases independently

**Why not one giant refactor branch?**
- ❌ Massive changeset hard to review
- ❌ High risk of merge conflicts
- ❌ Difficult to isolate issues
- ❌ Can't deploy incrementally

**Why not task-based branches (30+ branches)?**
- ❌ Too much overhead
- ❌ Merge conflicts between tasks
- ❌ Harder to see big picture

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

- **Set up TypeScript infrastructure first**
- **Create all new modules as .ts files from the outset**
- Extract modules and create clean architecture with type safety
- Eliminate code duplication
- Maintain test coverage throughout

### Strategy

**TypeScript-First Approach:**
All newly created files during refactoring will be TypeScript (.ts) from the start. This approach:
- Provides immediate type safety during extraction
- Catches errors during refactoring, not after
- Eliminates the need for a separate JS → TS conversion step
- Produces cleaner git history (one commit per module instead of create + convert)

**Legacy Code:**
Existing files (main.js, google-auth.js, box-auth.js) remain as .js until refactored. Mixed .ts/.js is supported by modern build tools.

### Refactoring Priorities

#### 4.1 TypeScript Setup ⬜

**Goal:** Configure TypeScript infrastructure before creating new modules

**Tasks:**

1. Install TypeScript dependencies:
```bash
npm install --save-dev typescript @types/node
```

2. Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "node",
    "allowJs": true,
    "checkJs": false,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

3. Update `vite.config.js` to handle TypeScript:
```javascript
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@audio-analyzer/core': path.resolve(__dirname, '../core')
    }
  },
  build: {
    // Vite handles TypeScript automatically
    target: 'es2020'
  }
});
```

4. Add TypeScript build script to `package.json`:
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "vite build"
  }
}
```

**Testing:** Run `npm run typecheck` to verify TypeScript is working

**Impact:** Enables creating .ts files in subsequent refactoring steps

**GitHub Issue:** #TBD

#### 4.2 Unify Display Logic ⬜

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

#### 4.3 Extract File Handlers ⬜

**Problem:** File processing logic mixed into main class

**Solution:** Create dedicated handler classes as TypeScript modules

**After:**
```typescript
// src/handlers/types.ts
export interface FileProcessOptions {
  metadataOnly: boolean;
  validateFilename: boolean;
  filenameValidationConfig?: FilenameValidationConfig;
}

export interface ProcessResult {
  filename: string;
  fileSize: number;
  fileType: string;
  status: 'pass' | 'fail' | 'warning' | 'error';
  // ... other fields
}

// src/handlers/base-handler.ts
export abstract class BaseFileHandler {
  protected validateFilename(filename: string, config: FilenameValidationConfig): ValidationResult {
    // Implementation
  }

  protected createMetadataOnlyResult(metadata: FileMetadata): ProcessResult {
    // Implementation
  }

  abstract process(source: unknown, options: FileProcessOptions): Promise<ProcessResult>;
}

// src/handlers/local-file-handler.ts
export class LocalFileHandler extends BaseFileHandler {
  async process(file: File, options: FileProcessOptions): Promise<ProcessResult> {
    // Implementation
  }
}

// src/handlers/google-drive-handler.ts
export class GoogleDriveFileHandler extends BaseFileHandler {
  constructor(private auth: GoogleAuthService) {
    super();
  }

  async process(fileId: string, options: FileProcessOptions): Promise<ProcessResult> {
    // Implementation
  }
}

// src/handlers/box-file-handler.ts
export class BoxFileHandler extends BaseFileHandler {
  constructor(private auth: BoxAuthService) {
    super();
  }

  async process(fileId: string, options: FileProcessOptions): Promise<ProcessResult> {
    // Implementation
  }
}
```

**Impact:** Remove ~600 lines from main.js with full type safety

**Testing:**
- Integration tests verify handlers work
- TypeScript compiler validates types
- Add unit tests for each handler

**Files to create:**
- `src/handlers/types.ts`
- `src/handlers/base-handler.ts`
- `src/handlers/local-file-handler.ts`
- `src/handlers/google-drive-handler.ts`
- `src/handlers/box-file-handler.ts`
- `tests/unit/handlers/local-file-handler.test.ts`
- `tests/unit/handlers/google-drive-handler.test.ts`
- `tests/unit/handlers/box-file-handler.test.ts`

**Files to modify:**
- `src/main.js` (lines 900-1900)

**GitHub Issue:** #TBD

#### 4.4 Settings Management Module ⬜

**Problem:** Settings logic duplicated for local/Google Drive/Box

**Solution:** Centralized settings manager as TypeScript module

**After:**
```typescript
// src/settings/types.ts
export interface AppSettings {
  darkMode: boolean;
  criteria: CriteriaSettings;
  filenameValidation: {
    local: FilenameValidationConfig;
    googleDrive: FilenameValidationConfig;
    box: FilenameValidationConfig;
  };
  audioAnalysis: {
    local: boolean;
    googleDrive: boolean;
    box: boolean;
  };
}

export interface CriteriaSettings {
  preset: string;
  sampleRate?: number;
  bitDepth?: number;
  channels?: number;
  fileTypes?: string[];
  minDuration?: number;
}

// src/settings/settings-manager.ts
export class SettingsManager {
  private settings: AppSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): AppSettings {
    // Implementation with defaults
  }

  saveSettings(): void {
    localStorage.setItem('audioAnalyzerSettings', JSON.stringify(this.settings));
  }

  // Filename validation settings
  getFilenameValidationConfig(source: 'local' | 'googleDrive' | 'box'): FilenameValidationConfig {
    return this.settings.filenameValidation[source];
  }

  setFilenameValidationEnabled(source: 'local' | 'googleDrive' | 'box', enabled: boolean): void {
    this.settings.filenameValidation[source].enabled = enabled;
    this.saveSettings();
  }

  setAudioAnalysisEnabled(source: 'local' | 'googleDrive' | 'box', enabled: boolean): void {
    this.settings.audioAnalysis[source] = enabled;
    this.saveSettings();
  }

  // Criteria settings
  getCriteria(): CriteriaSettings {
    return this.settings.criteria;
  }

  saveCriteria(criteria: CriteriaSettings): void {
    this.settings.criteria = criteria;
    this.saveSettings();
  }

  // Dark mode
  isDarkMode(): boolean {
    return this.settings.darkMode;
  }

  setDarkMode(enabled: boolean): void {
    this.settings.darkMode = enabled;
    this.saveSettings();
  }
}
```

**Impact:** Remove ~400 lines from main.js with type-safe settings

**Testing:**
- Unit tests for settings manager
- Test localStorage persistence
- Test default values

**Files to create:**
- `src/settings/types.ts`
- `src/settings/settings-manager.ts`
- `tests/unit/settings/settings-manager.test.ts`

**Files to modify:**
- `src/main.js` (lines 275-760)

**GitHub Issue:** #TBD

#### 4.5 Validation Module ⬜

**Problem:** Validation logic scattered throughout main.js

**Solution:** Dedicated validation module with TypeScript

**After:**
```typescript
// src/validation/types.ts
export interface ValidationResult {
  status: 'pass' | 'fail' | 'warning';
  issue?: string;
  details?: Record<string, unknown>;
}

export interface BilingualValidationResult extends ValidationResult {
  conversationId?: string;
  languageCode?: string;
  userId?: string;
  agentId?: string;
}

// src/validation/filename-validator.ts
export class FilenameValidator {
  validateBilingual(filename: string): BilingualValidationResult {
    // Implementation with type safety
  }

  validateThreeHour(
    filename: string,
    scripts: Map<string, string>,
    speakerId: string
  ): ValidationResult {
    // Implementation
  }

  private extractBilingualParts(filename: string): {
    conversationId: string;
    languageCode: string;
    userId: string;
    agentId: string;
  } | null {
    // Helper method
  }
}

// src/validation/validation-display.ts
export class ValidationDisplay {
  renderFilenameValidation(result: ValidationResult): HTMLElement {
    // Implementation
  }

  renderCriteriaValidation(results: Record<string, ValidationResult>): HTMLElement {
    // Implementation
  }

  getStatusBadge(status: 'pass' | 'fail' | 'warning'): string {
    const badges = {
      pass: '<span class="badge badge-success">✓ Pass</span>',
      fail: '<span class="badge badge-danger">✗ Fail</span>',
      warning: '<span class="badge badge-warning">⚠ Warning</span>'
    };
    return badges[status];
  }
}
```

**Impact:** Remove ~400 lines from main.js with type-safe validation

**Testing:**
- Unit tests already exist for validation logic
- Add new tests for ValidationDisplay rendering
- Type checking validates interfaces

**Files to create:**
- `src/validation/types.ts`
- `src/validation/filename-validator.ts`
- `src/validation/validation-display.ts`
- `tests/unit/validation/validation-display.test.ts`

**Files to modify:**
- `src/main.js` (lines 1222-1650)

**GitHub Issue:** #TBD

#### 4.6 UI Controller Separation ⬜

**Problem:** DOM manipulation mixed with business logic

**Solution:** Separate UI controller with TypeScript

**After:**
```typescript
// src/ui/types.ts
export interface UIElements {
  fileInput: HTMLInputElement;
  analyzeBtn: HTMLButtonElement;
  resultsContainer: HTMLDivElement;
  loadingIndicator: HTMLDivElement;
  errorDisplay: HTMLDivElement;
  // ... other elements
}

export type TabName = 'local' | 'googleDrive' | 'box' | 'settings';

// src/ui/ui-controller.ts
export class UIController {
  private elements: UIElements;
  private currentTab: TabName = 'local';

  constructor() {
    this.initializeElements();
    this.attachEventListeners();
  }

  private initializeElements(): void {
    this.elements = {
      fileInput: document.getElementById('file-input') as HTMLInputElement,
      analyzeBtn: document.getElementById('analyze-btn') as HTMLButtonElement,
      resultsContainer: document.getElementById('results') as HTMLDivElement,
      loadingIndicator: document.getElementById('loading') as HTMLDivElement,
      errorDisplay: document.getElementById('error') as HTMLDivElement,
      // ... other elements
    };
  }

  private attachEventListeners(): void {
    // Event listener setup with type safety
  }

  showLoading(message: string = 'Processing...'): void {
    this.elements.loadingIndicator.textContent = message;
    this.elements.loadingIndicator.style.display = 'block';
  }

  hideLoading(): void {
    this.elements.loadingIndicator.style.display = 'none';
  }

  showResults(html: string): void {
    this.elements.resultsContainer.innerHTML = html;
    this.elements.resultsContainer.style.display = 'block';
  }

  showError(message: string): void {
    this.elements.errorDisplay.textContent = message;
    this.elements.errorDisplay.style.display = 'block';
  }

  switchTab(tabName: TabName): void {
    this.currentTab = tabName;
    // Tab switching logic
  }
}

// src/ui/tab-controller.ts
export class TabController {
  private activeTab: TabName;

  constructor(initialTab: TabName = 'local') {
    this.activeTab = initialTab;
  }

  switchTo(tab: TabName): void {
    // Implementation
  }

  getActiveTab(): TabName {
    return this.activeTab;
  }
}
```

**Impact:** Remove ~200 lines from main.js with type-safe UI

**Testing:**
- Integration tests verify UI works
- Mock DOM elements in unit tests
- Test event handling

**Files to create:**
- `src/ui/types.ts`
- `src/ui/ui-controller.ts`
- `src/ui/tab-controller.ts`
- `tests/unit/ui/ui-controller.test.ts`
- `tests/unit/ui/tab-controller.test.ts`

**Files to modify:**
- `src/main.js` (lines 80-275, 2481-2512)

**GitHub Issue:** #TBD

#### 4.7 UI Component Testing ⬜

**Problem:** Display logic and UI controllers need granular testing beyond integration tests

**Solution:** Add component-level tests for all UI modules

**Why This Matters:**
- Integration tests verify end-to-end workflows but can miss rendering bugs
- Component tests isolate UI logic for faster, more focused testing
- Tests document how components should be used
- Helps catch styling, event handling, and state management issues early

**Test Coverage Areas:**

**ValidationDisplay Tests:**
```typescript
// tests/unit/validation/validation-display.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationDisplay } from '../../../src/validation/validation-display';

describe('ValidationDisplay', () => {
  let display: ValidationDisplay;

  beforeEach(() => {
    display = new ValidationDisplay();
  });

  describe('getStatusBadge', () => {
    it('should render pass badge correctly', () => {
      const badge = display.getStatusBadge('pass');
      expect(badge).toContain('badge-success');
      expect(badge).toContain('✓ Pass');
    });

    it('should render fail badge correctly', () => {
      const badge = display.getStatusBadge('fail');
      expect(badge).toContain('badge-danger');
      expect(badge).toContain('✗ Fail');
    });

    it('should render warning badge correctly', () => {
      const badge = display.getStatusBadge('warning');
      expect(badge).toContain('badge-warning');
      expect(badge).toContain('⚠ Warning');
    });
  });

  describe('renderFilenameValidation', () => {
    it('should render passing validation', () => {
      const result = { status: 'pass' as const };
      const element = display.renderFilenameValidation(result);
      expect(element.innerHTML).toContain('badge-success');
    });

    it('should render failing validation with issue message', () => {
      const result = {
        status: 'fail' as const,
        issue: 'Invalid format'
      };
      const element = display.renderFilenameValidation(result);
      expect(element.innerHTML).toContain('badge-danger');
      expect(element.innerHTML).toContain('Invalid format');
    });
  });

  describe('renderCriteriaValidation', () => {
    it('should render all criteria results', () => {
      const results = {
        sampleRate: { status: 'pass' as const },
        bitDepth: { status: 'fail' as const, issue: 'Expected 16-bit' },
        channels: { status: 'warning' as const, issue: 'Mono detected' }
      };
      const element = display.renderCriteriaValidation(results);
      expect(element.innerHTML).toContain('badge-success');
      expect(element.innerHTML).toContain('badge-danger');
      expect(element.innerHTML).toContain('badge-warning');
    });
  });
});
```

**UIController Tests:**
```typescript
// tests/unit/ui/ui-controller.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UIController } from '../../../src/ui/ui-controller';

describe('UIController', () => {
  let controller: UIController;

  beforeEach(() => {
    // Mock DOM elements
    document.body.innerHTML = `
      <input id="file-input" type="file" />
      <button id="analyze-btn">Analyze</button>
      <div id="results"></div>
      <div id="loading" style="display: none;"></div>
      <div id="error" style="display: none;"></div>
    `;
    controller = new UIController();
  });

  describe('showLoading', () => {
    it('should display loading indicator with default message', () => {
      controller.showLoading();
      const loading = document.getElementById('loading') as HTMLDivElement;
      expect(loading.style.display).toBe('block');
      expect(loading.textContent).toBe('Processing...');
    });

    it('should display loading indicator with custom message', () => {
      controller.showLoading('Analyzing audio...');
      const loading = document.getElementById('loading') as HTMLDivElement;
      expect(loading.textContent).toBe('Analyzing audio...');
    });
  });

  describe('hideLoading', () => {
    it('should hide loading indicator', () => {
      controller.showLoading();
      controller.hideLoading();
      const loading = document.getElementById('loading') as HTMLDivElement;
      expect(loading.style.display).toBe('none');
    });
  });

  describe('showError', () => {
    it('should display error message', () => {
      controller.showError('File not found');
      const error = document.getElementById('error') as HTMLDivElement;
      expect(error.style.display).toBe('block');
      expect(error.textContent).toBe('File not found');
    });
  });

  describe('showResults', () => {
    it('should display results HTML', () => {
      const html = '<table><tr><td>Test</td></tr></table>';
      controller.showResults(html);
      const results = document.getElementById('results') as HTMLDivElement;
      expect(results.style.display).toBe('block');
      expect(results.innerHTML).toBe(html);
    });
  });
});
```

**Impact:**
- Granular testing of all UI rendering logic
- Fast test execution (no heavy integration setup)
- Documents UI component behavior
- Catches rendering bugs before integration testing

**Files to create:**
- `tests/unit/validation/validation-display.test.ts`
- `tests/unit/ui/ui-controller.test.ts`
- `tests/unit/ui/tab-controller.test.ts`

**Success Criteria:**
- All UI components have dedicated unit tests
- Test coverage for all rendering methods
- Test coverage for all UI state changes
- Tests run in <2 seconds

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
├── main.js                  (~800 lines)  ← 74% reduction, legacy JS
├── handlers/
│   ├── types.ts             ← NEW: TypeScript types
│   ├── base-handler.ts      ← NEW: TypeScript
│   ├── local-file-handler.ts
│   ├── google-drive-handler.ts
│   └── box-file-handler.ts
├── validation/
│   ├── types.ts             ← NEW: TypeScript types
│   ├── filename-validator.ts
│   └── validation-display.ts
├── ui/
│   ├── types.ts             ← NEW: TypeScript types
│   ├── ui-controller.ts
│   └── tab-controller.ts
├── settings/
│   ├── types.ts             ← NEW: TypeScript types
│   └── settings-manager.ts
├── google-auth.js           ← Legacy JS (refactor later)
├── box-auth.js              ← Legacy JS (refactor later)
└── config.js                ← Legacy JS (data file)
```

**Key Changes:**
- All new modules created as TypeScript (.ts)
- Type definitions in dedicated `types.ts` files
- Legacy files (main.js, auth files) remain JS until refactored
- Mixed .ts/.js supported by Vite build system

### Success Criteria

- [ ] TypeScript infrastructure set up and working
- [ ] main.js reduced to <1000 lines
- [ ] Zero code duplication in display logic
- [ ] All business logic separated from UI
- [ ] **All new modules created as TypeScript (.ts) from the start**
- [ ] Type definitions in dedicated types.ts files
- [ ] UI components have granular unit tests
- [ ] All tests passing (including TypeScript type checking)
- [ ] No regressions in functionality
- [ ] Code coverage maintained or improved (75%+)

### GitHub Issues

- [ ] Issue #TBD: Set up TypeScript infrastructure
- [ ] Issue #TBD: Unify single/batch display logic
- [ ] Issue #TBD: Extract file handler classes with TypeScript
- [ ] Issue #TBD: Create settings management module with TypeScript
- [ ] Issue #TBD: Extract validation module with TypeScript
- [ ] Issue #TBD: Separate UI controller with TypeScript
- [ ] Issue #TBD: Add UI component testing

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

#### 5.4 Component Testing with Svelte Testing Library ⬜

**Priority:** Test components BEFORE converting each tab

**Install Dependencies:**
```bash
npm install --save-dev @testing-library/svelte @testing-library/user-event @testing-library/jest-dom
```

**Configure Vitest for Svelte:**
Update `vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts']
  }
});
```

Create `tests/setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

**Testing Strategy: Test-First Component Migration**

For each tab conversion, follow this pattern:

1. **Write component tests first** (before converting)
2. Convert tab to Svelte
3. Run tests to verify behavior matches
4. Refactor with confidence

**Example: LocalFileTab Component Tests**
```typescript
// tests/components/LocalFileTab.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import LocalFileTab from '../../src/components/LocalFileTab.svelte';

describe('LocalFileTab', () => {
  let mockFileHandler: any;

  beforeEach(() => {
    mockFileHandler = {
      process: vi.fn().mockResolvedValue({
        filename: 'test.wav',
        status: 'pass',
        sampleRate: 48000,
        bitDepth: 16,
        channels: 2
      })
    };
  });

  describe('File Upload', () => {
    it('should render file upload input', () => {
      render(LocalFileTab, { props: { fileHandler: mockFileHandler } });
      const input = screen.getByLabelText(/upload.*file/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'file');
    });

    it('should accept audio file formats', () => {
      render(LocalFileTab, { props: { fileHandler: mockFileHandler } });
      const input = screen.getByLabelText(/upload.*file/i) as HTMLInputElement;
      expect(input.accept).toContain('audio/');
    });

    it('should process file when selected', async () => {
      const user = userEvent.setup();
      render(LocalFileTab, { props: { fileHandler: mockFileHandler } });

      const file = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const input = screen.getByLabelText(/upload.*file/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(mockFileHandler.process).toHaveBeenCalledWith(file, expect.any(Object));
      });
    });
  });

  describe('Results Display', () => {
    it('should display results after processing', async () => {
      const user = userEvent.setup();
      render(LocalFileTab, { props: { fileHandler: mockFileHandler } });

      const file = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const input = screen.getByLabelText(/upload.*file/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText('test.wav')).toBeInTheDocument();
        expect(screen.getByText(/48000.*hz/i)).toBeInTheDocument();
        expect(screen.getByText(/16.*bit/i)).toBeInTheDocument();
      });
    });

    it('should display status badge', async () => {
      const user = userEvent.setup();
      render(LocalFileTab, { props: { fileHandler: mockFileHandler } });

      const file = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const input = screen.getByLabelText(/upload.*file/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        const badge = screen.getByText(/pass/i);
        expect(badge).toHaveClass('badge-success');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on failure', async () => {
      mockFileHandler.process.mockRejectedValue(new Error('Failed to decode audio'));

      const user = userEvent.setup();
      render(LocalFileTab, { props: { fileHandler: mockFileHandler } });

      const file = new File(['bad data'], 'bad.wav', { type: 'audio/wav' });
      const input = screen.getByLabelText(/upload.*file/i) as HTMLInputElement;

      await user.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/failed to decode audio/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator while processing', async () => {
      mockFileHandler.process.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      );

      const user = userEvent.setup();
      render(LocalFileTab, { props: { fileHandler: mockFileHandler } });

      const file = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const input = screen.getByLabelText(/upload.*file/i) as HTMLInputElement;

      await user.upload(input, file);

      expect(screen.getByText(/processing/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Metadata-Only Mode', () => {
    it('should toggle metadata-only mode', async () => {
      const user = userEvent.setup();
      render(LocalFileTab, { props: { fileHandler: mockFileHandler } });

      const checkbox = screen.getByLabelText(/metadata.*only/i) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      await user.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });

    it('should pass metadata-only option to handler', async () => {
      const user = userEvent.setup();
      render(LocalFileTab, { props: { fileHandler: mockFileHandler } });

      const checkbox = screen.getByLabelText(/metadata.*only/i);
      await user.click(checkbox);

      const file = new File(['audio data'], 'test.wav', { type: 'audio/wav' });
      const input = screen.getByLabelText(/upload.*file/i) as HTMLInputElement;
      await user.upload(input, file);

      await waitFor(() => {
        expect(mockFileHandler.process).toHaveBeenCalledWith(
          file,
          expect.objectContaining({ metadataOnly: true })
        );
      });
    });
  });
});
```

**Example: ResultsTable Component Tests**
```typescript
// tests/components/ResultsTable.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ResultsTable from '../../src/components/ResultsTable.svelte';

describe('ResultsTable', () => {
  const mockResults = [
    {
      filename: 'test1.wav',
      status: 'pass',
      sampleRate: 48000,
      bitDepth: 16,
      channels: 2,
      duration: 120
    },
    {
      filename: 'test2.wav',
      status: 'fail',
      sampleRate: 44100,
      bitDepth: 24,
      channels: 1,
      duration: 60
    }
  ];

  describe('Single File Mode', () => {
    it('should render single file results', () => {
      render(ResultsTable, {
        props: {
          results: [mockResults[0]],
          isSingleFile: true
        }
      });

      expect(screen.getByText('test1.wav')).toBeInTheDocument();
      expect(screen.getByText(/48000/)).toBeInTheDocument();
      expect(screen.getByText(/16.*bit/i)).toBeInTheDocument();
    });

    it('should show audio player for single file', () => {
      render(ResultsTable, {
        props: {
          results: [mockResults[0]],
          isSingleFile: true
        }
      });

      const audioPlayer = screen.getByRole('audio');
      expect(audioPlayer).toBeInTheDocument();
    });
  });

  describe('Batch Mode', () => {
    it('should render all batch results', () => {
      render(ResultsTable, {
        props: {
          results: mockResults,
          isSingleFile: false
        }
      });

      expect(screen.getByText('test1.wav')).toBeInTheDocument();
      expect(screen.getByText('test2.wav')).toBeInTheDocument();
    });

    it('should display summary statistics', () => {
      render(ResultsTable, {
        props: {
          results: mockResults,
          isSingleFile: false
        }
      });

      expect(screen.getByText(/2.*files/i)).toBeInTheDocument();
      expect(screen.getByText(/1.*passed/i)).toBeInTheDocument();
      expect(screen.getByText(/1.*failed/i)).toBeInTheDocument();
    });

    it('should not show audio player in batch mode', () => {
      render(ResultsTable, {
        props: {
          results: mockResults,
          isSingleFile: false
        }
      });

      expect(screen.queryByRole('audio')).not.toBeInTheDocument();
    });
  });

  describe('Metadata-Only Mode', () => {
    it('should hide audio analysis columns when metadata-only', () => {
      render(ResultsTable, {
        props: {
          results: mockResults,
          metadataOnly: true
        }
      });

      expect(screen.queryByText(/noise floor/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/peak level/i)).not.toBeInTheDocument();
    });

    it('should show all columns when not metadata-only', () => {
      const resultsWithAnalysis = mockResults.map(r => ({
        ...r,
        noiseFloor: -60,
        peakLevel: -6
      }));

      render(ResultsTable, {
        props: {
          results: resultsWithAnalysis,
          metadataOnly: false
        }
      });

      expect(screen.getByText(/noise floor/i)).toBeInTheDocument();
      expect(screen.getByText(/peak level/i)).toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it('should render pass badge with correct styling', () => {
      render(ResultsTable, {
        props: {
          results: [mockResults[0]]
        }
      });

      const badge = screen.getByText(/pass/i);
      expect(badge).toHaveClass('badge-success');
    });

    it('should render fail badge with correct styling', () => {
      render(ResultsTable, {
        props: {
          results: [mockResults[1]]
        }
      });

      const badge = screen.getByText(/fail/i);
      expect(badge).toHaveClass('badge-danger');
    });
  });
});
```

**Testing Best Practices:**

1. **Use semantic queries:**
   - Prefer `screen.getByRole()`, `screen.getByLabelText()`
   - Avoid `getByTestId()` unless necessary

2. **Test user behavior, not implementation:**
   - Test what users see and do
   - Don't test internal component state

3. **Use user-event for interactions:**
   - More realistic than fireEvent
   - Handles complex interactions better

4. **Async testing:**
   - Always use `waitFor()` for async operations
   - Don't rely on fixed timeouts

5. **Mock external dependencies:**
   - File handlers, auth services, etc.
   - Keep component tests isolated

**Coverage Goals:**
- Each Svelte component: 90%+ coverage
- User interactions: 100% coverage
- Error states: 100% coverage
- Loading states: 100% coverage

**Files to create:**
- `tests/components/LocalFileTab.test.ts`
- `tests/components/GoogleDriveTab.test.ts`
- `tests/components/BoxTab.test.ts`
- `tests/components/SettingsTab.test.ts`
- `tests/components/ResultsTable.test.ts`
- `tests/components/FileUpload.test.ts`
- `tests/components/ValidationDisplay.test.ts`
- `tests/components/StatusBadge.test.ts`

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

- [ ] Svelte Testing Library configured and working
- [ ] **All components tested BEFORE conversion (test-first approach)**
- [ ] All tabs converted to Svelte components
- [ ] Shared ResultsTable component eliminates duplication
- [ ] main.js reduced to ~200 lines (app initialization only)
- [ ] **Component test coverage: 90%+ for each component**
- [ ] **User interaction coverage: 100%**
- [ ] **Error and loading state coverage: 100%**
- [ ] All tests passing (unit + integration + component)
- [ ] Bundle size increase <15KB gzipped
- [ ] No regressions in functionality
- [ ] Better component boundaries for future LLM development

### GitHub Issues

- [ ] Issue #TBD: Set up Svelte and vite plugin
- [ ] Issue #TBD: Configure Svelte Testing Library
- [ ] Issue #TBD: Write LocalFileTab component tests (test-first)
- [ ] Issue #TBD: Convert Local File tab to Svelte
- [ ] Issue #TBD: Write GoogleDriveTab component tests (test-first)
- [ ] Issue #TBD: Convert Google Drive tab to Svelte
- [ ] Issue #TBD: Write BoxTab component tests (test-first)
- [ ] Issue #TBD: Convert Box tab to Svelte
- [ ] Issue #TBD: Write SettingsTab component tests (test-first)
- [ ] Issue #TBD: Convert Settings tab to Svelte
- [ ] Issue #TBD: Create shared ResultsTable component with tests
- [ ] Issue #TBD: Create reusable UI components (FileUpload, StatusBadge, etc.) with tests

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
- **Type Coverage:** 100% of new modules created as TypeScript (.ts)
- **TypeScript Adoption:** All new modules (handlers, validation, UI, settings) in TypeScript
- **Component Architecture:** Clear separation of concerns with component boundaries
- **Component Test Coverage:** 90%+ per component
- **UI Component Testing:** 100% coverage of rendering, user interactions, error states
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
- [ ] #TBD: Set up TypeScript infrastructure
- [ ] #TBD: Unify single/batch display logic
- [ ] #TBD: Extract file handler classes with TypeScript
- [ ] #TBD: Create settings management module with TypeScript
- [ ] #TBD: Extract validation module with TypeScript
- [ ] #TBD: Separate UI controller with TypeScript
- [ ] #TBD: Add UI component testing

### Phase 5: Svelte Migration
- [ ] #TBD: Set up Svelte and vite plugin
- [ ] #TBD: Configure Svelte Testing Library
- [ ] #TBD: Write LocalFileTab component tests (test-first)
- [ ] #TBD: Convert Local File tab to Svelte
- [ ] #TBD: Write GoogleDriveTab component tests (test-first)
- [ ] #TBD: Convert Google Drive tab to Svelte
- [ ] #TBD: Write BoxTab component tests (test-first)
- [ ] #TBD: Convert Box tab to Svelte
- [ ] #TBD: Write SettingsTab component tests (test-first)
- [ ] #TBD: Convert Settings tab to Svelte
- [ ] #TBD: Create shared ResultsTable component with tests
- [ ] #TBD: Create reusable UI components with tests

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
- [ ] Set up TypeScript infrastructure (tsconfig.json, dependencies)
- [ ] Unify display logic
- [ ] Extract file handlers as TypeScript modules
- [ ] Create settings manager as TypeScript module
- [ ] Extract validation module as TypeScript module
- [ ] Separate UI controller as TypeScript module
- [ ] Add UI component testing (ValidationDisplay, UIController)
- [ ] Update tests for new structure
- [ ] Verify all tests passing (including TypeScript type checking)
- [ ] Verify no regressions
- [ ] **Phase 4 Complete** ✅ (main.js <1000 lines + all new modules in TypeScript + UI component tests)

#### Phase 5: Svelte Migration (3-5 days LLM / 2 weeks calendar)
- [ ] Set up Svelte + vite plugin
- [ ] Configure Svelte Testing Library
- [ ] Write LocalFileTab component tests (test-first)
- [ ] Convert Local File tab to Svelte
- [ ] Write GoogleDriveTab component tests (test-first)
- [ ] Convert Google Drive tab to Svelte
- [ ] Write BoxTab component tests (test-first)
- [ ] Convert Box tab to Svelte
- [ ] Write SettingsTab component tests (test-first)
- [ ] Convert Settings tab to Svelte
- [ ] Create shared ResultsTable component with tests
- [ ] Create reusable UI components with tests
- [ ] Verify all component tests passing (90%+ coverage per component)
- [ ] Verify bundle size impact (<15KB increase)
- [ ] Verify no regressions
- [ ] **Phase 5 Complete** ✅ (main.js ~200 lines + Svelte components + comprehensive component tests)

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

**Decision 6:** Create all new files as TypeScript from the outset (Phase 4 refinement)
**Rationale:** Eliminates separate JS→TS conversion step, provides immediate type safety during refactoring, cleaner git history
**Date:** October 9, 2025

**Decision 7:** Add granular UI component testing (Phase 4.7)
**Rationale:** Integration tests alone can miss rendering bugs; component-level tests provide faster, more focused testing and better documentation
**Date:** October 9, 2025

**Decision 8:** Test-first Svelte component migration (Phase 5.4)
**Rationale:** Writing component tests before conversion ensures behavior parity and enables confident refactoring; establishes testing culture for LLM development
**Date:** October 9, 2025

**Decision 9:** Phase-based branching strategy
**Rationale:** Clear scope per branch, manageable PR sizes, can deploy incrementally to beta, easier to track progress and pause/resume work
**Date:** October 10, 2025

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
