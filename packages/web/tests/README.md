# Audio Analyzer Test Suite

This directory contains comprehensive tests for the Audio Analyzer web application.

## Test Organization

### Unit Tests (`tests/unit/`)

**Phase 2 Tests - Business Logic:**

1. **filename-validation-bilingual.test.js** - Bilingual filename validation
   - Regular format: `[ConversationID]-[LanguageCode]-user-[UserID]-agent-[AgentID].wav`
   - Spontaneous format: `SPONTANEOUS_[number]-[LanguageCode]-user-[UserID]-agent-[AgentID].wav`
   - Covers ~150 lines of validation logic

2. **filename-validation-three-hour.test.js** - Three Hour filename validation
   - Format: `[ScriptName]_[SpeakerID].wav`
   - Script matching against folder contents
   - Covers ~30 lines of validation logic

3. **criteria-validation.test.js** - Audio criteria validation
   - File type, sample rate, bit depth, channels, duration
   - Uses CriteriaValidator from @audio-analyzer/core
   - Covers ~200 lines of validation logic

4. **file-type-detection.test.js** - File type detection from filename
   - Extension mapping for WAV, MP3, FLAC, AAC, M4A, OGG
   - Case insensitivity
   - Covers ~10 lines

5. **result-formatting.test.js** - Result display formatting
   - Duration formatting (seconds → human readable)
   - Property formatting (sample rate, bit depth, channels, file size)
   - Covers ~100 lines of formatting logic

6. **preset-configuration.test.js** - Preset configurations
   - All 8 presets (Auditions, P2B2, Three Hour, Bilingual, etc.)
   - Criteria defaults for each preset
   - Covers ~80 lines of preset logic

7. **overall-status-calculation.test.js** - Overall status calculation
   - Overall status calculation from individual criteria
   - Priority ordering (fail > warning > pass)
   - Metadata-only mode handling
   - Covers ~50 lines of status calculation logic

### Integration Tests (`tests/integration/`)

**Phase 3 Tests - End-to-End Workflows:**

1. **file-processing.test.js** - File processing workflows
   - Local file upload and analysis (metadata-only vs full)
   - Google Drive file processing (auth, download, validation)
   - Box file processing (proxy, auth)
   - Cross-source consistency
   - Progress indication and error handling
   - Edge cases (empty files, unusual formats, very long audio)
   - Covers complete file processing pipeline

2. **batch-processing.test.js** - Batch processing workflows
   - Multiple local file selection and processing
   - Google Drive folder processing
   - Box folder processing
   - Progress tracking and cancellation
   - Summary statistics and result display
   - Large batches (50-100+ files)
   - Error handling (continue on failure)
   - Memory management and performance
   - Covers complete batch processing pipeline

3. **auth-management.test.js** - Authentication workflows
   - Google Drive OAuth (sign in/out, token management)
   - Box OAuth (authentication, token refresh)
   - Independent multi-service auth states
   - Auth-protected features (file/folder access)
   - Error states and recovery (network, API, session expiry)
   - Security considerations (token security, CSRF)
   - Covers complete authentication lifecycle

4. **display-rendering.test.js** - UI rendering and display
   - Single file result display (properties, validation, advanced analysis)
   - Batch results table (columns, sorting, filtering)
   - Validation status badges and indicators
   - Filename validation display
   - Column visibility (metadata-only mode adaptation)
   - Audio player display and controls
   - Responsive design (mobile, tablet, desktop)
   - Accessibility (semantic HTML, keyboard navigation, screen readers)
   - Loading states and error states
   - Covers complete UI rendering pipeline

### Test Helpers (`tests/helpers/`)

- **mock-data.js** - Mock data for tests
  - Mock audio files
  - Mock analysis results
  - Mock validation results
  - Mock filenames

- **test-utils.js** - Test utility functions
  - mockGoogleAuth()
  - mockBoxAuth()
  - mockAudioContext()

### Setup (`tests/setup.js`)

Global test setup for Vitest.

## Running Tests

```bash
# Run all tests
npm run test

# Run tests once (CI mode)
npm run test:run

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

## Current Status

**Phase 1:** ✅ Complete - Test infrastructure set up
**Phase 2:** ✅ Complete - All unit test specifications written (7 test files covering ~620 lines of logic)
**Phase 3:** ✅ Complete - All integration test specifications written (4 test files covering complete workflows)

## Coverage Goals

- Phase 2 Complete: ≥60% code coverage (core logic)
- Phase 3 Complete: ≥70% code coverage (integration)
- Final: ≥75% code coverage

## Implementation Notes

### Test Specifications vs Implementations

All Phase 2 (unit) and Phase 3 (integration) test files are currently **specifications** documenting expected behavior:

**Fully Implemented:**
- `criteria-validation.test.js` - Working tests using `CriteriaValidator` from `@audio-analyzer/core`

**Specifications (pending implementation):**
- All other unit tests (filename validation, file type detection, formatting, presets, status calculation)
- All integration tests (file processing, batch processing, auth, display)

These specifications serve as:
1. **Documentation** of expected behavior and edge cases
2. **Test-driven development guide** for implementation and refactoring
3. **Regression prevention** checklist
4. **Design validation** - writing tests first reveals design issues

### Why Specifications First?

Many functions (filename validation, presets, status calculation, display logic) are embedded in `main.js` and not properly exported for testing. Phase 4 refactoring will:
1. Extract these functions into properly organized, typed modules
2. Export them with clear interfaces
3. Make them testable

Writing test specifications now:
- Documents current behavior before refactoring
- Provides immediate test coverage once modules are extracted
- Ensures refactored code maintains same behavior
- Guides the refactoring process (what needs to be extracted)

### Implementation Path

After Phase 4 refactoring completes:
1. Functions will be properly exported from modules
2. Test specifications can be converted to working tests
3. Run tests to verify refactored code matches original behavior
4. Achieve 70%+ code coverage goal

## Next Steps

1. **Phase 4: Refactor with TypeScript** - Extract functions from main.js into testable TypeScript modules
2. **Implement test specifications** - Convert specifications to working tests as modules are extracted
3. **Achieve 75%+ coverage** - Run coverage reports and fill any gaps
4. **Phase 5: Svelte Migration** - Migrate to component-based architecture with component tests
