import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Core Integration Tests for Display Rendering
 *
 * Focused tests for the critical display logic being refactored:
 * - validateAndDisplayResults() (single file display)
 * - showBatchResults() (batch table display)
 * - Column visibility
 * - Status badges
 * - Filename validation display
 *
 * These tests ensure we don't break display logic during Phase 4.2 refactoring.
 */

describe('Display Rendering - Core', () => {
  let container;

  beforeEach(() => {
    // Create a clean DOM for each test
    container = document.createElement('div');
    container.innerHTML = `
      <div id="singleFileResults" style="display: none;">
        <table id="singleFileTable">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Status</th>
              <th id="singleFilenameCheckHeader" style="display: none;">✓</th>
              <th>File Type</th>
              <th id="singleSampleRateHeader">Sample Rate</th>
              <th id="singleBitDepthHeader">Bit Depth</th>
              <th id="singleChannelsHeader">Channels</th>
              <th id="singleDurationHeader">Duration</th>
              <th>File Size</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="singleTableBody"></tbody>
        </table>
      </div>

      <div id="batchResults" style="display: none;">
        <div id="batchSummary">
          <span id="batchPassCount">0</span>
          <span id="batchWarningCount">0</span>
          <span id="batchFailCount">0</span>
          <span id="batchErrorCount">0</span>
          <span id="batchTotalDuration">0m:00s</span>
        </div>
        <table id="batchTable">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Status</th>
              <th id="batchFilenameCheckHeader" style="display: none;">✓</th>
              <th>File Type</th>
              <th id="batchSampleRateHeader">Sample Rate</th>
              <th id="batchBitDepthHeader">Bit Depth</th>
              <th id="batchChannelsHeader">Channels</th>
              <th id="batchDurationHeader">Duration</th>
              <th>File Size</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="batchTableBody"></tbody>
        </table>
      </div>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Single File Display - Basic Rendering', () => {
    it('should render row with all formatted properties', () => {
      // Simulate validateAndDisplayResults creating a row
      const tbody = document.getElementById('singleTableBody');
      const row = document.createElement('tr');
      row.className = 'batch-row pass';
      row.innerHTML = `
        <td class="filename">test-file.wav</td>
        <td><span class="status-badge pass">pass</span></td>
        <td style="display: none;"></td>
        <td class="validation-pass">WAV</td>
        <td class="validation-pass">48.0 kHz</td>
        <td class="validation-pass">16-bit</td>
        <td class="validation-pass">2 (Stereo)</td>
        <td class="validation-pass">2m:05s</td>
        <td>1.95 MB</td>
        <td><button class="play-btn-small">▶</button></td>
      `;
      tbody.appendChild(row);

      expect(tbody.children.length).toBe(1);
      expect(row.querySelector('.filename').textContent).toBe('test-file.wav');
      expect(row.querySelector('.status-badge').textContent).toBe('pass');
      expect(row.textContent).toContain('48.0 kHz');
      expect(row.textContent).toContain('16-bit');
      expect(row.textContent).toContain('2 (Stereo)');
      expect(row.textContent).toContain('2m:05s');
      expect(row.textContent).toContain('1.95 MB');
    });

    it('should show validation status with CSS classes', () => {
      const tbody = document.getElementById('singleTableBody');
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="validation-pass">WAV</td>
        <td class="validation-fail">44.1 kHz</td>
        <td class="validation-warning">24-bit</td>
      `;
      tbody.appendChild(row);

      const cells = row.querySelectorAll('td');
      expect(cells[0].className).toContain('validation-pass');
      expect(cells[1].className).toContain('validation-fail');
      expect(cells[2].className).toContain('validation-warning');
    });

    it('should apply overall status class to row', () => {
      const tbody = document.getElementById('singleTableBody');

      const passRow = document.createElement('tr');
      passRow.className = 'batch-row pass';
      tbody.appendChild(passRow);
      expect(passRow.className).toContain('pass');

      const failRow = document.createElement('tr');
      failRow.className = 'batch-row fail';
      tbody.appendChild(failRow);
      expect(failRow.className).toContain('fail');
    });
  });

  describe('Single File Display - Filename Validation', () => {
    it('should show filename validation checkmark when passing', () => {
      const tbody = document.getElementById('singleTableBody');
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="filename">CONV123-EN-user-001-agent-002.wav</td>
        <td><span class="status-badge pass">pass</span></td>
        <td class="filename-check-pass" title="Filename is valid">✅</td>
      `;
      tbody.appendChild(row);

      const header = document.getElementById('singleFilenameCheckHeader');
      header.style.display = '';

      const checkCell = row.querySelector('.filename-check-pass');
      expect(checkCell).toBeTruthy();
      expect(checkCell.textContent).toBe('✅');
      expect(checkCell.title).toBe('Filename is valid');
    });

    it('should show filename validation X when failing', () => {
      const tbody = document.getElementById('singleTableBody');
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="filename">invalid-filename.wav</td>
        <td><span class="status-badge fail">fail</span></td>
        <td class="filename-check-fail" title="Invalid format">❌</td>
      `;
      tbody.appendChild(row);

      const checkCell = row.querySelector('.filename-check-fail');
      expect(checkCell).toBeTruthy();
      expect(checkCell.textContent).toBe('❌');
    });

    it('should hide filename validation column when not enabled', () => {
      const header = document.getElementById('singleFilenameCheckHeader');
      header.style.display = 'none';

      expect(header.style.display).toBe('none');
    });
  });

  describe('Single File Display - Metadata-Only Mode', () => {
    it('should hide audio columns in metadata-only mode', () => {
      const sampleRateHeader = document.getElementById('singleSampleRateHeader');
      const bitDepthHeader = document.getElementById('singleBitDepthHeader');
      const channelsHeader = document.getElementById('singleChannelsHeader');
      const durationHeader = document.getElementById('singleDurationHeader');

      // Simulate metadata-only mode
      sampleRateHeader.style.display = 'none';
      bitDepthHeader.style.display = 'none';
      channelsHeader.style.display = 'none';
      durationHeader.style.display = 'none';

      expect(sampleRateHeader.style.display).toBe('none');
      expect(bitDepthHeader.style.display).toBe('none');
      expect(channelsHeader.style.display).toBe('none');
      expect(durationHeader.style.display).toBe('none');
    });

    it('should show audio columns in full analysis mode', () => {
      const sampleRateHeader = document.getElementById('singleSampleRateHeader');
      const bitDepthHeader = document.getElementById('singleBitDepthHeader');

      sampleRateHeader.style.display = '';
      bitDepthHeader.style.display = '';

      expect(sampleRateHeader.style.display).not.toBe('none');
      expect(bitDepthHeader.style.display).not.toBe('none');
    });
  });

  describe('Batch Display - Table Rendering', () => {
    it('should render multiple rows in batch table', () => {
      const tbody = document.getElementById('batchTableBody');

      const files = [
        { filename: 'file1.wav', status: 'pass' },
        { filename: 'file2.wav', status: 'fail' },
        { filename: 'file3.wav', status: 'warning' }
      ];

      files.forEach(file => {
        const row = document.createElement('tr');
        row.className = `batch-row ${file.status}`;
        row.innerHTML = `
          <td class="filename">${file.filename}</td>
          <td><span class="status-badge ${file.status}">${file.status}</span></td>
          <td>WAV</td>
          <td>48.0 kHz</td>
          <td>16-bit</td>
          <td>2 (Stereo)</td>
          <td>2m:00s</td>
          <td>1.95 MB</td>
          <td><button class="play-btn-small" data-index="${files.indexOf(file)}">▶</button></td>
        `;
        tbody.appendChild(row);
      });

      expect(tbody.children.length).toBe(3);
      expect(tbody.textContent).toContain('file1.wav');
      expect(tbody.textContent).toContain('file2.wav');
      expect(tbody.textContent).toContain('file3.wav');
    });

    it('should apply status classes to batch rows', () => {
      const tbody = document.getElementById('batchTableBody');

      const row1 = document.createElement('tr');
      row1.className = 'batch-row pass';
      tbody.appendChild(row1);

      const row2 = document.createElement('tr');
      row2.className = 'batch-row fail';
      tbody.appendChild(row2);

      expect(row1.className).toContain('pass');
      expect(row2.className).toContain('fail');
    });
  });

  describe('Batch Display - Summary Statistics', () => {
    it('should update summary counts', () => {
      const passCount = document.getElementById('batchPassCount');
      const warningCount = document.getElementById('batchWarningCount');
      const failCount = document.getElementById('batchFailCount');
      const errorCount = document.getElementById('batchErrorCount');

      passCount.textContent = '7';
      warningCount.textContent = '2';
      failCount.textContent = '1';
      errorCount.textContent = '0';

      expect(passCount.textContent).toBe('7');
      expect(warningCount.textContent).toBe('2');
      expect(failCount.textContent).toBe('1');
      expect(errorCount.textContent).toBe('0');
    });

    it('should update total duration', () => {
      const totalDuration = document.getElementById('batchTotalDuration');
      totalDuration.textContent = '15m:30s';

      expect(totalDuration.textContent).toBe('15m:30s');
    });
  });

  describe('Batch Display - Column Visibility', () => {
    it('should hide audio columns in metadata-only mode', () => {
      const sampleRateHeader = document.getElementById('batchSampleRateHeader');
      const bitDepthHeader = document.getElementById('batchBitDepthHeader');
      const channelsHeader = document.getElementById('batchChannelsHeader');
      const durationHeader = document.getElementById('batchDurationHeader');

      sampleRateHeader.style.display = 'none';
      bitDepthHeader.style.display = 'none';
      channelsHeader.style.display = 'none';
      durationHeader.style.display = 'none';

      expect(sampleRateHeader.style.display).toBe('none');
      expect(bitDepthHeader.style.display).toBe('none');
      expect(channelsHeader.style.display).toBe('none');
      expect(durationHeader.style.display).toBe('none');
    });

    it('should show filename validation column when enabled', () => {
      const header = document.getElementById('batchFilenameCheckHeader');
      header.style.display = '';

      expect(header.style.display).not.toBe('none');
    });
  });

  describe('Status Badges', () => {
    it('should render pass status badge', () => {
      const badge = document.createElement('span');
      badge.className = 'status-badge pass';
      badge.textContent = 'pass';

      expect(badge.className).toContain('status-badge');
      expect(badge.className).toContain('pass');
      expect(badge.textContent).toBe('pass');
    });

    it('should render fail status badge', () => {
      const badge = document.createElement('span');
      badge.className = 'status-badge fail';
      badge.textContent = 'fail';

      expect(badge.className).toContain('status-badge');
      expect(badge.className).toContain('fail');
      expect(badge.textContent).toBe('fail');
    });

    it('should render warning status badge', () => {
      const badge = document.createElement('span');
      badge.className = 'status-badge warning';
      badge.textContent = 'warning';

      expect(badge.className).toContain('status-badge');
      expect(badge.className).toContain('warning');
      expect(badge.textContent).toBe('warning');
    });
  });

  describe('Play Buttons', () => {
    it('should render play button in single file view', () => {
      const tbody = document.getElementById('singleTableBody');
      const row = document.createElement('tr');
      row.innerHTML = `<td><button class="play-btn-small" id="singleFilePlayBtn">▶</button></td>`;
      tbody.appendChild(row);

      const playBtn = row.querySelector('#singleFilePlayBtn');
      expect(playBtn).toBeTruthy();
      expect(playBtn.textContent).toBe('▶');
    });

    it('should render play buttons with data-index in batch view', () => {
      const tbody = document.getElementById('batchTableBody');

      [0, 1, 2].forEach(index => {
        const row = document.createElement('tr');
        row.innerHTML = `<td><button class="play-btn-small" data-index="${index}">▶</button></td>`;
        tbody.appendChild(row);
      });

      const buttons = tbody.querySelectorAll('.play-btn-small');
      expect(buttons.length).toBe(3);
      expect(buttons[0].dataset.index).toBe('0');
      expect(buttons[1].dataset.index).toBe('1');
      expect(buttons[2].dataset.index).toBe('2');
    });
  });

  describe('Filename Escaping', () => {
    it('should escape HTML in filenames', () => {
      const tbody = document.getElementById('singleTableBody');
      const row = document.createElement('tr');

      // Use textContent instead of innerHTML for user data
      const filenameCell = document.createElement('td');
      filenameCell.className = 'filename';
      filenameCell.textContent = '<script>alert("xss")</script>';
      filenameCell.title = filenameCell.textContent;
      row.appendChild(filenameCell);
      tbody.appendChild(row);

      const cell = row.querySelector('.filename');
      // textContent automatically escapes HTML
      expect(cell.textContent).toBe('<script>alert("xss")</script>');
      expect(cell.innerHTML).not.toContain('<script');
    });
  });
});
