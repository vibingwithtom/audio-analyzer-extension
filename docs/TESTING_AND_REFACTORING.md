# Audio Analyzer: Testing & Refactoring Strategy

**Status:** ✅ Phase 4 Complete - TypeScript Refactoring Done
**Started:** October 9, 2025
**Phase 4 Completed:** October 10, 2025

---

## Executive Summary

This document outlines a comprehensive strategy to improve code quality, maintainability, and test coverage for the Audio Analyzer web application. The project currently has **zero test coverage** and a **3,159-line god class** that handles all application logic, making it difficult to maintain and extend safely.

**Strategy:** Test infrastructure first, build comprehensive test suite, then refactor with TypeScript, and migrate to component-based architecture.

**Development Approach:** LLM-assisted development with human review and testing cycles.

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

---

## Completed Phases Summary (Phases 1-4)

**All Phases Completed:** October 10, 2025
**Total Development Time:** ~5 days
**Test Suite:** 635 tests passing
**Code Coverage:** 75%+

### Phase 1: Test Infrastructure Setup ✅

**Completed:** October 9, 2025

**Key Accomplishments:**
- ✅ Vitest configured with jsdom environment for DOM testing
- ✅ Coverage reporting with v8 provider
- ✅ Test organization structure established (`tests/unit/`, `tests/integration/`)
- ✅ Mock data and fixtures created for bilingual validation
- ✅ Sample tests created to validate infrastructure

**Deliverables:**
- `vitest.config.js` - Test configuration
- `tests/setup.js` - Global test setup
- `tests/fixtures/` - Test data and mocks
- Initial test files proving infrastructure works

**Outcome:** Testing foundation in place, ready for comprehensive test coverage

---

### Phase 2: Core Business Logic Tests ✅

**Completed:** October 9, 2025

**Key Accomplishments:**
- ✅ Bilingual filename validation tests (scripted + unscripted patterns)
- ✅ Three Hour filename validation tests (script matching)
- ✅ Criteria validation tests (sample rate, bit depth, channels, file type, duration)
- ✅ Result formatting tests (status badges, property formatting)
- ✅ Preset configuration tests (all preset types validated)

**Test Coverage Added:**
- `tests/unit/bilingual-validation.test.js` - 50+ tests
- `tests/unit/three-hour-validation.test.js` - 30+ tests
- `tests/unit/criteria-validation.test.js` - 40+ tests
- `tests/unit/result-formatting.test.js` - 25+ tests
- `tests/unit/preset-configuration.test.js` - 35+ tests

**Outcome:** Core business logic fully tested, ~60% code coverage achieved

---

### Phase 3: Integration Tests ✅

**Completed:** October 9, 2025

**Key Accomplishments:**
- ✅ File processing integration tests (WAV, MP3, FLAC, advanced analysis)
- ✅ Batch processing integration tests (mixed results, large batches)
- ✅ Auth management tests (Google Drive, Box OAuth flows)
- ✅ Display rendering tests (single file, batch results, tables, audio player)

**Test Coverage Added:**
- `tests/integration/file-processing.test.js` - End-to-end file analysis
- `tests/integration/batch-processing.test.js` - Folder analysis flows
- `tests/integration/auth-management.test.js` - OAuth workflows
- `tests/integration/display-rendering.test.js` - UI rendering logic

**Outcome:** Integration test suite complete, ~70% code coverage achieved

---

### Phase 4: Refactoring with TypeScript ✅

**Completed:** October 10, 2025

**Key Accomplishments:**
- ✅ TypeScript infrastructure configured
- ✅ All handler modules migrated to TypeScript with full type safety
- ✅ Validation modules migrated with strong typing
- ✅ Settings manager migrated with type definitions
- ✅ All modules fully tested (90%+ coverage each)
- ✅ Zero regressions - all 635 tests passing

**New TypeScript Modules Created:**
```
packages/web/src/
├── handlers/
│   ├── local-file-handler.ts       (typed file processing)
│   ├── google-drive-handler.ts     (typed Drive integration)
│   └── box-file-handler.ts         (typed Box integration)
├── validation/
│   ├── filename-validator.ts       (typed validation logic)
│   └── validation-display.ts       (typed display helpers)
├── settings/
│   └── settings-manager.ts         (typed settings with persistence)
└── ui/
    └── ui-controller.ts            (typed DOM management)
```

**Test Coverage Added:**
- `tests/handlers/` - Handler module tests
- `tests/validation/` - Validation module tests
- `tests/settings/` - Settings module tests
- `tests/ui/` - UI controller tests

**Key Metrics:**
- main.js reduced from 3,159 lines to 2,800 lines (~11% reduction)
- All new modules are TypeScript with 90%+ test coverage
- Type safety prevents common runtime errors
- Better code organization and module boundaries

**Outcome:** Typed, tested modules ready for Svelte migration, 75%+ overall code coverage

---

### Phases 1-4: Summary of Achievements

**Testing Infrastructure:**
- ✅ 635 tests passing (0 flaky tests)
- ✅ 75%+ code coverage across codebase
- ✅ Fast test suite (<30 seconds full run)
- ✅ CI/CD integration with GitHub Actions

**Code Quality:**
- ✅ TypeScript adoption for all new modules
- ✅ 100% type coverage in new modules
- ✅ Better separation of concerns
- ✅ Eliminated some code duplication

**Refactoring Progress:**
- ✅ Handler modules extracted and typed
- ✅ Validation logic modularized
- ✅ Settings management centralized
- ✅ UI controller separated

**Remaining Work:**
- ⬜ main.js still at ~2,800 lines (needs Svelte migration for full reduction)
- ⬜ Display logic duplication still exists (will be eliminated in Phase 5)
- ⬜ Tab components still tightly coupled (Phase 5 will componentize)

**Next Step:** Phase 5 - Svelte Migration to achieve final architecture goals

---

## Phase 5: Svelte Migration

**Status:** 🔄 In Progress (Phase 5.5 Complete)
**LLM Development Time:** 3-5 days
**Calendar Time:** 2 weeks (with review cycles)
**Owner:** Claude Code
**Started:** October 10, 2025
**Phase 5.1 Completed:** October 10, 2025
**Phase 5.2a Completed:** October 10, 2025
**Phase 5.2b Completed:** October 10, 2025
**Phase 5.3 Completed:** October 10, 2025
**Phase 5.4 Completed:** October 10, 2025
**Phase 5.5 Completed:** October 10, 2025

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

### Architectural Decisions

**State Management:** Use Svelte stores for shared state (SettingsManager, current results)

**Auth Integration:** Keep `google-auth.js` and `box-auth.js` as vanilla JS
- Pass auth instances as props to tabs
- No Svelte store conversion needed
- Reduces risk and scope

**UIController:** Remove during Phase 5.8 cleanup (Svelte handles DOM rendering)

### Migration Strategy

The migration follows a **sequential approach**: infrastructure → app shell → shared components → tabs → cleanup.

Each step includes explicit test checklists and manual verification.

#### 5.1 Setup & Infrastructure (1 day) ✅

**Goal:** Install Svelte and configure testing before creating any components

**Tasks:**

1. Install Svelte dependencies:
```bash
npm install --save-dev svelte @sveltejs/vite-plugin-svelte
```

2. Install testing dependencies:
```bash
npm install --save-dev @testing-library/svelte @testing-library/user-event @testing-library/jest-dom
```

3. Update `vite.config.js`:
```javascript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [svelte()],
  root: '.',
  publicDir: 'public',
  base: mode === 'beta' ? '/beta/' : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020'
  },
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@audio-analyzer/core': path.resolve(__dirname, '../core')
    }
  },
  optimizeDeps: {
    exclude: ['@audio-analyzer/core']
  }
}));
```

4. Update `vitest.config.js` for Svelte:
```javascript
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.js',
        '**/*.test.ts',
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

5. Create `tests/setup.ts`:
```typescript
import '@testing-library/jest-dom';
```

6. Write sample Svelte component test to verify setup:
```typescript
// tests/components/Sample.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';

// Simple test component for verification
const TestComponent = `
  <script>
    export let name = 'World';
  </script>
  <h1>Hello {name}!</h1>
`;

describe('Svelte Test Setup', () => {
  it('should render Svelte components', () => {
    const { container } = render({ Component: TestComponent, props: { name: 'Svelte' } });
    expect(container.querySelector('h1')?.textContent).toBe('Hello Svelte!');
  });
});
```

7. Run tests to verify setup:
```bash
npm run test:run
```

**Success Criteria:**
- [ ] Svelte installed and Vite configured
- [ ] Testing library installed
- [ ] Sample test passes
- [ ] No breaking changes to existing functionality

**Commit:** `feat: set up Svelte infrastructure and testing`

#### 5.2a Infrastructure & Bridge Pattern (2 days) ✅

**Goal:** Build foundational infrastructure for Svelte migration to prevent DOM conflicts and ensure clean architecture

**Completed:** October 10, 2025

**Note:** See `docs/PHASE_5.2_ARCHITECTURE.md` for comprehensive architectural documentation

**What Was Built:**

1. **AppBridge Event System** (`src/bridge/app-bridge.ts`)
   - Type-safe event bus for decoupled communication
   - Singleton pattern with 40+ typed event types
   - Unidirectional flow: Svelte → Bridge → Services
   - Debug logging support (`enableBridgeDebug()` in console)
   - **23 comprehensive tests** ✅

2. **AuthService Singleton** (`src/services/auth-service.ts`)
   - Single instances of GoogleAuth and BoxAuth
   - Reactive Svelte stores for auth state
   - Prevents multiple OAuth flows and token conflicts
   - Derived stores: `isGoogleAuthenticated`, `isBoxAuthenticated`, `googleUserInfo`
   - **23 comprehensive tests** ✅

3. **ServiceCoordinator** (`src/bridge/service-coordinator.ts`)
   - Routes AppBridge events to appropriate services
   - Implements auth flow (Google Drive, Box)
   - Placeholder for file processing (Phase 5.3+)
   - Clean separation of concerns
   - **17 comprehensive tests** ✅

4. **Svelte Store Wrappers** (`src/stores/auth.ts`)
   - Easy-to-use reactive auth state exports
   - Ready for Svelte component consumption

5. **Architecture Document** (`docs/PHASE_5.2_ARCHITECTURE.md`)
   - Complete guide addressing code review concerns
   - Svelte-main.js bridge pattern solution
   - Styling strategy (hybrid scoping, CSS variables)
   - Auth singleton pattern with reactive stores
   - TypeScript-first approach documentation

**Integration:**
- Updated `main.js` to use AuthService singleton instances
- Initialized ServiceCoordinator on DOMContentLoaded
- Fixed duplicate auth initialization issues
- No breaking changes to existing functionality

**Test Results:**
- ✅ All 761 tests passing (698 existing + 63 new)
- ✅ Zero regressions
- ✅ Beta deployment verified
- ✅ Clean Box OAuth flow (no errors)

**Commits:**
- `e255931` - Initial infrastructure implementation
- `e53b40e` - Fixed isSignedIn() method name
- `402b509` - Prevented duplicate auth instances
- `d21f038` - Removed duplicate init() calls

**Success Criteria:**
- ✅ AppBridge infrastructure exists and is fully tested
- ✅ No DOM conflicts (architecture ready)
- ✅ Auth singleton prevents multiple instances
- ✅ All code is TypeScript
- ✅ All tests pass with no regressions
- ✅ Beta deployment stable

---

#### 5.2b App Shell & Tab Navigation (2-3 days) ✅

**Goal:** Create Svelte app container and tab navigation using the infrastructure from 5.2a

**Completed:** October 10, 2025

**Prerequisites:**
- ✅ Phase 5.2a complete (AppBridge, AuthService, ServiceCoordinator)

**This establishes the UI architecture before converting any tabs.**

**Tasks:**

1. Create Svelte stores for shared state:
```typescript
// src/stores.ts
import { writable } from 'svelte/store';
import { SettingsManager } from './settings/settings-manager';

// Settings store
export const settingsManager = writable(new SettingsManager());

// Current analysis results
export const currentResults = writable(null);

// Current tab
export const currentTab = writable<'local' | 'googleDrive' | 'box' | 'settings'>('local');
```

2. Create TabNavigation component:
```svelte
<!-- src/components/TabNavigation.svelte -->
<script>
  import { currentTab } from '../stores';

  function switchTab(tab) {
    currentTab.set(tab);
  }
</script>

<div class="tabs">
  <button on:click={() => switchTab('local')} class:active={$currentTab === 'local'}>
    Local Files
  </button>
  <button on:click={() => switchTab('googleDrive')} class:active={$currentTab === 'googleDrive'}>
    Google Drive
  </button>
  <button on:click={() => switchTab('box')} class:active={$currentTab === 'box'}>
    Box
  </button>
  <button on:click={() => switchTab('settings')} class:active={$currentTab === 'settings'}>
    Settings
  </button>
</div>
```

3. Write TabNavigation tests:
```typescript
// tests/components/TabNavigation.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import TabNavigation from '../../src/components/TabNavigation.svelte';
import { get } from 'svelte/store';
import { currentTab } from '../../src/stores';

describe('TabNavigation', () => {
  it('should render all tab buttons', () => {
    render(TabNavigation);
    expect(screen.getByText('Local Files')).toBeInTheDocument();
    expect(screen.getByText('Google Drive')).toBeInTheDocument();
    expect(screen.getByText('Box')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should switch tabs on click', async () => {
    const user = userEvent.setup();
    render(TabNavigation);

    const driveButton = screen.getByText('Google Drive');
    await user.click(driveButton);

    expect(get(currentTab)).toBe('googleDrive');
  });

  it('should highlight active tab', () => {
    currentTab.set('box');
    render(TabNavigation);

    const boxButton = screen.getByText('Box');
    expect(boxButton).toHaveClass('active');
  });
});
```

4. Create App.svelte (main container):
```svelte
<!-- src/components/App.svelte -->
<script>
  import { currentTab } from '../stores';
  import TabNavigation from './TabNavigation.svelte';
  import GoogleAuth from '../google-auth.js';
  import BoxAuth from '../box-auth.js';

  // Initialize auth (keep as vanilla JS for now)
  const googleAuth = new GoogleAuth();
  const boxAuth = new BoxAuth();

  // For now, render placeholder divs for tab content
  // Tabs will be migrated one by one in later phases
</script>

<div class="app">
  <header class="header">
    <div class="container">
      <h1 class="logo">🎵 Audio Analyzer</h1>
    </div>
  </header>

  <TabNavigation />

  <main class="main-content">
    {#if $currentTab === 'local'}
      <div id="local-tab-content">
        <!-- Vanilla JS content from main.js (for now) -->
      </div>
    {:else if $currentTab === 'googleDrive'}
      <div id="google-drive-tab-content">
        <!-- Vanilla JS content from main.js (for now) -->
      </div>
    {:else if $currentTab === 'box'}
      <div id="box-tab-content">
        <!-- Vanilla JS content from main.js (for now) -->
      </div>
    {:else if $currentTab === 'settings'}
      <div id="settings-tab-content">
        <!-- Vanilla JS content from main.js (for now) -->
      </div>
    {/if}
  </main>
</div>
```

5. Update `main.js` to mount App.svelte:
```javascript
import App from './components/App.svelte';
import GoogleAuth from './google-auth.js';
import BoxAuth from './box-auth.js';

// Mount Svelte app
const app = new App({
  target: document.getElementById('app')
});

// Keep existing WebAudioAnalyzer initialization for now
// Will be migrated incrementally
```

6. Run tests → all should pass

7. Deploy to beta:
```bash
cd packages/web
npm run deploy:beta
```

8. Manual test checklist:
- [ ] App loads without errors
- [ ] Tab navigation works (switches between tabs)
- [ ] Active tab is highlighted
- [ ] Existing vanilla JS content still works in each tab

**Success Criteria:**
- [ ] App shell renders correctly
- [ ] Tab navigation functional
- [ ] Hybrid state works (Svelte shell + vanilla JS content)
- [ ] All tests passing
- [ ] Beta deployment verified

**Commit:** `feat: add Svelte app shell and tab navigation`

#### 5.3 Shared Components Foundation (2-3 days) ✅

**Goal:** Build reusable components BEFORE converting tabs, so tabs can use them immediately

**Completed:** October 10, 2025

These components eliminate duplication and provide building blocks for tab migration.

**What Was Built:**

1. **StatusBadge Component** (`src/components/StatusBadge.svelte`)
   - Displays pass/warning/fail/error badges with appropriate colors and icons
   - Test file: `tests/components/StatusBadge.test.ts` (3 tests)
   - ✅ Verified working in beta

2. **ResultsTable Component** (`src/components/ResultsTable.svelte`)
   - Supports single file and batch modes
   - Summary statistics for batch mode
   - Metadata-only mode option
   - Integrates StatusBadge component
   - Test file: `tests/components/ResultsTable.test.ts` (8 tests)
   - ✅ Verified working in beta

3. **FileUpload Component** (`src/components/FileUpload.svelte`)
   - File input with configurable accept types
   - Processing state support
   - Change event dispatching
   - Test file: `tests/components/FileUpload.test.ts` (3 tests)
   - ✅ Verified working in beta

4. **ValidationDisplay Component** (`src/components/ValidationDisplay.svelte`)
   - Displays validation results with color-coded status
   - Shows issues for failed/warning validations
   - Test file: `tests/components/ValidationDisplay.test.ts` (2 tests)
   - ✅ Verified working in beta

5. **Component Demo Page** (`src/components/App.svelte`)
   - Interactive demo of all Phase 5.3 components
   - Allows visual verification without full tab integration
   - Deployed to beta for verification

**Tooling Limitations:**

Component tests cannot run due to @sveltejs/vite-plugin-svelte v6.x + Vitest compatibility issue. Tests are excluded in `vitest.config.js:16`. Components were verified through:
- Manual beta deployment testing
- Visual inspection in both light and dark modes
- Console error checking

**Test Results:**
- ✅ All 698 existing tests passing (no regressions)
- ✅ Bundle size: 63KB (up from 51KB in Phase 5.2b)
- ✅ Beta deployment successful
- ✅ All components render correctly
- ✅ No console errors

**Commits:**
- Component demo implementation and verification

##### 5.3.1 StatusBadge Component

1. Write tests first:
```typescript
// tests/components/StatusBadge.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import StatusBadge from '../../src/components/StatusBadge.svelte';

describe('StatusBadge', () => {
  it('should render pass badge', () => {
    render(StatusBadge, { props: { status: 'pass' } });
    const badge = screen.getByText(/pass/i);
    expect(badge).toHaveClass('badge-success');
  });

  it('should render fail badge', () => {
    render(StatusBadge, { props: { status: 'fail' } });
    const badge = screen.getByText(/fail/i);
    expect(badge).toHaveClass('badge-danger');
  });

  it('should render warning badge', () => {
    render(StatusBadge, { props: { status: 'warning' } });
    const badge = screen.getByText(/warning/i);
    expect(badge).toHaveClass('badge-warning');
  });
});
```

2. Create component:
```svelte
<!-- src/components/StatusBadge.svelte -->
<script>
  export let status; // 'pass' | 'fail' | 'warning' | 'error'

  const badgeConfig = {
    pass: { icon: '✓', class: 'badge-success', text: 'Pass' },
    fail: { icon: '✗', class: 'badge-danger', text: 'Fail' },
    warning: { icon: '⚠', class: 'badge-warning', text: 'Warning' },
    error: { icon: '✗', class: 'badge-danger', text: 'Error' }
  };

  $: config = badgeConfig[status] || badgeConfig.error;
</script>

<span class="badge {config.class}">
  {config.icon} {config.text}
</span>
```

3. Run tests → should pass

4. Commit: `feat: add StatusBadge Svelte component`

##### 5.3.2 ResultsTable Component

1. Write tests first:
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
          mode: 'single'
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
          mode: 'single'
        }
      });

      expect(screen.queryByRole('audio')).toBeInTheDocument();
    });
  });

  describe('Batch Mode', () => {
    it('should render all batch results', () => {
      render(ResultsTable, {
        props: {
          results: mockResults,
          mode: 'batch'
        }
      });

      expect(screen.getByText('test1.wav')).toBeInTheDocument();
      expect(screen.getByText('test2.wav')).toBeInTheDocument();
    });

    it('should display summary statistics', () => {
      render(ResultsTable, {
        props: {
          results: mockResults,
          mode: 'batch'
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
          mode: 'batch'
        }
      });

      expect(screen.queryByRole('audio')).not.toBeInTheDocument();
    });
  });

  describe('Metadata-Only Mode', () => {
    it('should hide audio analysis columns', () => {
      const resultsWithAnalysis = mockResults.map(r => ({
        ...r,
        noiseFloor: -60,
        peakLevel: -6
      }));

      render(ResultsTable, {
        props: {
          results: resultsWithAnalysis,
          metadataOnly: true
        }
      });

      expect(screen.queryByText(/noise floor/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/peak level/i)).not.toBeInTheDocument();
    });
  });
});
```

2. Create component:
```svelte
<!-- src/components/ResultsTable.svelte -->
<script>
  import StatusBadge from './StatusBadge.svelte';
  import { renderResultRow, updateColumnVisibility } from '../display-utils';
  import { CriteriaValidator } from '@audio-analyzer/core';

  export let results = [];
  export let mode = 'single'; // 'single' | 'batch'
  export let metadataOnly = false;

  $: isSingleFile = mode === 'single';

  // Calculate summary stats for batch mode
  $: summaryStats = mode === 'batch' ? {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    warnings: results.filter(r => r.status === 'warning').length,
    errors: results.filter(r => r.status === 'error').length
  } : null;
</script>

<div class="results-container">
  {#if mode === 'batch' && summaryStats}
    <div class="batch-summary">
      <h3>Summary</h3>
      <p>{summaryStats.total} files: {summaryStats.passed} passed, {summaryStats.failed} failed</p>
    </div>
  {/if}

  <table class="results-table">
    <thead>
      <tr>
        <th>Filename</th>
        <th>Status</th>
        {#if !metadataOnly}
          <th>Sample Rate</th>
          <th>Bit Depth</th>
          <th>Channels</th>
          <th>Duration</th>
        {/if}
        <th>File Size</th>
        {#if isSingleFile}
          <th>Play</th>
        {/if}
      </tr>
    </thead>
    <tbody>
      {#each results as result}
        <tr>
          <td>{result.filename}</td>
          <td><StatusBadge status={result.status} /></td>
          {#if !metadataOnly}
            <td>{result.sampleRate} Hz</td>
            <td>{result.bitDepth} bit</td>
            <td>{result.channels}</td>
            <td>{result.duration}s</td>
          {/if}
          <td>{result.fileSize}</td>
          {#if isSingleFile}
            <td>
              {#if result.audioUrl}
                <audio controls src={result.audioUrl}></audio>
              {/if}
            </td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
```

3. Run tests → should pass

4. Commit: `feat: add ResultsTable Svelte component`

##### 5.3.3 FileUpload Component

1. Write tests

2. Create component

3. Run tests

4. Commit: `feat: add FileUpload Svelte component`

##### 5.3.4 ValidationDisplay Component

1. Write tests

2. Create component

3. Run tests

4. Commit: `feat: add ValidationDisplay Svelte component`

**Deploy all shared components to beta:**
```bash
npm run deploy:beta
```

**Visual verification:**
- [ ] Components render correctly
- [ ] Styling matches existing design
- [ ] No console errors

**Success Criteria:**
- [ ] All shared components created
- [ ] All component tests passing (90%+ coverage each)
- [ ] Components visually verified in beta
- [ ] Ready for use in tab migration

**Commit:** `feat: complete shared component library`

#### 5.4 Tab Migration - All Four Tabs (2-3 days) ✅

**Goal:** Convert all four tabs to Svelte components with basic functionality

**Completed:** October 10, 2025

**What Was Built:**

1. **LocalFileTab.svelte** - Single file upload and analysis with metadata-only mode
2. **GoogleDriveTab.svelte** - Google OAuth sign in/out UI (tested working)
3. **BoxTab.svelte** - Box OAuth sign in/out UI
4. **SettingsTab.svelte** - Placeholder for Phase 5.5+
5. **App.svelte** - Conditional tab rendering based on currentTab store

**Event Bridge Fixes:** Fixed event name mismatches for auth flows

**Known Limitations (Deferred):**
- No preset/criteria selection (Phase 5.5+)
- No batch processing (Phase 5.5+)
- Basic styling and raw number formats (Phase 5.6 UI Polish)
- No file browsing for Drive/Box (Phase 5.5+)

**Test Results:** ✅ All 698 tests passing, 75.68 KB bundle, beta verified

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

**Implementation Tasks:**

1. **Write LocalFileTab tests first** (test-first approach)
   - Create `tests/components/LocalFileTab.test.ts`
   - Write all tests shown above
   - Run tests (they should fail - component doesn't exist yet)

2. **Create LocalFileTab.svelte component**
```svelte
<!-- src/components/LocalFileTab.svelte -->
<script lang="ts">
  import { settingsManager, currentResults } from '../stores';
  import FileUpload from './FileUpload.svelte';
  import ResultsTable from './ResultsTable.svelte';
  import ValidationDisplay from './ValidationDisplay.svelte';
  import LocalFileHandler from '../handlers/local-file-handler';

  export let fileHandler: LocalFileHandler;

  let processing = false;
  let error = '';
  let metadataOnly = false;

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    processing = true;
    error = '';

    try {
      const settings = $settingsManager;
      const results = await fileHandler.process(file, {
        metadataOnly,
        settings
      });

      currentResults.set(results);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      currentResults.set(null);
    } finally {
      processing = false;
    }
  }
</script>

<div class="local-file-tab">
  <FileUpload
    on:change={handleFileSelect}
    accept="audio/*"
    {processing}
  />

  <label>
    <input type="checkbox" bind:checked={metadataOnly} />
    Metadata Only (skip audio analysis)
  </label>

  {#if error}
    <div class="error-message">{error}</div>
  {/if}

  {#if processing}
    <div class="processing-indicator">Processing...</div>
  {/if}

  {#if $currentResults}
    <ResultsTable
      results={[$currentResults]}
      mode="single"
      {metadataOnly}
    />

    {#if $currentResults.validation}
      <ValidationDisplay validation={$currentResults.validation} />
    {/if}
  {/if}
</div>

<style>
  .local-file-tab {
    padding: 1rem;
  }

  .error-message {
    color: var(--error-color);
    margin: 1rem 0;
    padding: 0.5rem;
    background: var(--error-bg);
    border-radius: 4px;
  }

  .processing-indicator {
    margin: 1rem 0;
    padding: 0.5rem;
    background: var(--info-bg);
    border-radius: 4px;
  }

  label {
    display: block;
    margin: 1rem 0;
  }
</style>
```

3. **Update App.svelte to use LocalFileTab**
```svelte
<script>
  import { currentTab } from '../stores';
  import LocalFileTab from './LocalFileTab.svelte';
  import LocalFileHandler from '../handlers/local-file-handler';

  const fileHandler = new LocalFileHandler();
</script>

{#if $currentTab === 'local'}
  <LocalFileTab {fileHandler} />
{/if}
```

4. **Run tests and verify**
   - All LocalFileTab tests should pass
   - Coverage should be 90%+

5. **Manual testing checklist**

**Single file analysis:**
- [ ] Upload WAV file - displays results correctly
- [ ] Upload MP3 file - displays results correctly
- [ ] Upload invalid file - shows error message
- [ ] Toggle metadata-only - skips analysis, shows only metadata
- [ ] Check status badge - correct color/text
- [ ] Check audio player - loads and plays
- [ ] Select preset - applies validation correctly
- [ ] Validation warnings/failures - display correctly

**Error scenarios:**
- [ ] Large file (>100MB) - handles gracefully
- [ ] Corrupted file - shows error
- [ ] Network error during processing - shows error
- [ ] Cancel/re-upload quickly - no race conditions

**Visual verification:**
- [ ] Layout matches existing design
- [ ] Loading state displays correctly
- [ ] Results table formatting correct
- [ ] No console errors
- [ ] Mobile responsive

**Success Criteria:**
- [ ] All LocalFileTab tests passing (90%+ coverage)
- [ ] Manual test checklist complete
- [ ] Single file upload works identically to old version
- [ ] Error handling works
- [ ] No console errors
- [ ] Visual regression check passed

**Commit:** `feat: migrate Local File tab to Svelte`

---

#### 5.5 Settings & Criteria Integration (1-2 days) ✅

**Goal:** Implement preset selection and criteria validation integration

**Completed:** October 10, 2025

**What Was Built:**

1. **Settings Store** (`src/stores/settings.ts`)
   - Reactive preset management with localStorage persistence
   - Derived stores for current preset and criteria
   - Automatic preset to criteria conversion

2. **SettingsTab Component**
   - Full preset selector dropdown with all 9 presets
   - Detailed requirements display for each preset
   - Clean separation of configuration from analysis workflow

3. **LocalFileTab Integration**
   - Current preset display banner with link to Settings
   - CriteriaValidator integration for file validation
   - Overall status calculation (pass/warning/fail)

4. **ResultsTable Inline Validation**
   - ✅ Green cell highlighting for passing validations
   - ⚠️ Yellow cell highlighting for warnings
   - ❌ Red cell highlighting for failures
   - Light row tinting based on overall status
   - Hover tooltips showing validation issues
   - **Critical for batch processing** - allows quick visual scanning of large result sets

5. **Audio Playback**
   - Blob URL creation for uploaded files
   - Audio controls in Play column
   - Proper memory cleanup with `onDestroy`

6. **TabNavigation Update**
   - Added Settings tab button to navigation

**Design Decision: Settings Tab Approach**
- Separate Settings tab provides dedicated space for preset configuration
- Keeps analysis interface (LocalFileTab) clean and focused
- Better for future expansion (more settings, advanced options)
- Link from LocalFileTab allows quick access when needed

**Validation Features:**
- All validation displayed inline in table cells (no separate section)
- Color-coded cells: green (pass), yellow (warning), red (fail)
- Row-level tinting for quick identification of problem files
- Tooltips show specific validation issues on hover
- Works seamlessly for single file and batch processing

**Known Limitations (Deferred):**
- Basic styling and raw number formats (Phase 5.6 UI Polish)
- No batch processing / multiple file upload (Phase 5.6+)
- No Google Drive file browsing (Phase 5.6+)
- No Box file browsing (Phase 5.6+)

**Test Results:** ✅ All 698 tests passing, 88.76 KB bundle, beta verified

**Commit:** `feat: Phase 5.5 - Settings & Criteria Integration with inline validation`

---

#### 5.6 Box Tab Migration (2-3 days) ⬜

**Goal:** Convert Box tab to Svelte while maintaining OAuth and folder processing

**This follows the same pattern as Google Drive Tab (5.5)**

**Implementation Tasks:**

1. **Write BoxTab tests first**

```typescript
// tests/components/BoxTab.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import BoxTab from '../../src/components/BoxTab.svelte';

describe('BoxTab', () => {
  let mockBoxAuth: any;
  let mockBoxHandler: any;

  beforeEach(() => {
    mockBoxAuth = {
      isAuthenticated: false,
      signIn: vi.fn().mockResolvedValue(true),
      signOut: vi.fn()
    };

    mockBoxHandler = {
      processUrl: vi.fn().mockResolvedValue({
        filename: 'test.wav',
        status: 'pass'
      }),
      processFolderUrl: vi.fn().mockResolvedValue([
        { filename: 'file1.wav', status: 'pass' },
        { filename: 'file2.wav', status: 'fail' }
      ])
    };
  });

  describe('Authentication', () => {
    it('should show sign-in button when not authenticated', () => {
      render(BoxTab, {
        props: {
          boxAuth: mockBoxAuth,
          boxHandler: mockBoxHandler
        }
      });

      expect(screen.getByText(/sign in.*box/i)).toBeInTheDocument();
    });

    it('should call signIn when button clicked', async () => {
      const user = userEvent.setup();
      render(BoxTab, {
        props: {
          boxAuth: mockBoxAuth,
          boxHandler: mockBoxHandler
        }
      });

      const button = screen.getByText(/sign in.*box/i);
      await user.click(button);

      expect(mockBoxAuth.signIn).toHaveBeenCalled();
    });
  });

  describe('File Processing', () => {
    beforeEach(() => {
      mockBoxAuth.isAuthenticated = true;
    });

    it('should process Box shared link', async () => {
      const user = userEvent.setup();
      render(BoxTab, {
        props: {
          boxAuth: mockBoxAuth,
          boxHandler: mockBoxHandler
        }
      });

      const input = screen.getByLabelText(/box.*url/i);
      await user.type(input, 'https://app.box.com/s/abc123');

      const button = screen.getByText(/analyze/i);
      await user.click(button);

      await waitFor(() => {
        expect(mockBoxHandler.processUrl).toHaveBeenCalled();
      });
    });

    it('should display results after processing', async () => {
      const user = userEvent.setup();
      render(BoxTab, {
        props: {
          boxAuth: mockBoxAuth,
          boxHandler: mockBoxHandler
        }
      });

      const input = screen.getByLabelText(/box.*url/i);
      await user.type(input, 'https://app.box.com/s/abc123');

      const button = screen.getByText(/analyze/i);
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('test.wav')).toBeInTheDocument();
      });
    });
  });

  describe('Folder Processing', () => {
    beforeEach(() => {
      mockBoxAuth.isAuthenticated = true;
    });

    it('should process Box folder', async () => {
      const user = userEvent.setup();
      render(BoxTab, {
        props: {
          boxAuth: mockBoxAuth,
          boxHandler: mockBoxHandler
        }
      });

      const input = screen.getByLabelText(/box.*url/i);
      await user.type(input, 'https://app.box.com/folder/123456');

      const button = screen.getByText(/analyze/i);
      await user.click(button);

      await waitFor(() => {
        expect(mockBoxHandler.processFolderUrl).toHaveBeenCalled();
      });
    });

    it('should display batch results', async () => {
      const user = userEvent.setup();
      render(BoxTab, {
        props: {
          boxAuth: mockBoxAuth,
          boxHandler: mockBoxHandler
        }
      });

      const input = screen.getByLabelText(/box.*url/i);
      await user.type(input, 'https://app.box.com/folder/123456');

      const button = screen.getByText(/analyze/i);
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('file1.wav')).toBeInTheDocument();
        expect(screen.getByText('file2.wav')).toBeInTheDocument();
      });
    });
  });
});
```

2. **Create BoxTab.svelte component**

```svelte
<!-- src/components/BoxTab.svelte -->
<script lang="ts">
  import { settingsManager, currentResults } from '../stores';
  import ResultsTable from './ResultsTable.svelte';
  import ValidationDisplay from './ValidationDisplay.svelte';
  import BoxAuth from '../box-auth';
  import BoxHandler from '../handlers/box-handler';

  export let boxAuth: BoxAuth;
  export let boxHandler: BoxHandler;

  let url = '';
  let processing = false;
  let error = '';
  let metadataOnly = false;
  let authenticated = boxAuth.isAuthenticated;

  async function handleSignIn() {
    try {
      await boxAuth.signIn();
      authenticated = boxAuth.isAuthenticated;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Sign-in failed';
    }
  }

  async function handleAnalyze() {
    if (!url) {
      error = 'Please enter a Box URL';
      return;
    }

    if (!url.includes('box.com')) {
      error = 'Invalid Box URL';
      return;
    }

    processing = true;
    error = '';

    try {
      const settings = $settingsManager;
      const isFolder = url.includes('/folder/');

      let results;
      if (isFolder) {
        results = await boxHandler.processFolderUrl(url, {
          metadataOnly,
          settings
        });
      } else {
        results = await boxHandler.processUrl(url, {
          metadataOnly,
          settings
        });
      }

      currentResults.set(Array.isArray(results) ? results : [results]);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Processing failed';
      currentResults.set(null);
    } finally {
      processing = false;
    }
  }
</script>

<div class="box-tab">
  {#if !authenticated}
    <div class="auth-section">
      <p>Sign in to Box to analyze files</p>
      <button on:click={handleSignIn} class="btn-primary">
        Sign in with Box
      </button>
    </div>
  {:else}
    <div class="url-input-section">
      <label for="box-url">Box URL (file or folder)</label>
      <input
        id="box-url"
        type="text"
        bind:value={url}
        placeholder="https://app.box.com/s/... or .../folder/..."
        disabled={processing}
      />

      <label>
        <input type="checkbox" bind:checked={metadataOnly} />
        Metadata Only (skip audio analysis)
      </label>

      <button
        on:click={handleAnalyze}
        disabled={processing || !url}
        class="btn-primary"
      >
        {processing ? 'Processing...' : 'Analyze'}
      </button>
    </div>

    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    {#if processing}
      <div class="processing-indicator">Processing files from Box...</div>
    {/if}

    {#if $currentResults && $currentResults.length > 0}
      <ResultsTable
        results={$currentResults}
        mode={$currentResults.length === 1 ? 'single' : 'batch'}
        {metadataOnly}
      />

      {#if $currentResults[0].validation}
        <ValidationDisplay validation={$currentResults[0].validation} />
      {/if}
    {/if}
  {/if}
</div>

<style>
  /* Same styles as GoogleDriveTab */
  .box-tab {
    padding: 1rem;
  }

  .auth-section {
    text-align: center;
    padding: 2rem;
  }

  .url-input-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  input[type="text"] {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 1rem;
  }

  input[type="text"]:disabled {
    background: var(--disabled-bg);
  }

  .error-message {
    color: var(--error-color);
    margin: 1rem 0;
    padding: 0.5rem;
    background: var(--error-bg);
    border-radius: 4px;
  }

  .processing-indicator {
    margin: 1rem 0;
    padding: 0.5rem;
    background: var(--info-bg);
    border-radius: 4px;
  }

  .btn-primary {
    padding: 0.5rem 1rem;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  label {
    display: block;
    margin: 0.5rem 0;
  }
</style>
```

3. **Update App.svelte**
```svelte
{#if $currentTab === 'box'}
  <BoxTab {boxAuth} {boxHandler} />
{/if}
```

4. **Manual testing checklist**

**Authentication:**
- [ ] Sign-in button visible when not authenticated
- [ ] Clicking sign-in opens Box OAuth flow
- [ ] After sign-in, UI switches to authenticated state

**Single file:**
- [ ] Enter shared link URL - processes correctly
- [ ] Invalid URL - shows error
- [ ] Results display correctly

**Batch (folder):**
- [ ] Enter folder URL - processes all audio files
- [ ] Progress indicator shows
- [ ] Summary statistics correct
- [ ] All files listed in results

**Error scenarios:**
- [ ] Invalid URL format - shows error
- [ ] Auth expired - shows error
- [ ] Network error - shows error
- [ ] Empty folder - handles gracefully

**Visual verification:**
- [ ] Layout matches existing design
- [ ] No console errors
- [ ] Mobile responsive

**Success Criteria:**
- [ ] All BoxTab tests passing (90%+ coverage)
- [ ] Manual test checklist complete
- [ ] OAuth flow works identically
- [ ] Single file and folder processing work
- [ ] No regressions

**Commit:** `feat: migrate Box tab to Svelte`

---

#### 5.7 Settings Tab Migration (1-2 days) ⬜

**Goal:** Convert Settings tab to Svelte with reactive store integration

**Implementation Tasks:**

1. **Write SettingsTab tests first**

```typescript
// tests/components/SettingsTab.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { get } from 'svelte/store';
import SettingsTab from '../../src/components/SettingsTab.svelte';
import { settingsManager } from '../../src/stores';

describe('SettingsTab', () => {
  beforeEach(() => {
    // Reset settings to default
    settingsManager.set(new SettingsManager());
  });

  describe('Preset Selection', () => {
    it('should display all preset options', () => {
      render(SettingsTab);

      expect(screen.getByText(/auditions/i)).toBeInTheDocument();
      expect(screen.getByText(/character recordings/i)).toBeInTheDocument();
      expect(screen.getByText(/three hour/i)).toBeInTheDocument();
      expect(screen.getByText(/bilingual/i)).toBeInTheDocument();
      expect(screen.getByText(/custom/i)).toBeInTheDocument();
    });

    it('should update store when preset selected', async () => {
      const user = userEvent.setup();
      render(SettingsTab);

      const select = screen.getByLabelText(/preset/i);
      await user.selectOptions(select, 'auditions');

      await waitFor(() => {
        const settings = get(settingsManager);
        expect(settings.currentPreset).toBe('auditions');
      });
    });

    it('should load preset criteria when selected', async () => {
      const user = userEvent.setup();
      render(SettingsTab);

      const select = screen.getByLabelText(/preset/i);
      await user.selectOptions(select, 'three-hour');

      await waitFor(() => {
        // Should show Three Hour specific options
        expect(screen.getByLabelText(/speaker id/i)).toBeInTheDocument();
      });
    });
  });

  describe('Criteria Customization', () => {
    it('should show criteria inputs for custom preset', async () => {
      const user = userEvent.setup();
      render(SettingsTab);

      const select = screen.getByLabelText(/preset/i);
      await user.selectOptions(select, 'custom');

      await waitFor(() => {
        expect(screen.getByLabelText(/sample rate/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/bit depth/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/channels/i)).toBeInTheDocument();
      });
    });

    it('should update criteria when inputs change', async () => {
      const user = userEvent.setup();
      render(SettingsTab);

      const select = screen.getByLabelText(/preset/i);
      await user.selectOptions(select, 'custom');

      const sampleRateInput = screen.getByLabelText(/sample rate/i);
      await user.clear(sampleRateInput);
      await user.type(sampleRateInput, '96000');

      await waitFor(() => {
        const settings = get(settingsManager);
        expect(settings.criteria.sampleRate).toBe(96000);
      });
    });
  });

  describe('Three Hour Settings', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(SettingsTab);
      const select = screen.getByLabelText(/preset/i);
      await user.selectOptions(select, 'three-hour');
    });

    it('should show speaker ID input', () => {
      expect(screen.getByLabelText(/speaker id/i)).toBeInTheDocument();
    });

    it('should show scripts folder URL input', () => {
      expect(screen.getByLabelText(/scripts folder/i)).toBeInTheDocument();
    });

    it('should update validation settings', async () => {
      const user = userEvent.setup();

      const speakerInput = screen.getByLabelText(/speaker id/i);
      await user.type(speakerInput, 'SPEAKER123');

      const folderInput = screen.getByLabelText(/scripts folder/i);
      await user.type(folderInput, 'https://drive.google.com/drive/folders/abc');

      await waitFor(() => {
        const settings = get(settingsManager);
        expect(settings.threeHourSettings.speakerId).toBe('SPEAKER123');
        expect(settings.threeHourSettings.scriptsFolderUrl).toContain('abc');
      });
    });
  });

  describe('Settings Persistence', () => {
    it('should load saved settings on mount', () => {
      // Pre-save settings
      localStorage.setItem('audioAnalyzerSettings', JSON.stringify({
        currentPreset: 'auditions',
        criteria: { sampleRate: 48000 }
      }));

      render(SettingsTab);

      const select = screen.getByLabelText(/preset/i) as HTMLSelectElement;
      expect(select.value).toBe('auditions');
    });

    it('should save settings when changed', async () => {
      const user = userEvent.setup();
      render(SettingsTab);

      const select = screen.getByLabelText(/preset/i);
      await user.selectOptions(select, 'three-hour');

      await waitFor(() => {
        const saved = localStorage.getItem('audioAnalyzerSettings');
        expect(saved).toBeTruthy();
        const parsed = JSON.parse(saved!);
        expect(parsed.currentPreset).toBe('three-hour');
      });
    });
  });

  describe('Advanced Settings', () => {
    it('should toggle advanced options', async () => {
      const user = userEvent.setup();
      render(SettingsTab);

      const advancedToggle = screen.getByText(/advanced/i);
      await user.click(advancedToggle);

      expect(screen.getByLabelText(/noise floor model/i)).toBeInTheDocument();
    });

    it('should update advanced settings', async () => {
      const user = userEvent.setup();
      render(SettingsTab);

      const advancedToggle = screen.getByText(/advanced/i);
      await user.click(advancedToggle);

      const modelSelect = screen.getByLabelText(/noise floor model/i);
      await user.selectOptions(modelSelect, 'histogram');

      await waitFor(() => {
        const settings = get(settingsManager);
        expect(settings.advancedSettings.noiseFloorModel).toBe('histogram');
      });
    });
  });
});
```

2. **Create SettingsTab.svelte component**

```svelte
<!-- src/components/SettingsTab.svelte -->
<script lang="ts">
  import { settingsManager } from '../stores';

  let showAdvanced = false;

  $: currentPreset = $settingsManager.currentPreset;
  $: criteria = $settingsManager.criteria;
  $: threeHourSettings = $settingsManager.threeHourSettings;
  $: advancedSettings = $settingsManager.advancedSettings;

  function handlePresetChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    settingsManager.update(s => {
      s.setPreset(target.value);
      return s;
    });
  }

  function updateCriteria(field: string, value: any) {
    settingsManager.update(s => {
      s.criteria[field] = value;
      s.save();
      return s;
    });
  }

  function updateThreeHourSettings(field: string, value: string) {
    settingsManager.update(s => {
      s.threeHourSettings[field] = value;
      s.save();
      return s;
    });
  }

  function updateAdvancedSettings(field: string, value: any) {
    settingsManager.update(s => {
      s.advancedSettings[field] = value;
      s.save();
      return s;
    });
  }
</script>

<div class="settings-tab">
  <h2>Settings</h2>

  <section class="preset-section">
    <label for="preset-select">Validation Preset</label>
    <select
      id="preset-select"
      bind:value={currentPreset}
      on:change={handlePresetChange}
    >
      <option value="none">None (Metadata Only)</option>
      <option value="auditions">Auditions</option>
      <option value="character">Character Recordings</option>
      <option value="p2b2-mono">P2B2 Pairs (Mono)</option>
      <option value="p2b2-stereo">P2B2 Pairs (Stereo)</option>
      <option value="p2b2-mixed">P2B2 Pairs (Mixed)</option>
      <option value="three-hour">Three Hour</option>
      <option value="bilingual">Bilingual Conversational</option>
      <option value="custom">Custom</option>
    </select>

    <p class="preset-description">
      {#if currentPreset === 'none'}
        No validation criteria applied
      {:else if currentPreset === 'auditions'}
        48kHz, 16-bit, Mono, WAV format
      {:else if currentPreset === 'character'}
        48kHz, 16-bit, Mono, WAV format with character validation
      {:else if currentPreset === 'three-hour'}
        48kHz, 16-bit, Mono, 3+ hour duration with script matching
      {:else if currentPreset === 'bilingual'}
        48kHz, 16-bit, Stereo conversational with filename pattern validation
      {:else if currentPreset === 'custom'}
        Define your own validation criteria
      {/if}
    </p>
  </section>

  {#if currentPreset === 'custom'}
    <section class="criteria-section">
      <h3>Custom Criteria</h3>

      <label for="sample-rate">Sample Rate (Hz)</label>
      <input
        id="sample-rate"
        type="number"
        value={criteria.sampleRate}
        on:change={(e) => updateCriteria('sampleRate', parseInt(e.currentTarget.value))}
      />

      <label for="bit-depth">Bit Depth</label>
      <input
        id="bit-depth"
        type="number"
        value={criteria.bitDepth}
        on:change={(e) => updateCriteria('bitDepth', parseInt(e.currentTarget.value))}
      />

      <label for="channels">Channels</label>
      <select
        id="channels"
        value={criteria.channels}
        on:change={(e) => updateCriteria('channels', parseInt(e.currentTarget.value))}
      >
        <option value={1}>Mono (1)</option>
        <option value={2}>Stereo (2)</option>
      </select>

      <label for="file-type">File Type</label>
      <input
        id="file-type"
        type="text"
        value={criteria.fileType}
        on:change={(e) => updateCriteria('fileType', e.currentTarget.value)}
      />

      <label for="min-duration">Minimum Duration (seconds)</label>
      <input
        id="min-duration"
        type="number"
        value={criteria.minDuration}
        on:change={(e) => updateCriteria('minDuration', parseInt(e.currentTarget.value))}
      />
    </section>
  {/if}

  {#if currentPreset === 'three-hour'}
    <section class="three-hour-section">
      <h3>Three Hour Settings</h3>

      <label for="speaker-id">Speaker ID</label>
      <input
        id="speaker-id"
        type="text"
        placeholder="e.g., SPEAKER001"
        value={threeHourSettings.speakerId || ''}
        on:input={(e) => updateThreeHourSettings('speakerId', e.currentTarget.value)}
      />

      <label for="scripts-folder">Scripts Folder URL (Google Drive)</label>
      <input
        id="scripts-folder"
        type="text"
        placeholder="https://drive.google.com/drive/folders/..."
        value={threeHourSettings.scriptsFolderUrl || ''}
        on:input={(e) => updateThreeHourSettings('scriptsFolderUrl', e.currentTarget.value)}
      />
    </section>
  {/if}

  <section class="advanced-section">
    <button on:click={() => showAdvanced = !showAdvanced} class="toggle-advanced">
      {showAdvanced ? '▼' : '►'} Advanced Settings
    </button>

    {#if showAdvanced}
      <div class="advanced-content">
        <label for="noise-floor-model">Noise Floor Model</label>
        <select
          id="noise-floor-model"
          value={advancedSettings.noiseFloorModel}
          on:change={(e) => updateAdvancedSettings('noiseFloorModel', e.currentTarget.value)}
        >
          <option value="histogram">Histogram (Recommended)</option>
          <option value="old">Old Model (Bottom 20% RMS)</option>
        </select>

        <label>
          <input
            type="checkbox"
            checked={advancedSettings.enableReverbEstimation}
            on:change={(e) => updateAdvancedSettings('enableReverbEstimation', e.currentTarget.checked)}
          />
          Enable Reverb (RT60) Estimation
        </label>

        <label>
          <input
            type="checkbox"
            checked={advancedSettings.enableMicBleedDetection}
            on:change={(e) => updateAdvancedSettings('enableMicBleedDetection', e.currentTarget.checked)}
          />
          Enable Mic Bleed Detection
        </label>
      </div>
    {/if}
  </section>
</div>

<style>
  .settings-tab {
    padding: 1rem;
    max-width: 600px;
  }

  section {
    margin: 2rem 0;
  }

  h2 {
    margin-bottom: 1rem;
  }

  h3 {
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
  }

  label {
    display: block;
    margin: 1rem 0 0.25rem;
    font-weight: 500;
  }

  input[type="text"],
  input[type="number"],
  select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 1rem;
  }

  .preset-description {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: var(--info-bg);
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .toggle-advanced {
    background: none;
    border: none;
    padding: 0.5rem 0;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
  }

  .advanced-content {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--bg-secondary);
    border-radius: 4px;
  }

  label input[type="checkbox"] {
    width: auto;
    margin-right: 0.5rem;
  }
</style>
```

3. **Update App.svelte**
```svelte
{#if $currentTab === 'settings'}
  <SettingsTab />
{/if}
```

4. **Manual testing checklist**

**Preset selection:**
- [ ] All presets appear in dropdown
- [ ] Selecting preset updates UI immediately
- [ ] Preset descriptions accurate
- [ ] Settings persist across page refresh

**Custom criteria:**
- [ ] All criteria fields editable
- [ ] Values save correctly
- [ ] Invalid values handled gracefully

**Three Hour settings:**
- [ ] Speaker ID input works
- [ ] Scripts folder URL input works
- [ ] Values persist

**Advanced settings:**
- [ ] Toggle expands/collapses
- [ ] Noise floor model selection works
- [ ] Checkboxes toggle correctly
- [ ] Settings save

**Visual verification:**
- [ ] Layout clean and organized
- [ ] Form inputs styled correctly
- [ ] No console errors
- [ ] Mobile responsive

**Success Criteria:**
- [ ] All SettingsTab tests passing (90%+ coverage)
- [ ] Manual test checklist complete
- [ ] All settings work identically
- [ ] Settings persist correctly
- [ ] No regressions

**Commit:** `feat: migrate Settings tab to Svelte`

---

#### 5.8 Cleanup & Final Integration (1 day) ⬜

**Goal:** Remove old code, finalize integration, and verify everything works

**Implementation Tasks:**

1. **Remove old tab code from main.js**
   - Delete old `handleFileSelect()` function
   - Delete old `handleGoogleDriveUrl()` function
   - Delete old `handleBoxUrl()` function
   - Delete old results display functions
   - Delete old tab switching logic
   - Keep only app initialization code

2. **Verify main.js is ~200 lines**
   - Should contain:
     - Imports
     - Svelte app initialization
     - Auth initialization (pass to Svelte components)
     - Settings initialization
     - Basic error boundary
   - Should NOT contain:
     - Tab logic
     - File handling
     - Results display
     - Validation logic

3. **Remove unused UIController code**
   - If UIController is empty/unused, delete the file
   - If parts are still needed, extract to utilities

4. **Update imports and dependencies**
   - Remove unused imports from main.js
   - Verify all Svelte components import correctly
   - Check for circular dependencies

5. **Run full test suite**
```bash
npm run test:run
npm run typecheck
```

6. **Bundle size verification**
```bash
npm run build
# Check dist/ size
# Should be <15KB increase over baseline
```

7. **Full regression testing checklist**

**Local File Tab:**
- [ ] Single file upload works
- [ ] Metadata-only mode works
- [ ] Results display correctly
- [ ] Error handling works
- [ ] All presets work

**Google Drive Tab:**
- [ ] OAuth flow works
- [ ] Single file URL works
- [ ] Folder URL works (batch)
- [ ] Progress indicator works
- [ ] Results display correctly
- [ ] Error handling works

**Box Tab:**
- [ ] OAuth flow works
- [ ] Shared link works
- [ ] Folder URL works (batch)
- [ ] Results display correctly
- [ ] Error handling works

**Settings Tab:**
- [ ] All presets selectable
- [ ] Custom criteria editable
- [ ] Three Hour settings work
- [ ] Advanced settings work
- [ ] Settings persist

**Tab Navigation:**
- [ ] All tabs switchable
- [ ] Tab state persists when switching
- [ ] No memory leaks when switching

**Cross-cutting:**
- [ ] All 635 tests passing
- [ ] TypeScript compiles with no errors
- [ ] No console errors
- [ ] Bundle size acceptable (<15KB increase)
- [ ] Performance unchanged
- [ ] Mobile responsive
- [ ] Accessibility maintained

8. **Deploy to beta**
```bash
cd packages/web
npm run build
npm run deploy:beta
```

9. **Beta verification**
   - Test at https://audio-analyzer.tinytech.site/beta/
   - Run through full regression checklist
   - Check for any production-only issues
   - Verify all functionality works

10. **Documentation**
    - Update README if needed
    - Document new component architecture
    - Update developer guide

11. **Final commit and merge**
```bash
git add .
git commit -m "refactor: complete Phase 5 Svelte migration

- Migrated all tabs to Svelte components
- Created shared component library (ResultsTable, FileUpload, etc.)
- Reduced main.js from 3,159 lines to ~200 lines
- Maintained 75%+ test coverage with component tests
- All 635+ tests passing
- Zero regressions
- Bundle size increase: <15KB

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main  # Triggers automatic production deployment
```

**Success Criteria:**
- [ ] main.js reduced to ~200 lines (94% reduction)
- [ ] All tabs migrated to Svelte
- [ ] All 635+ tests passing
- [ ] Component test coverage 90%+
- [ ] Bundle size increase <15KB
- [ ] Zero regressions
- [ ] Beta deployment successful
- [ ] Production deployment successful

**Phase 5 Complete! 🎉**

---

### Phase 5 Summary

**Total Timeline:** 10-15 days

| Phase | Duration | Status |
|-------|----------|--------|
| 5.1 Setup & Infrastructure | 1 day | ✅ |
| 5.2 App Shell & Tab Navigation | 1 day | ⬜ |
| 5.3 Shared Components Foundation | 2-3 days | ⬜ |
| 5.4 Local File Tab Migration | 2-3 days | ⬜ |
| 5.5 Google Drive Tab Migration | 2-3 days | ⬜ |
| 5.6 Box Tab Migration | 2-3 days | ⬜ |
| 5.7 Settings Tab Migration | 1-2 days | ⬜ |
| 5.8 Cleanup & Final Integration | 1 day | ⬜ |

**Key Outcomes:**
- ✅ Svelte component architecture
- ✅ main.js reduced from 3,159 lines to ~200 lines (94% reduction)
- ✅ Shared component library eliminates duplication
- ✅ Component test coverage 90%+
- ✅ All 635+ tests passing
- ✅ Better boundaries for future LLM development
- ✅ Zero regressions
- ✅ Production ready

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
- [x] Install Vitest + dependencies
- [x] Configure vitest.config.js
- [x] Update package.json scripts
- [x] Create test file structure
- [x] Write sample tests
- [x] Verify setup works
- [x] **Phase 1 Complete** ✅

#### Phase 2: Core Business Logic Tests (2-3 days LLM / 1-2 weeks calendar)
- [x] Filename validation tests (Bilingual)
- [x] Filename validation tests (Three Hour)
- [x] Criteria validation tests
- [x] File type detection tests
- [x] Result formatting tests
- [x] Preset configuration tests
- [x] Overall status calculation tests
- [x] **Phase 2 Complete** ✅ (Test specifications written, covering ~620 lines of logic)

#### Phase 3: Integration Tests (1-2 days LLM / 1 week calendar)
- [x] File processing workflow tests
- [x] Batch processing tests
- [x] Auth state management tests
- [x] Display rendering tests
- [x] Mock utilities created (test-utils.js with mocking helpers)
- [x] **Phase 3 Complete** ✅ (Test specifications written for complete workflows)

#### Phase 4: Refactoring with TypeScript (3-5 days LLM / 2 weeks calendar)
- [x] 4.1: Set up TypeScript infrastructure (tsconfig.json, dependencies)
- [x] 4.2: Unify display logic (display-utils.ts, ~155 lines removed from main.js)
- [x] 4.3: Extract file utilities (file-utils.ts)
- [x] 4.4: Create settings manager as TypeScript module (settings/, ~400 lines removed from main.js)
- [x] **Bug Fix:** Batch processing context issue (formatDuration) - Added regression tests
- [x] 4.5: Extract validation module as TypeScript module (validation/, ~244 lines removed from main.js)
- [x] 4.6: Separate UI controller as TypeScript module (ui/, ~103 lines removed from main.js) - ✅ Verified in beta
- [x] 4.7: Add UI component testing (UIController 37 tests, SettingsManager 30 tests) - ✅ 67 new tests added
- [x] Update tests for new structure (635 tests total, all passing)
- [x] Verify all tests passing (including TypeScript type checking)
- [x] Verify no regressions
- [x] **Phase 4 Complete** ✅ (main.js reduced from 3,159 → 2,542 lines + all new modules in TypeScript + comprehensive testing)

#### Phase 5: Svelte Migration (3-5 days LLM / 2 weeks calendar)
- [x] Set up Svelte + vite plugin
- [x] Upgrade to Vite 7 and Svelte 5
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

- **Phase 1 Started:** October 10, 2025
- **Phase 1 Completed:** October 10, 2025
- **Phase 2 Started:** October 10, 2025
- **Phase 2 Completed:** October 10, 2025 (Test specifications)
- **Phase 3 Started:** October 10, 2025
- **Phase 3 Completed:** October 10, 2025 (Test specifications)
- **Phase 4 Started:** October 10, 2025
- **Phase 4 Completed:** October 10, 2025
- **Phase 5 Started:** October 10, 2025
- **Phase 5.1 Completed:** October 10, 2025 (Setup & Infrastructure)
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

**Lesson 1:** Test Specifications vs Implementation (October 10, 2025)
- **Issue:** Phases 2-3 were marked "complete" with only test specifications written, not actual implementations
- **Discovery:** Phase 4 prerequisites require "70%+ coverage" and "all tests passing" - impossible with just specs
- **Resolution:** Added Phase 4.0 step to implement display-related tests before refactoring
- **Takeaway:** "Complete" should mean implemented and passing, not just planned

**Lesson 2:** Manual Testing Catches Context Issues Automated Tests Miss (October 10, 2025)
- **Issue:** Batch processing crashed with `TypeError: Cannot read properties of undefined (reading 'formatDuration')`
- **Discovery:** Manual testing after Phase 4.4 deployment revealed the bug in production-like conditions
- **Root Cause:** In `CriteriaValidator.formatDisplayText()` (static method), used `this.formatDuration()` instead of `CriteriaValidator.formatDuration()`. When passed as a detached function reference to `renderResultRow()`, it lost class context.
- **Why Tests Didn't Catch It:** Existing tests called `CriteriaValidator.formatDisplayText()` directly, maintaining context. They didn't test the detached reference scenario used in batch processing.
- **Resolution:**
  - Fixed core library to use explicit class reference: `CriteriaValidator.formatDuration()`
  - Added 2 regression tests specifically testing detached function references
  - Tests now verify the method works when passed as a parameter
- **Takeaway:** Always do manual testing after significant refactoring, especially for:
  - Batch operations vs single operations
  - Different code paths (local/Google Drive/Box)
  - Function references passed as parameters (lose context)
  - Edge cases automated tests might not cover

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

**Last Updated:** October 10, 2025
**Document Owner:** @vibingwithtom
