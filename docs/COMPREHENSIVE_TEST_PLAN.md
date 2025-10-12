# Comprehensive Test Plan for Audio Analyzer

## 1. Objective

This document outlines a comprehensive, phased testing strategy for the Audio Analyzer web application. The primary goal is to increase test coverage to **over 80%**, ensuring application stability, preventing regressions, and enabling safe future development and refactoring. 

This plan is designed to be executed by an LLM, with clear, actionable steps in a prioritized order.

## 2. Guiding Principles

- **Prioritize by Risk:** Test the most critical and least stable parts of the application first (services, authentication, state management) before moving to the UI.
- **Isolate Dependencies:** Use `vi.mock` to isolate services, external APIs, and Svelte stores during testing.
- **Test Behavior, Not Implementation:** For UI components, use `@testing-library/svelte` to test from a user's perspective. Find elements by accessible roles and text, and simulate user events.
- **Track Progress:** After each phase, run the coverage report (`npm run test:coverage`) to measure improvement and identify the next targets.

---

## Phase 1: Service Layer & External APIs (Highest Priority)

**Goal:** Solidify the application's foundation by testing the modules that handle external communication and authentication.

### 1.1 Test `google-auth.js` and `box-auth.js`

- **File Location:** Create `tests/unit/google-auth.test.js` and `tests/unit/box-auth.test.js`.
- **Methodology:** These files are challenging to test directly as they manipulate `window.location` and `localStorage`. Focus on testing the parts that can be isolated. Mock `localStorage` and `fetch` to test methods like `handleOAuthCallback` and `getValidToken`.

**Example Test Case for `box-auth.js`:**
```javascript
// tests/unit/box-auth.test.js
describe('getValidToken', () => {
  it('should return a valid token from localStorage', async () => {
    const tokenInfo = { access_token: 'valid-token', expires_at: Date.now() + 600000 };
    localStorage.setItem('box_token', JSON.stringify(tokenInfo));
    
    const boxAuth = new BoxAuth();
    const result = await boxAuth.getValidToken();

    expect(result.access_token).toBe('valid-token');
  });

  it('should throw an error for an expired token', async () => {
    const tokenInfo = { access_token: 'expired-token', expires_at: Date.now() - 1000 };
    localStorage.setItem('box_token', JSON.stringify(tokenInfo));

    const boxAuth = new BoxAuth();
    await expect(boxAuth.getValidToken()).rejects.toThrow('Not signed in to Box');
  });
});
```

### 1.2 Test `google-drive-api.ts` and `box-api.ts`

- **File Location:** Create `tests/services/google-drive-api.test.ts` and `tests/services/box-api.test.ts`.
- **Methodology:** The key is to mock the network requests (`fetch` or global SDKs like `gapi`). Test that the service methods correctly format API requests and parse both successful and error responses.

**Example Test Case for `box-api.ts`:**
```typescript
// tests/services/box-api.test.ts
import { vi } from 'vitest';

describe('BoxAPI', () => {
  beforeEach(() => {
    // Mock global fetch
    global.fetch = vi.fn();
  });

  it('should list files in a folder and filter for audio', async () => {
    const mockApiResponse = {
      entries: [
        { type: 'file', name: 'audio.mp3' },
        { type: 'file', name: 'document.txt' },
        { type: 'folder', name: 'My Folder' },
      ],
    };
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockApiResponse) });

    const boxApi = new BoxAPI(/* ...mock auth... */);
    const files = await boxApi.listFilesInFolder('folder-123');

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/folders/folder-123/items'), expect.any(Object));
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('audio.mp3');
  });
});
```

### 1.3 Verification
- Run `npm run test:coverage` in the `packages/web` directory.
- **Expected Outcome:** Coverage for `google-drive-api.ts`, `box-api.ts`, `google-auth.js`, and `box-auth.js` should be above 80%.

---

## Phase 2: State Management (Svelte Stores)

**Goal:** Ensure the application's reactive state management is reliable.

- **File Location:** Create test files like `tests/stores/settings.test.ts`, `tests/stores/tabs.test.ts`, etc.
- **Methodology:** These tests are straightforward. Import the store, use its methods to update state, and use `get` from `svelte/store` to assert that the state has changed correctly.

**Example Test Case for `tabs.ts`:**
```typescript
// tests/stores/tabs.test.ts
import { currentTab, setCurrentTab } from '../../src/stores/tabs';
import { get } from 'svelte/store';

describe('Tabs Store', () => {
  it('should update the current tab', () => {
    expect(get(currentTab)).toBe('local'); // Initial value

    setCurrentTab('google-drive');

    expect(get(currentTab)).toBe('google-drive');
  });
});
```

### Verification
- Run `npm run test:coverage`.
- **Expected Outcome:** All files in `src/stores` should have 100% test coverage.

---

## Phase 3: Core Logic & Utilities

**Goal:** Cover remaining pure business logic modules.

- **File Location:** Create `tests/validation/filename-validator.test.ts` and `tests/utils/format-utils.test.ts`.
- **Methodology:** These are standard unit tests. Import the functions, provide a range of inputs (including edge cases), and assert that the output is correct.

### Verification
- Run `npm run test:coverage`.
- **Expected Outcome:** Coverage for `filename-validator.ts` and `format-utils.ts` should be above 90%.

---

## Phase 4: UI Component Testing

**Goal:** Test user-facing components to ensure they render and behave as expected.

- **Methodology:** Use `@testing-library/svelte` and `user-event`. Tests should mimic user actions.

### 4.1 Test Shared Components

- **Priority:** `SettingsTab.svelte`, `ResultsDisplay.svelte`, `FileUpload.svelte`.
- **File Location:** Create corresponding files in `tests/components/`.
- **Approach:** Render the component, simulate user interaction, and assert the outcome. Mock any imported services or stores.

**Example Test Case for `SettingsTab.svelte`:**
```typescript
// tests/components/SettingsTab.test.ts
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import SettingsTab from '../../src/components/SettingsTab.svelte';
import { settingsManager } from '../../src/stores/settings'; // Assuming a settings store

describe('SettingsTab', () => {
  it('should update the preset in the store when changed', async () => {
    render(SettingsTab);
    const user = userEvent.setup();
    const presetSelect = screen.getByLabelText('Validation Preset');

    let currentPreset;
    settingsManager.subscribe(sm => { currentPreset = sm.currentPreset; });

    expect(currentPreset).not.toBe('auditions');

    await user.selectOptions(presetSelect, 'Auditions');

    expect(currentPreset).toBe('auditions');
  });
});
```

### 4.2 Test Main Tab Components

- **Priority:** `LocalFileTab.svelte`, `GoogleDriveTab.svelte`, `BoxTab.svelte`.
- **File Location:** Create corresponding files in `tests/components/`.
- **Approach:** These are integration-style component tests. The component is rendered, and its external dependencies (like `analyzeAudioFile` or the API services) should be mocked using `vi.mock`.

**Example Test Case for `LocalFileTab.svelte`:**
```typescript
// tests/components/LocalFileTab.test.ts
import * as analysisService from '../../src/services/audio-analysis-service';

// Mock the entire analysis service
vi.mock('../../src/services/audio-analysis-service');

describe('LocalFileTab', () => {
  it('should call analyzeAudioFile when a file is uploaded', async () => {
    const analyzeSpy = vi.spyOn(analysisService, 'analyzeAudioFile');
    render(LocalFileTab);
    const user = userEvent.setup();

    const fileInput = screen.getByLabelText('upload-file-input'); // Assuming an accessible label
    const file = new File(['...'], 'test.wav', { type: 'audio/wav' });

    await user.upload(fileInput, file);

    expect(analyzeSpy).toHaveBeenCalledOnce();
    expect(analyzeSpy).toHaveBeenCalledWith(file, expect.any(Object));
  });
});
```

### Verification
- Run `npm run test:coverage`.
- **Expected Outcome:** Overall project statement coverage should now exceed **80%**. All major components should have at least 70% coverage.

---

## 5. CI and Maintenance

- **Continuous Integration:** Once the test suite is robust, configure it to run automatically in a CI pipeline (e.g., GitHub Actions) on every pull request to `main`. This will prevent future regressions.
- **New Features:** All new features and bug fixes must be accompanied by corresponding tests. Enforce this as a rule for all future development.
