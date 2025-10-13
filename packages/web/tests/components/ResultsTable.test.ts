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
      duration: 120,
      fileSize: 123456
    },
    {
      filename: 'test2.wav',
      status: 'fail',
      sampleRate: 44100,
      bitDepth: 24,
      channels: 1,
      duration: 60,
      fileSize: 234567
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

      expect(screen.getByText('test1.wav')).toBeTruthy();
      expect(screen.getByText(/48000/)).toBeTruthy();
      expect(screen.getByText(/16.*bit/i)).toBeTruthy();
    });

    it('should show audio player for single file', () => {
      render(ResultsTable, {
        props: {
          results: [mockResults[0]],
          mode: 'single'
        }
      });

      expect(screen.queryByRole('audio')).toBeTruthy();
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

      expect(screen.getByText('test1.wav')).toBeTruthy();
      expect(screen.getByText('test2.wav')).toBeTruthy();
    });

    it('should display summary statistics', () => {
      render(ResultsTable, {
        props: {
          results: mockResults,
          mode: 'batch'
        }
      });

      expect(screen.getByText(/2.*files/i)).toBeTruthy();
      expect(screen.getByText(/1.*passed/i)).toBeTruthy();
      expect(screen.getByText(/1.*failed/i)).toBeTruthy();
    });

    it('should not show audio player in batch mode', () => {
      render(ResultsTable, {
        props: {
          results: mockResults,
          mode: 'batch'
        }
      });

      expect(screen.queryByRole('audio')).toBeFalsy();
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

      expect(screen.queryByText(/noise floor/i)).toBeFalsy();
      expect(screen.queryByText(/peak level/i)).toBeFalsy();
    });
  });
});
