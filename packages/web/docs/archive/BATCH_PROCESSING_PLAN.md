# Batch Processing Feature Plan

## Overview
Transform Audio Analyzer from single-file processing to intelligent batch processing that can handle hundreds of large audio files (1-2GB each) efficiently using header-only analysis.

## Core Concept: Smart UI Transformation
The UI automatically adapts based on input type:
- **1 file uploaded** → Standard single-file analysis (existing behavior)
- **Multiple files uploaded** → Batch processing mode
- **Google Drive folder URL** → Batch processing mode

No new tabs needed - existing interface becomes more powerful.

## Technical Architecture

### 1. File Processing Strategy

#### Header-Only Analysis (Fast & Memory Efficient)
```javascript
class StreamingAudioAnalyzer {
  async analyzeHeaders(file) {
    // Only read first ~100KB containing metadata
    const headerChunk = file.slice(0, 100 * 1024);
    const arrayBuffer = await headerChunk.arrayBuffer();

    return {
      fileType: this.detectFormat(arrayBuffer),
      sampleRate: this.parseSampleRate(arrayBuffer),
      bitDepth: this.parseBitDepth(arrayBuffer),
      channels: this.parseChannels(arrayBuffer),
      duration: this.calculateDuration(arrayBuffer, file.size),
      fileSize: file.size
    };
  }

  // No need to load full 2GB files into memory
}
```

#### What We Can Extract from Headers
- ✅ **File Format**: WAV, FLAC, MP3, etc. (first 12 bytes)
- ✅ **Sample Rate**: In format header
- ✅ **Bit Depth**: In format header
- ✅ **Channel Count**: In format header
- ✅ **Duration**: Calculated from header + file size
- ✅ **File Size**: File system property

#### What We Skip (Advanced Analysis)
- ❌ Peak levels, noise floor analysis
- ❌ Content-based audio quality metrics
- ❌ Full waveform analysis

### 2. Batch Processing Engine

#### Core Processing Logic
```javascript
class BatchProcessor {
  async processBatch(files, criteria, progressCallback) {
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Quick header analysis
      const analysis = await this.analyzer.analyzeHeaders(file);

      // Apply current validation criteria
      const validation = this.validator.validateResults(analysis, criteria);

      results.push({
        filename: file.name,
        analysis,
        validation,
        status: this.getOverallStatus(validation)
      });

      // Report progress
      progressCallback({
        current: i + 1,
        total: files.length,
        currentFile: file.name,
        percentage: ((i + 1) / files.length) * 100
      });
    }

    return results;
  }

  getOverallStatus(validation) {
    const statuses = Object.values(validation).map(v => v.status);

    if (statuses.includes('fail')) return 'fail';
    if (statuses.includes('warning')) return 'warning';
    return 'pass';
  }
}
```

### 3. Google Drive Batch Support

#### Folder URL Detection and Processing
```javascript
class GoogleDriveBatchProcessor {
  async processFolder(folderUrl, criteria) {
    // Extract folder ID from URL
    const folderId = this.extractFolderIdFromUrl(folderUrl);

    // List all files in folder (recursively)
    const audioFiles = await this.listAudioFilesInFolder(folderId);

    // Process each file (header-only using range requests)
    const results = [];
    for (const file of audioFiles) {
      const headerData = await this.downloadFileHeaders(file.id);
      const analysis = this.analyzer.analyzeHeaders(headerData);
      const validation = this.validator.validateResults(analysis, criteria);

      results.push({ filename: file.name, analysis, validation });
    }

    return results;
  }

  async downloadFileHeaders(fileId) {
    // Use HTTP range request to get only first 100KB
    const response = await gapi.client.drive.files.get({
      fileId,
      headers: { 'Range': 'bytes=0-102400' } // First 100KB only
    });

    return response.body;
  }
}
```

## User Interface Design

### 1. Dynamic UI States

#### Single File Mode (Current - Unchanged)
```
📁 Local Files Tab:
┌─────────────────────────────────────┐
│ [Drop audio file here]              │
│ Or click to browse files            │
│ [Choose File]                       │
└─────────────────────────────────────┘

↓ Analysis

[🎵 Audio Preview]
[Results Grid - 7 properties]
[Validation Legend]
```

#### Batch Mode (New - Automatic)
```
📁 Local Files Tab (47 files):
┌─────────────────────────────────────┐
│ Processing: file_23.wav             │
│ [████████████░░░░░░░░] 65% (31/47)  │
│ [Cancel Processing]                 │
└─────────────────────────────────────┘

↓ Analysis Complete

[📊 Batch Summary Dashboard]
[Results Table - Sortable/Filterable]
[Export Options] [Legend]
```

### 2. Batch Results Interface

#### Summary Dashboard
```javascript
const BatchSummary = ({ results }) => (
  <div className="batch-summary">
    <h3>Batch Analysis Complete: {results.length} files processed</h3>

    <div className="summary-stats">
      <div className="stat-item pass">
        <span className="count">{passCount}</span>
        <span className="label">Pass ({passPercentage}%)</span>
      </div>
      <div className="stat-item warning">
        <span className="count">{warningCount}</span>
        <span className="label">Warnings ({warningPercentage}%)</span>
      </div>
      <div className="stat-item fail">
        <span className="count">{failCount}</span>
        <span className="label">Failed ({failPercentage}%)</span>
      </div>
    </div>

    <div className="batch-meta">
      <span>Total size: {totalSizeGB} GB</span>
      <span>Processing time: {processingTime}s</span>
      <span>Average file size: {avgSizeMB} MB</span>
    </div>
  </div>
);
```

#### Results Table
```javascript
const BatchResultsTable = ({ results, onSort, onFilter }) => (
  <table className="batch-results">
    <thead>
      <tr>
        <th onClick={() => onSort('filename')}>File Name ↕</th>
        <th onClick={() => onSort('status')}>Status ↕</th>
        <th onClick={() => onSort('duration')}>Duration ↕</th>
        <th onClick={() => onSort('format')}>Format ↕</th>
        <th>Issues</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {results.map(result => (
        <BatchResultRow key={result.filename} result={result} />
      ))}
    </tbody>
  </table>
);

const BatchResultRow = ({ result }) => (
  <tr className={`result-row ${result.status}`}>
    <td>{result.filename}</td>
    <td>
      <span className={`status-badge ${result.status}`}>
        {getStatusIcon(result.status)} {result.status}
      </span>
    </td>
    <td>{formatDuration(result.analysis.duration)}</td>
    <td>{formatAudioSpec(result.analysis)}</td>
    <td>{getIssuesSummary(result.validation)}</td>
    <td>
      <button onClick={() => downloadFile(result.filename)}>
        Download
      </button>
    </td>
  </tr>
);
```

### 3. Enhanced File Input

#### Multiple File Detection
```javascript
class FileInputHandler {
  handleFileInput(files) {
    if (files.length === 1) {
      this.processSingleFile(files[0]);
    } else if (files.length > 1) {
      this.processBatchFiles(files);
    }
  }

  handleDragDrop(event) {
    const files = Array.from(event.dataTransfer.files);
    const audioFiles = files.filter(file => this.isAudioFile(file));

    if (audioFiles.length === 0) {
      this.showError('No audio files detected');
      return;
    }

    this.handleFileInput(audioFiles);
  }
}
```

#### Google Drive URL Enhancement
```html
<!-- Current -->
<input type="url" placeholder="https://drive.google.com/file/d/FILE_ID/view">

<!-- Enhanced -->
<input type="url" placeholder="File: https://drive.google.com/file/d/FILE_ID/view
Folder: https://drive.google.com/drive/folders/FOLDER_ID">
```

### 4. Export Functionality

#### CSV Export
```javascript
class BatchExporter {
  exportToCSV(results) {
    const headers = [
      'Filename', 'Status', 'Duration', 'File Type',
      'Sample Rate', 'Bit Depth', 'Channels', 'File Size', 'Issues'
    ];

    const rows = results.map(result => [
      result.filename,
      result.status,
      formatDuration(result.analysis.duration),
      result.analysis.fileType,
      result.analysis.sampleRate,
      result.analysis.bitDepth,
      result.analysis.channels,
      formatFileSize(result.analysis.fileSize),
      getIssuesList(result.validation).join('; ')
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    this.downloadFile('audio_analysis_results.csv', csvContent);
  }

  exportToJSON(results) {
    const exportData = {
      timestamp: new Date().toISOString(),
      totalFiles: results.length,
      summary: this.generateSummary(results),
      results: results
    };

    this.downloadFile(
      'audio_analysis_results.json',
      JSON.stringify(exportData, null, 2)
    );
  }
}
```

## Implementation Phases

### Phase 1: Core Batch Processing (Week 1-2)
**Goal**: Basic multiple file processing with header analysis

**Features**:
- Multiple file input detection
- Header-only audio parsing
- Basic batch results table
- Progress indication

**Deliverables**:
- `BatchProcessor` class
- `StreamingAudioAnalyzer` class
- Enhanced file input handling
- Basic results display

**Testing**:
- 10-50 small audio files locally
- Memory usage validation
- Processing speed benchmarks

### Phase 2: Google Drive Integration (Week 3)
**Goal**: Extend batch processing to Google Drive folders

**Features**:
- Google Drive folder URL detection
- Drive API folder enumeration
- Range request header downloading
- Cloud-based batch processing

**Deliverables**:
- `GoogleDriveBatchProcessor` class
- Enhanced Google Drive URL input
- Cloud file header analysis

**Testing**:
- Google Drive folders with 20+ files
- API rate limiting handling
- Network error resilience

### Phase 3: Professional Results & Export (Week 4)
**Goal**: Professional-grade results interface and export

**Features**:
- Advanced results table (sorting, filtering)
- Summary dashboard with statistics
- CSV/JSON export functionality
- Professional reporting

**Deliverables**:
- `BatchResultsTable` component
- `BatchSummary` component
- `BatchExporter` class
- Export templates

**Testing**:
- Large batches (100+ files)
- Export format validation
- User experience testing

## Performance Considerations

### Memory Management
- **Header-only processing**: Max 100KB per file in memory
- **Streaming results**: Process and release file data immediately
- **No audio content loading**: Avoid loading full 2GB files
- **Garbage collection**: Explicit cleanup of processed data

### Speed Optimization
- **Parallel header parsing**: Process multiple file headers simultaneously
- **Web Workers**: Move heavy parsing to background threads
- **Progressive rendering**: Show results as they're processed
- **Lazy loading**: Only load detailed results when requested

### Error Handling
- **Graceful failures**: Continue processing if individual files fail
- **Network resilience**: Retry failed downloads with exponential backoff
- **Memory limits**: Detect and handle out-of-memory conditions
- **User cancellation**: Allow users to stop long-running batch processes

## Success Metrics

### Performance Targets
- **Processing Speed**: 50+ files analyzed per second (header-only)
- **Memory Usage**: <500MB peak memory for 1000 file batch
- **User Experience**: <3 seconds from file selection to initial results
- **Google Drive**: <10 seconds for 50-file folder analysis

### User Experience Goals
- **Zero learning curve**: Existing users see no interface changes
- **Professional output**: Export-ready validation reports
- **Reliability**: 99%+ success rate for batch processing
- **Scalability**: Handle 500+ file batches without performance degradation

This plan transforms Audio Analyzer into a professional batch validation tool while maintaining the simplicity and reliability that makes the current single-file version successful.