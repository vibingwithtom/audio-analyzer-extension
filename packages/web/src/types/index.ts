export interface AudioResults {
  filename: string;
  status: 'pass' | 'fail' | 'warning' | 'error';
  sampleRate: number | 'Unknown';
  bitDepth: number | 'Unknown';
  channels: number | 'Unknown';
  duration: number | 'Unknown';
  fileSize: number;
  audioUrl?: string;
  validation?: ValidationResults;
  isMetadataOnly?: boolean;
}

export interface ValidationResult {
  status: 'pass' | 'fail' | 'warning' | 'unknown';
  value: string;
  issue?: string;
}

export interface ValidationResults {
  [key: string]: ValidationResult;
}
