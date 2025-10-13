# Audio Analyzer - Testing Strategy 2025

**Created:** January 13, 2025
**Status:** Active
**Current Coverage:** 17.66% (web/src), 729 tests passing
**Target Coverage:** 75-80% (web/src)

---

## Overview

This document outlines the testing strategy for the Audio Analyzer web application. It reflects the current Svelte 5 architecture and provides a pragmatic, phased approach to improving test coverage.

### Current State
- **Tests Passing:** 729 tests
- **Web Coverage:** 17.66% (web/src directory)
- **Core Library:** Well-tested (~75%+ coverage)
- **Main Gaps:** Svelte components (0%), stores (0%), validation (0%), Google Drive API (0%)

### Testing Philosophy
1. **Business logic first, UI second** - Stores and services are more critical than components
2. **Realistic goals** - Target 75-80%, not 100% (diminishing returns)
3. **Pragmatic approach** - Some code is hard to test (OAuth flows, browser APIs)
4. **Test behavior, not implementation** - Focus on what the code does, not how
5. **Maintainable tests** - Every test has a maintenance cost

---

## Coverage Goals & Timeline

### Phase 1: Critical Gaps (1-2 weeks) - Target: 45%
**Priority:** High
**Effort:** 12-18 hours
**Impact:** Covers the most critical business logic

**Targets:**
- ✅ Stores: 0% → 100% (all 5 stores)
- ✅ Validation: 0% → 90% (filename-validator.ts)
- ✅ Google Drive API: 0% → 80% (google-drive-api.ts)
- ✅ Utils: 0% → 100% (format-utils.ts)

**Expected Result:** Web coverage jumps to ~45%

---

### Phase 2: Services & Components (1-2 months) - Target: 65%
**Priority:** Medium
**Effort:** 20-30 hours
**Impact:** Comprehensive coverage of user-facing features

**Targets:**
- ✅ Components: 0% → 70% (focus on high-priority components)
- ✅ Box Auth: 32.88% → 70%
- ✅ Google Auth: 0% → 70%

**Expected Result:** Web coverage reaches ~65%

---

### Phase 3: Comprehensive Coverage (3+ months) - Target: 75%
**Priority:** Lower
**Effort:** 15-20 hours
**Impact:** Polished test suite with minimal gaps

**Targets:**
- ✅ Remaining components: 0% → 70%
- ✅ Integration tests for critical workflows
- ✅ Edge cases and error handling

**Expected Result:** Web coverage reaches 75-80%

---

## Phase 1 Implementation Guide

### 1.1 Store Testing (Highest Priority)

**Files to Test:**
```
src/stores/
├── settings.ts          ← Primary target
├── analysisMode.ts      ← Primary target
├── auth.ts              ← Primary target
├── tabs.ts              ← Primary target
└── threeHourSettings.ts ← Primary target
```

**Why Critical:**
- Stores manage ALL application state
- Bugs here affect every component
- Easy to test (pure reactive logic)
- High ROI (low effort, high impact)

**Testing Pattern:**
```typescript
// tests/stores/settings.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  currentPresetId,
  setPreset,
  hasValidPresetConfig,
  availablePresets,
  currentCriteria
} from '../../src/stores/settings';

describe('Settings Store', () => {
  beforeEach(() => {
    // Reset to default state
    setPreset('none');
  });

  describe('Preset Selection', () => {
    it('should update currentPresetId when setPreset is called', () => {
      setPreset('auditions-character-recordings');
      expect(get(currentPresetId)).toBe('auditions-character-recordings');
    });

    it('should update criteria when preset changes', () => {
      setPreset('auditions-character-recordings');
      const criteria = get(currentCriteria);

      expect(criteria).toBeDefined();
      expect(criteria.sampleRate).toEqual([48000]);
      expect(criteria.bitDepth).toEqual([16]);
    });
  });

  describe('Derived Stores', () => {
    it('hasValidPresetConfig should be false when no preset selected', () => {
      setPreset('none');
      expect(get(hasValidPresetConfig)).toBe(false);
    });

    it('hasValidPresetConfig should be true for non-custom presets', () => {
      setPreset('auditions-character-recordings');
      expect(get(hasValidPresetConfig)).toBe(true);
    });

    it('hasValidPresetConfig should be false for custom preset without criteria', () => {
      setPreset('custom');
      // Don't set any custom criteria
      expect(get(hasValidPresetConfig)).toBe(false);
    });
  });
});
```

**Test Coverage Checklist:**
- [ ] Preset selection and updates
- [ ] Criteria updates for each preset
- [ ] Custom preset validation logic
- [ ] Derived store calculations (hasValidPresetConfig)
- [ ] LocalStorage persistence (if applicable)
- [ ] Reset/clear functionality

**Files to Create:**
```
tests/stores/
├── settings.test.ts
├── analysisMode.test.ts
├── auth.test.ts
├── tabs.test.ts
└── threeHourSettings.test.ts
```

**Estimated Effort:** 4-6 hours
**Expected Coverage:** 100% (all stores)

---

### 1.2 Validation Testing

**Files to Test:**
```
src/validation/
└── filename-validator.ts  ← All validation logic
```

**Why Critical:**
- Core feature for Two major presets (Three Hour, Bilingual)
- Complex business logic with many edge cases
- High user impact if broken

**Testing Pattern:**
```typescript
// tests/validation/filename-validator.test.ts
import { describe, it, expect } from 'vitest';
import { FilenameValidator } from '../../src/validation/filename-validator';

describe('FilenameValidator - Bilingual Pattern', () => {
  describe('Scripted Conversations', () => {
    it('should pass valid scripted conversation filename', () => {
      const result = FilenameValidator.validateBilingual('CONV001-en-user-U123-agent-A456.wav');
      expect(result.status).toBe('pass');
      expect(result.issue).toBeUndefined();
    });

    it('should fail with invalid language code', () => {
      const result = FilenameValidator.validateBilingual('CONV001-zz-user-U123-agent-A456.wav');
      expect(result.status).toBe('fail');
      expect(result.issue).toContain('language code');
    });

    it('should fail with missing conversation ID', () => {
      const result = FilenameValidator.validateBilingual('-en-user-U123-agent-A456.wav');
      expect(result.status).toBe('fail');
    });

    it('should handle all valid language codes', () => {
      const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'];

      validLanguages.forEach(lang => {
        const result = FilenameValidator.validateBilingual(`CONV001-${lang}-user-U123-agent-A456.wav`);
        expect(result.status).toBe('pass');
      });
    });
  });

  describe('Unscripted Conversations', () => {
    it('should pass valid SPONTANEOUS filename', () => {
      const result = FilenameValidator.validateBilingual('SPONTANEOUS_042-es-user-U789-agent-A123.wav');
      expect(result.status).toBe('pass');
    });

    it('should fail SPONTANEOUS without number', () => {
      const result = FilenameValidator.validateBilingual('SPONTANEOUS-es-user-U789-agent-A123.wav');
      expect(result.status).toBe('fail');
    });
  });

  describe('Edge Cases', () => {
    it('should handle filenames without extension', () => {
      const result = FilenameValidator.validateBilingual('CONV001-en-user-U123-agent-A456');
      // Should still validate the pattern regardless of extension
      expect(result.status).toBe('pass');
    });

    it('should handle mixed case', () => {
      const result = FilenameValidator.validateBilingual('conv001-EN-user-u123-agent-a456.wav');
      expect(result.status).toBe('pass');
    });
  });
});

describe('FilenameValidator - Three Hour', () => {
  const mockScriptsList = ['Script_001', 'Script_002', 'Recording_A'];

  it('should pass when script exists in list', () => {
    const result = FilenameValidator.validateThreeHour(
      'Script_001_SP001.wav',
      mockScriptsList,
      'SP001'
    );
    expect(result.status).toBe('pass');
  });

  it('should fail when script not in list', () => {
    const result = FilenameValidator.validateThreeHour(
      'Script_999_SP001.wav',
      mockScriptsList,
      'SP001'
    );
    expect(result.status).toBe('fail');
    expect(result.issue).toContain('script');
  });

  it('should fail when speaker ID mismatches', () => {
    const result = FilenameValidator.validateThreeHour(
      'Script_001_SP999.wav',
      mockScriptsList,
      'SP001'
    );
    expect(result.status).toBe('fail');
    expect(result.issue).toContain('speaker ID');
  });

  it('should handle empty scripts list', () => {
    const result = FilenameValidator.validateThreeHour(
      'Script_001_SP001.wav',
      [],
      'SP001'
    );
    expect(result.status).toBe('fail');
  });
});
```

**Test Coverage Checklist:**
- [ ] Bilingual: All valid patterns (scripted, unscripted)
- [ ] Bilingual: All language codes
- [ ] Bilingual: All invalid patterns
- [ ] Three Hour: Script matching
- [ ] Three Hour: Speaker ID validation
- [ ] Three Hour: Edge cases (empty lists, mismatches)
- [ ] General: Filename sanitization
- [ ] General: Extension handling

**Files to Create:**
```
tests/validation/
└── filename-validator.test.ts
```

**Estimated Effort:** 3-4 hours
**Expected Coverage:** 90%+

---

### 1.3 Google Drive API Testing

**Files to Test:**
```
src/services/
└── google-drive-api.ts  ← URL parsing, smart downloads, metadata
```

**Why Critical:**
- Second most used file source (after local files)
- Complex download optimization logic
- URL parsing is error-prone

**Testing Pattern:**
```typescript
// tests/services/google-drive-api.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoogleDriveAPI } from '../../src/services/google-drive-api';

describe('GoogleDriveAPI', () => {
  let mockGoogleAuth;
  let api;

  beforeEach(() => {
    mockGoogleAuth = {
      downloadFile: vi.fn(),
      downloadFileHeaders: vi.fn(),
      getFileMetadata: vi.fn(),
      listAudioFilesInFolder: vi.fn(),
      getValidToken: vi.fn().mockResolvedValue({ access_token: 'test-token' })
    };
    api = new GoogleDriveAPI(mockGoogleAuth);
  });

  describe('URL Parsing', () => {
    it('should parse /file/d/{id}/view format', () => {
      const result = api.parseUrl('https://drive.google.com/file/d/ABC123/view');
      expect(result).toEqual({ id: 'ABC123', type: 'file' });
    });

    it('should parse /file/d/{id} format (no /view)', () => {
      const result = api.parseUrl('https://drive.google.com/file/d/ABC123');
      expect(result).toEqual({ id: 'ABC123', type: 'file' });
    });

    it('should parse folder URL', () => {
      const result = api.parseUrl('https://drive.google.com/drive/folders/FOLDER123');
      expect(result).toEqual({ id: 'FOLDER123', type: 'folder' });
    });

    it('should parse /open?id={id} format', () => {
      const result = api.parseUrl('https://drive.google.com/open?id=ABC123');
      expect(result).toEqual({ id: 'ABC123', type: 'file' });
    });

    it('should throw error for invalid URL', () => {
      expect(() => api.parseUrl('https://example.com/not-a-drive-url')).toThrow('Not a Google Drive URL');
    });

    it('should throw error for URL without ID', () => {
      expect(() => api.parseUrl('https://drive.google.com/file/d/')).toThrow();
    });
  });

  describe('Smart Download Optimization', () => {
    beforeEach(() => {
      mockGoogleAuth.downloadFileHeaders.mockResolvedValue(new Blob(['partial']));
      mockGoogleAuth.downloadFile.mockResolvedValue(new File(['full'], 'test.wav'));
      mockGoogleAuth.getFileMetadata.mockResolvedValue({
        name: 'test.wav',
        size: 1000000,
        mimeType: 'audio/wav'
      });
    });

    it('should use partial download for WAV in audio-only mode', async () => {
      await api.downloadFile('ABC123', {
        mode: 'audio-only',
        filename: 'test.wav'
      });

      expect(mockGoogleAuth.downloadFileHeaders).toHaveBeenCalled();
      expect(mockGoogleAuth.downloadFile).not.toHaveBeenCalled();
    });

    it('should use partial download for WAV in full mode', async () => {
      await api.downloadFile('ABC123', {
        mode: 'full',
        filename: 'test.wav'
      });

      expect(mockGoogleAuth.downloadFileHeaders).toHaveBeenCalled();
      expect(mockGoogleAuth.downloadFile).not.toHaveBeenCalled();
    });

    it('should use full download for WAV in experimental mode', async () => {
      await api.downloadFile('ABC123', {
        mode: 'experimental',
        filename: 'test.wav'
      });

      expect(mockGoogleAuth.downloadFile).toHaveBeenCalled();
      expect(mockGoogleAuth.downloadFileHeaders).not.toHaveBeenCalled();
    });

    it('should use full download for MP3 (any mode)', async () => {
      mockGoogleAuth.getFileMetadata.mockResolvedValue({
        name: 'test.mp3',
        size: 1000000,
        mimeType: 'audio/mpeg'
      });

      await api.downloadFile('ABC123', {
        mode: 'audio-only',
        filename: 'test.mp3'
      });

      expect(mockGoogleAuth.downloadFile).toHaveBeenCalled();
      expect(mockGoogleAuth.downloadFileHeaders).not.toHaveBeenCalled();
    });

    it('should attach actualSize property to partial downloads', async () => {
      const file = await api.downloadFile('ABC123', {
        mode: 'audio-only',
        filename: 'test.wav'
      });

      expect(file.actualSize).toBe(1000000);
      expect(file.size).toBeLessThan(1000000); // Blob size is smaller
    });
  });

  describe('Folder Operations', () => {
    it('should list audio files in folder', async () => {
      const mockFiles = [
        { id: '1', name: 'audio1.wav', mimeType: 'audio/wav' },
        { id: '2', name: 'audio2.mp3', mimeType: 'audio/mpeg' }
      ];
      mockGoogleAuth.listAudioFilesInFolder.mockResolvedValue(mockFiles);

      const files = await api.listAudioFilesInFolder('FOLDER123');

      expect(mockGoogleAuth.listAudioFilesInFolder).toHaveBeenCalledWith('FOLDER123');
      expect(files).toEqual(mockFiles);
    });
  });

  describe('Metadata Operations', () => {
    it('should get file metadata', async () => {
      const mockMetadata = {
        id: 'ABC123',
        name: 'test.wav',
        size: 1000000
      };
      mockGoogleAuth.getFileMetadata.mockResolvedValue(mockMetadata);

      const metadata = await api.getFileMetadata('ABC123');

      expect(metadata).toEqual(mockMetadata);
    });

    it('should get metadata from URL', async () => {
      mockGoogleAuth.getFileMetadata.mockResolvedValue({
        id: 'ABC123',
        name: 'test.wav'
      });

      await api.getFileMetadataFromUrl('https://drive.google.com/file/d/ABC123/view');

      expect(mockGoogleAuth.getFileMetadata).toHaveBeenCalled();
    });

    it('should throw error for folder URL in getFileMetadataFromUrl', async () => {
      await expect(
        api.getFileMetadataFromUrl('https://drive.google.com/drive/folders/FOLDER123')
      ).rejects.toThrow('folder');
    });
  });
});
```

**Test Coverage Checklist:**
- [ ] URL parsing: All formats (file, folder, /open?id=)
- [ ] URL parsing: Error cases
- [ ] Smart downloads: WAV optimization logic
- [ ] Smart downloads: Full download scenarios
- [ ] Smart downloads: actualSize property
- [ ] Folder operations: List files
- [ ] Metadata operations: Get metadata
- [ ] Error handling

**Files to Create:**
```
tests/services/
└── google-drive-api.test.ts
```

**Estimated Effort:** 4-6 hours
**Expected Coverage:** 80%+

---

### 1.4 Format Utils Testing

**Files to Test:**
```
src/utils/
└── format-utils.ts  ← Pure formatting functions
```

**Why Critical:**
- Pure functions (easy to test)
- Used throughout the application
- Quick wins for coverage

**Testing Pattern:**
```typescript
// tests/utils/format-utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatDuration, formatFileSize, formatSampleRate } from '../../src/utils/format-utils';

describe('formatDuration', () => {
  it('should format seconds to mm:ss', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(125)).toBe('2:05');
  });

  it('should format hours correctly', () => {
    expect(formatDuration(3665)).toBe('1:01:05');
  });

  it('should handle zero', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('should handle decimals', () => {
    expect(formatDuration(65.7)).toBe('1:05');
  });
});

describe('formatFileSize', () => {
  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('should format KB', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  it('should format MB', () => {
    expect(formatFileSize(2097152)).toBe('2.0 MB');
  });
});
```

**Files to Create:**
```
tests/utils/
└── format-utils.test.ts
```

**Estimated Effort:** 1-2 hours
**Expected Coverage:** 100%

---

## Phase 2: Components & Services

### 2.1 Component Testing Strategy

**Svelte 5 Testing Setup:**
```typescript
import { render, screen } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import { vi } from 'vitest';
```

**Component Testing Priority:**

**Tier 1 (Critical):**
1. `SettingsTab.svelte` - Configuration management
2. `ResultsTable.svelte` - Core results display
3. `ResultsDisplay.svelte` - Results orchestration

**Tier 2 (Important):**
4. `LocalFileTab.svelte` - Most used tab
5. `GoogleDriveTab.svelte` - Second most used
6. `BoxTab.svelte` - Third most used

**Tier 3 (Nice to have):**
7. `App.svelte` - Integration test
8. `TabNavigation.svelte` - Simple component
9. `ErrorDisplay.svelte` - Simple component

**Component Test Template:**
```typescript
// tests/components/SettingsTab.test.ts
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import SettingsTab from '../../src/components/SettingsTab.svelte';

// Mock stores
vi.mock('../../src/stores/settings', () => ({
  currentPresetId: { subscribe: vi.fn() },
  setPreset: vi.fn(),
  // ... other exports
}));

describe('SettingsTab', () => {
  it('should render preset selector', () => {
    render(SettingsTab);
    expect(screen.getByLabelText(/preset/i)).toBeInTheDocument();
  });

  it('should call setPreset when preset is changed', async () => {
    const { setPreset } = await import('../../src/stores/settings');
    render(SettingsTab);

    const select = screen.getByLabelText(/preset/i);
    await userEvent.selectOptions(select, 'auditions-character-recordings');

    expect(setPreset).toHaveBeenCalledWith('auditions-character-recordings');
  });
});
```

**Estimated Effort:** 12-16 hours for all priority components

---

### 2.2 Auth Services Testing

**Box Auth & Google Auth:**
- Focus on testable methods (token validation, parsing)
- Mock browser APIs (localStorage, window.location)
- Accept that OAuth redirects can't be fully unit tested
- Consider E2E tests for full OAuth flows

**Target Coverage:** 70% (up from 32.88% and 0%)

**Estimated Effort:** 4-6 hours

---

## Testing Best Practices

### 1. Test Structure
```typescript
describe('Module/Component Name', () => {
  describe('Feature/Method Name', () => {
    it('should do X when Y', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### 2. Mock Strategy
```typescript
// Good: Mock at module level
vi.mock('../../src/services/api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test' })
}));

// Bad: Don't mock Svelte stores directly, use store methods
```

### 3. Test Naming
- ✅ "should return error when input is invalid"
- ❌ "test error case"
- ✅ "should call analyzeFile with correct parameters"
- ❌ "analyzeFile test"

### 4. Cleanup
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
```

---

## Coverage Measurement

### Running Coverage Reports
```bash
# Full coverage report
npm run test:coverage

# Watch mode with coverage
npm run test:coverage -- --watch

# Coverage for specific file
npm run test:coverage -- filename-validator
```

### Coverage Goals by Module Type

| Module Type | Target Coverage | Rationale |
|-------------|----------------|-----------|
| Stores | 100% | Pure logic, critical |
| Validation | 90%+ | Business logic |
| Services | 80%+ | Some methods hard to test |
| Components | 70%+ | UI has limitations |
| Utils | 100% | Pure functions |
| Auth | 70% | OAuth flows hard to test |

---

## What NOT to Test

### 1. Third-Party Libraries
Don't test Svelte internals, Web Audio API, or external SDKs.

### 2. Trivial Code
Don't test simple getters/setters or pass-through functions.

### 3. Implementation Details
Don't test internal state that users can't observe.

### 4. OAuth Redirects
Full OAuth flows need E2E tests, not unit tests.

---

## Continuous Integration

### GitHub Actions Configuration
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:run

      - name: Run coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

---

## Maintenance Strategy

### When to Update Tests

**Always update tests when:**
- Changing business logic
- Modifying API contracts
- Fixing bugs (add regression test)
- Adding features

**Consider updating when:**
- Refactoring (if behavior changes)
- Improving error messages
- Optimizing performance

### Test Smells to Avoid

❌ **Brittle tests** - Break when implementation changes but behavior doesn't
❌ **Slow tests** - Take >100ms (mock network calls!)
❌ **Flaky tests** - Pass/fail randomly (fix immediately)
❌ **Unclear tests** - Hard to understand what's being tested
❌ **Duplicate tests** - Same thing tested multiple ways

---

## Success Metrics

### Phase 1 (Short Term)
- [ ] 729 → 800+ tests
- [ ] 17.66% → 45% coverage
- [ ] All stores at 100%
- [ ] Validation at 90%+
- [ ] Google Drive API at 80%+

### Phase 2 (Medium Term)
- [ ] 800 → 900+ tests
- [ ] 45% → 65% coverage
- [ ] Top 3 components at 70%+
- [ ] Auth services at 70%+

### Phase 3 (Long Term)
- [ ] 900+ tests
- [ ] 65% → 75%+ coverage
- [ ] All priority components at 70%+
- [ ] Zero flaky tests
- [ ] <30 seconds test suite runtime

---

## Conclusion

This testing strategy provides a clear, actionable path to improve coverage from 17.66% to 75%+ over 3-6 months. The phased approach ensures we focus on high-impact areas first (stores, validation, services) before moving to lower-priority components.

**Key Takeaways:**
1. **Stores first** - Highest ROI, lowest effort
2. **Business logic second** - Validation and services
3. **Components last** - Lower defect risk, higher test complexity
4. **75-80% is the goal** - Diminishing returns beyond this
5. **Maintainability matters** - Every test has a cost

---

## Next Steps

1. **Phase 1 Week 1:** Store tests (settings, analysisMode, auth, tabs, threeHourSettings)
2. **Phase 1 Week 2:** Validation + Google Drive API + format-utils
3. **Phase 2 Month 1:** Top 3 components (SettingsTab, ResultsTable, ResultsDisplay)
4. **Phase 2 Month 2:** Tab components + auth services
5. **Phase 3:** Remaining components + edge cases

---

**Maintained by:** @vibingwithtom
**Last Updated:** January 13, 2025
**Related Docs:**
- `TESTING_ANALYSIS.md` - Detailed analysis of current state
- `Archive_COMPREHENSIVE_TEST_PLAN.md` - Historical test plan
- `Archive_TEST_COVERAGE_STATUS.md` - Historical coverage tracking
