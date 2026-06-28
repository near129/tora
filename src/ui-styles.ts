export const UI_STYLES = `
  :host {
    all: initial;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

    /* ダークモードをデフォルトとする */
    --tora-bg-panel: #1a1a1a;
    --tora-bg-control: #4d4d4d;
    --tora-bg-hover: #767676;
    --tora-text-primary: #ffffff;
    --tora-text-secondary: #999999;
    --tora-border: #4d4d4d;
    --tora-accent: #7096f8;
    --tora-error: #ff7171;
  }

  @media (prefers-color-scheme: light) {
    :host {
      --tora-bg-panel: #f8f8fb;
      --tora-bg-control: #f1f1f4;
      --tora-bg-hover: #f2f2f2;
      --tora-text-primary: #000000;
      --tora-text-secondary: #626264;
      --tora-border: #cccccc;
      --tora-accent: #3460fb;
      --tora-error: #ce0000;
    }
  }

  .tora-icon {
    position: fixed;
    z-index: 2147483647;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    transition: opacity 0.15s ease, background-color 0.15s ease;
  }

  .tora-icon:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  @media (prefers-color-scheme: light) {
    .tora-icon:hover {
      background: rgba(0, 0, 0, 0.08);
    }
  }

  .tora-icon svg {
    width: 18px;
    height: 18px;
  }

  .tora-panel {
    position: fixed;
    z-index: 2147483647;
    width: 360px;
    max-height: 80vh;
    min-width: 240px;
    min-height: 120px;
    resize: both;
    background: var(--tora-bg-panel);
    color: var(--tora-text-primary);
    border: 1px solid var(--tora-border);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  @media (prefers-color-scheme: light) {
    .tora-panel {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }
  }

  .tora-panel-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 6px 8px;
    border-bottom: 1px solid var(--tora-border);
    flex-shrink: 0;
    cursor: grab;
    user-select: none;
  }

  .tora-panel-header.tora-dragging {
    cursor: grabbing;
  }

  .tora-panel-close {
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--tora-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .tora-panel-close:hover {
    background: var(--tora-bg-control);
    color: var(--tora-text-primary);
  }

  .tora-panel-content {
    padding: 10px 12px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.6;
    font-size: 14px;
    min-height: 40px;
    flex: 1 1 auto;
  }

  .tora-panel-content.tora-translating::after {
    content: "";
    display: inline-block;
    width: 2px;
    height: 1em;
    background: var(--tora-accent);
    margin-left: 2px;
    vertical-align: text-bottom;
    animation: tora-cursor-blink 1s step-end infinite;
  }

  @keyframes tora-cursor-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .tora-panel-content.tora-error {
    color: var(--tora-error);
  }

  .tora-panel-actions {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid var(--tora-border);
    flex-shrink: 0;
  }

  .tora-panel-actions button {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid var(--tora-border);
    border-radius: 4px;
    background: var(--tora-bg-control);
    color: var(--tora-text-primary);
    cursor: pointer;
    font-size: 13px;
  }

  .tora-panel-actions button:hover {
    background: var(--tora-bg-hover);
  }

  .tora-panel-speed {
    display: none;
    padding: 6px 12px;
    border-top: 1px solid var(--tora-border);
    font-size: 12px;
    color: var(--tora-text-secondary);
    text-align: right;
    flex-shrink: 0;
  }
`;
