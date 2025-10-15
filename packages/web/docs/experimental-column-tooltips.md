# Experimental Analysis Column Tooltips

Recommended tooltip text for each column header in the experimental analysis table.

## Column Tooltips

### Peak Level
**Tooltip:** "Highest audio level in the file measured in dB. Indicates how close the audio is to digital clipping (0 dB)."

### Normalization
**Tooltip:** "Checks if audio is normalized to -6.0 dB target. Normalized audio has consistent volume levels for better playback."

### Noise Floor (Old)
**Tooltip:** "Background noise level using RMS analysis of quietest 20% of audio. Lower values indicate cleaner recordings."

### Noise Floor (New)
**Tooltip:** "Background noise level using histogram-based analysis to find the most common quiet level. More accurate than old method."

### Reverb (RT60)
**Tooltip:** "Room reverberation time (RT60) - how long it takes for sound to decay by 60 dB. Lower values indicate less room echo."

### Silence
**Tooltip:** "Detects silence at beginning (lead), end (trail), and longest gap within the recording. Helps identify editing issues."

### Stereo Separation
**Tooltip:** "Identifies stereo type: True Stereo (different content per channel), Conversational Stereo (one speaker per channel), or Mono-as-Stereo (identical channels)."

### Speech Overlap
**Tooltip:** "Percentage of time both speakers talk simultaneously. Only applies to Conversational Stereo files. Lower is better (< 5% ideal)."

### Channel Consistency
**Tooltip:** "Verifies speakers stay in same channels throughout recording. Detects if speakers switch channels mid-recording. Only applies to Conversational Stereo files."

### Mic Bleed
**Tooltip:** "Detects audio leakage from one microphone into another. Only meaningful for Conversational Stereo recordings. Lower separation values indicate more bleed."

---

## Implementation Notes

- Tooltips should appear on `<th>` elements using the `title` attribute
- Keep tooltips concise but informative (1-2 sentences)
- Use consistent terminology with the documentation
- For conversational audio columns, clarify they only apply to Conversational Stereo files
- Include ideal/target values where applicable (e.g., "< 5% ideal" for overlap)
