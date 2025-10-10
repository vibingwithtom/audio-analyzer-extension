/**
 * Settings Module - Type Definitions
 *
 * TypeScript interfaces for all application settings including
 * criteria validation, presets, filename validation, and preferences.
 */

/**
 * Audio validation criteria for file properties
 */
export interface AudioCriteria {
  fileType: string[];
  sampleRate: string[];
  bitDepth: string[];
  channels: string[];
  minDuration: string;
}

/**
 * Preset configuration for audio validation
 */
export interface PresetConfig {
  name: string;
  fileType?: string[];
  sampleRate?: string[];
  bitDepth?: string[];
  channels?: string[];
  minDuration?: string;
  supportsFilenameValidation?: boolean;
  filenameValidationType?: 'script-match' | 'bilingual-pattern';
  gdriveOnly?: boolean;
}

/**
 * Map of preset IDs to their configurations
 */
export interface PresetConfigurations {
  'auditions-character-recordings': PresetConfig;
  'auditions-emotional-voice': PresetConfig;
  'character-recordings': PresetConfig;
  'p2b2-pairs-mono': PresetConfig;
  'p2b2-pairs-stereo': PresetConfig;
  'p2b2-pairs-mixed': PresetConfig;
  'three-hour': PresetConfig;
  'bilingual-conversational': PresetConfig;
  'custom': PresetConfig;
  [key: string]: PresetConfig;
}

/**
 * Filename validation settings for Google Drive
 */
export interface FilenameValidationSettings {
  enableAudioAnalysis: boolean;
  enableFilenameValidation: boolean;
  speakerId: string;
  scriptsFolderUrl: string;
}

/**
 * Filename validation settings for Box
 */
export interface BoxFilenameValidationSettings {
  enableAudioAnalysis: boolean;
  enableFilenameValidation: boolean;
}

/**
 * Filename validation settings for Local files
 */
export interface LocalFilenameValidationSettings {
  enableAudioAnalysis: boolean;
  enableFilenameValidation: boolean;
}

/**
 * Main application settings stored in localStorage
 */
export interface AppSettings {
  criteria?: AudioCriteria;
}

/**
 * Storage keys used for localStorage
 */
export const STORAGE_KEYS = {
  SETTINGS: 'audio-analyzer-settings',
  SELECTED_PRESET: 'audio-analyzer-selected-preset',
  FILENAME_VALIDATION: 'audio-analyzer-filename-validation',
  BOX_FILENAME_VALIDATION: 'audio-analyzer-box-filename-validation',
  LOCAL_FILENAME_VALIDATION: 'audio-analyzer-local-filename-validation',
  DARK_MODE: 'darkMode',
  BOX_JUST_AUTHENTICATED: 'box_just_authenticated'
} as const;

/**
 * Default preset configurations
 */
export const DEFAULT_PRESETS: PresetConfigurations = {
  'auditions-character-recordings': {
    name: 'Auditions: Character Recordings',
    fileType: ['wav'],
    sampleRate: ['48000'],
    bitDepth: ['24'],
    channels: ['1'],
    minDuration: '120' // 2 minutes
  },
  'auditions-emotional-voice': {
    name: 'Auditions: Emotional Voice',
    fileType: ['wav'],
    sampleRate: ['48000'],
    bitDepth: ['16', '24'],
    channels: ['1', '2'],
    minDuration: '30'
  },
  'character-recordings': {
    name: 'Character Recordings',
    fileType: ['wav'],
    sampleRate: ['48000'],
    bitDepth: ['24'],
    channels: ['1'],
    minDuration: '' // No requirement
  },
  'p2b2-pairs-mono': {
    name: 'P2B2 Pairs (Mono)',
    fileType: ['wav'],
    sampleRate: ['44100', '48000'],
    bitDepth: ['16', '24'],
    channels: ['1'],
    minDuration: ''
  },
  'p2b2-pairs-stereo': {
    name: 'P2B2 Pairs (Stereo)',
    fileType: ['wav'],
    sampleRate: ['44100', '48000'],
    bitDepth: ['16', '24'],
    channels: ['2'],
    minDuration: ''
  },
  'p2b2-pairs-mixed': {
    name: 'P2B2 Pairs (Mixed)',
    fileType: ['wav'],
    sampleRate: ['44100', '48000'],
    bitDepth: ['16', '24'],
    channels: ['1', '2'],
    minDuration: ''
  },
  'three-hour': {
    name: 'Three Hour',
    fileType: ['wav'],
    sampleRate: ['48000'],
    bitDepth: ['24'],
    channels: ['1'],
    minDuration: '',
    supportsFilenameValidation: true,
    filenameValidationType: 'script-match', // Requires matching .txt script file
    gdriveOnly: true // Only available on Google Drive tab
  },
  'bilingual-conversational': {
    name: 'Bilingual Conversational',
    fileType: ['wav'],
    sampleRate: ['48000'],
    bitDepth: ['16', '24'],
    channels: ['2'],
    minDuration: '',
    supportsFilenameValidation: true,
    filenameValidationType: 'bilingual-pattern' // Validates [ConversationID]-[LangCode]-user-[UserID]-agent-[AgentID]
  },
  'custom': {
    name: 'Custom'
    // Custom allows manual selection of individual criteria
  }
};
