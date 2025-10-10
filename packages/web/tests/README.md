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

1. **file-processing.test.js** - TODO
   - Local file upload and analysis
   - Google Drive file processing
   - Box file processing
   - Metadata-only vs full analysis
   - Error handling

2. **batch-processing.test.js** - TODO
   - Multiple file processing
   - Folder processing
   - Progress tracking
   - Cancellation
   - Summary statistics

3. **auth-management.test.js** - TODO
   - Google Drive auth status
   - Box auth status
   - Sign in/out flows
   - Token handling

4. **display-rendering.test.js** - TODO
   - Single file result display
   - Batch results table
   - Validation status badges
   - Column visibility
   - Audio player

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
**Phase 3:** ⬜ Pending - Integration test specifications needed

## Coverage Goals

- Phase 2 Complete: ≥60% code coverage (core logic)
- Phase 3 Complete: ≥70% code coverage (integration)
- Final: ≥75% code coverage

## Implementation Notes

Many test files currently contain specifications (test stubs) that document what needs to be tested. These need to be implemented with actual test logic. The specifications serve as:

1. **Documentation** of expected behavior
2. **Test-driven development guide** for implementation
3. **Regression prevention** checklist

To implement tests:
1. Access the function being tested (may require refactoring in Phase 4)
2. Write actual assertions based on the documented expectations
3. Run tests to verify behavior
4. Achieve green passing tests

## Next Steps

1. **Implement test stubs** - Convert specifications to working tests
2. **Add integration tests** - Complete Phase 3 test specifications
3. **Achieve 70%+ coverage** - Run coverage and fill gaps
4. **Refactor for testability** - Phase 4 will make testing easier
