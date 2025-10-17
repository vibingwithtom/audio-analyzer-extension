 Summary of -Infinity Fixes

  I've identified and fixed 3 analysis functions that were vulnerable to the
   -Infinity noise floor bug:

  1. ✅ Silence Detection (already fixed previously)

  - Location: analyzeSilence function, line 235
  - Fallback threshold: -60 dB (typical room noise level)

  2. ✅ Speech Overlap Detection (fixed in this session)

  - Location: analyzeOverlappingSpeech function, line 1216
  - Problem: -Infinity + 20 = -Infinity caused every non-zero sample to be
  treated as active speech
  - Fallback threshold: -40 dB (typical speech level)

  3. ✅ Reverb Analysis (just fixed)

  - Location: estimateReverb function, line 420
  - Problem: -Infinity + 10 = -Infinity caused every peak to be considered
  significant for reverb detection
  - Fallback threshold: -50 dB (peaks above typical room noise)