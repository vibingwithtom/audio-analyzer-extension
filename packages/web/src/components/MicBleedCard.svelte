<script lang="ts">
  export let micBleed: any;

  function getMicBleedClass(micBleed: any): string {
    if (!micBleed) return '';
    if (micBleed.percentageConfirmedBleed < 0.5) return 'success';
    return 'warning';
  }
</script>

<style>
  .mic-bleed-card {
    margin-top: 1.5rem;
    padding: 1.5rem;
    background: var(--bg-secondary, #f5f5f5);
    border: 1px solid var(--bg-tertiary, #e0e0e0);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .method-section {
    margin-bottom: 1.5rem;
  }

  .method-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .conclusion {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .detail-item {
    display: flex;
    flex-direction: column;
  }

  .detail-label {
    font-size: 0.875rem;
    color: var(--text-secondary, #666666);
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .detail-value {
    font-size: 1.25rem;
    font-weight: 700;
  }

  .success {
    color: var(--success, #4CAF50);
  }

  .warning {
    color: var(--warning, #ff9800);
  }
</style>

<div class="mic-bleed-card">
  <h3>Mic Bleed Analysis</h3>

  {#if micBleed?.new}
    <div class="method-section">
      <h4 class="method-title">New Method</h4>
      <div class="conclusion {getMicBleedClass(micBleed.new)}">
        {micBleed.new.percentageConfirmedBleed > 0.5 ? 'Mic bleed detected' : 'Mic bleed not detected'}
      </div>
      <div class="details">
        <div class="detail-item">
          <span class="detail-label">Median Separation</span>
          <span class="detail-value">{micBleed.new.medianSeparation.toFixed(1)} dB</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">P10 Separation</span>
          <span class="detail-value">{micBleed.new.p10Separation.toFixed(1)} dB</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Bleed Percentage</span>
          <span class="detail-value">{micBleed.new.percentageConfirmedBleed.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  {/if}

  {#if micBleed?.old}
    <div class="method-section">
      <h4 class="method-title">Old Method</h4>
      <div class="conclusion success">
        Not detected
      </div>
      <div class="details">
        <div class="detail-item">
          <span class="detail-label">Left Channel Bleed</span>
          <span class="detail-value">{micBleed.old.leftChannelBleedDb === -Infinity ? '-∞' : micBleed.old.leftChannelBleedDb.toFixed(1)} dB</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Right Channel Bleed</span>
          <span class="detail-value">{micBleed.old.rightChannelBleedDb === -Infinity ? '-∞' : micBleed.old.rightChannelBleedDb.toFixed(1)} dB</span>
        </div>
      </div>
    </div>
  {/if}

  {#if !micBleed?.new && !micBleed?.old}
    <p>Mic bleed analysis not available.</p>
  {/if}
</div>