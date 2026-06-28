import { UI_STYLES } from "./ui-styles.js";
import iconSvg from "../assets/icon.svg";
import {
  shadowHost,
  shadowRoot,
  iconEl,
  panelEl,
  contentEl,
  speedEl,
  showSpeedPanel,
  translateStartTime,
  setShadowHost,
  setShadowRoot,
  setIconEl,
  setPanelEl,
  setContentEl,
  setSpeedEl,
  setPanelResizeObserver,
} from "./state.js";

export function getShadowHost(): HTMLElement {
  if (!shadowHost) {
    const host = document.createElement("div");
    host.id = "tora-shadow-host";
    host.style.position = "fixed";
    host.style.top = "0";
    host.style.left = "0";
    host.style.width = "0";
    host.style.height = "0";
    host.style.zIndex = "2147483647";
    document.body.appendChild(host);

    const root = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = UI_STYLES;
    root.appendChild(style);

    setShadowHost(host);
    setShadowRoot(root);
  }
  return shadowHost!;
}

export function getShadowRoot(): ShadowRoot {
  getShadowHost();
  return shadowRoot!;
}

export function createIcon(onClick: () => void): HTMLElement {
  const root = getShadowRoot();
  const button = document.createElement("button");
  button.className = "tora-icon";
  button.setAttribute("aria-label", "翻訳");
  button.innerHTML = iconSvg;
  button.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  root.appendChild(button);
  setIconEl(button);
  return button;
}

export function createPanel(
  onHeaderPointerDown: (event: PointerEvent) => void,
  onHeaderPointerMove: (event: PointerEvent) => void,
  onHeaderPointerUp: (event: PointerEvent) => void,
  onClose: () => void,
  onResize: (entries: ResizeObserverEntry[]) => void,
): HTMLElement {
  const root = getShadowRoot();
  const panel = document.createElement("div");
  panel.className = "tora-panel";
  panel.style.display = "none";

  const header = document.createElement("div");
  header.className = "tora-panel-header";
  header.addEventListener("pointerdown", onHeaderPointerDown);
  header.addEventListener("pointermove", onHeaderPointerMove);
  header.addEventListener("pointerup", onHeaderPointerUp);

  const closeButton = document.createElement("button");
  closeButton.className = "tora-panel-close";
  closeButton.setAttribute("aria-label", "閉じる");
  closeButton.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    onClose();
  });
  header.appendChild(closeButton);
  panel.appendChild(header);

  const content = document.createElement("div");
  content.className = "tora-panel-content";
  panel.appendChild(content);
  setContentEl(content);

  const speed = document.createElement("div");
  speed.className = "tora-panel-speed";
  speed.style.display = "none";
  panel.appendChild(speed);
  setSpeedEl(speed);

  const observer = new ResizeObserver(onResize);
  observer.observe(panel);
  setPanelResizeObserver(observer);

  root.appendChild(panel);
  setPanelEl(panel);
  return panel;
}

export function getIcon(): HTMLElement {
  return iconEl!;
}

export function getPanel(): HTMLElement {
  return panelEl!;
}

export function showIcon(): void {
  iconEl!.style.display = "flex";
}

export function hideIcon(): void {
  if (iconEl) {
    iconEl.style.display = "none";
  }
}

export function showPanel(): void {
  panelEl!.style.display = "flex";
}

export function hidePanel(): void {
  if (panelEl) {
    panelEl.style.display = "none";
  }
}

export function clearSpeed(): void {
  if (speedEl) {
    speedEl.style.display = "none";
    speedEl.textContent = "";
  }
}

export function updateSpeedDisplay(): void {
  if (!showSpeedPanel || !speedEl || !contentEl) {
    return;
  }

  const charCount = contentEl.textContent.length;
  const elapsedMs = performance.now() - translateStartTime;
  const elapsedSec = Math.max(elapsedMs / 1000, 0);
  const speed = elapsedSec > 0 ? charCount / elapsedSec : 0;

  speedEl.style.display = "block";
  speedEl.textContent = `${elapsedSec.toFixed(1)} 秒・${charCount} 文字（${speed.toFixed(1)} 文字/秒）`;
}

export function clearPanelActions(): void {
  const existing = panelEl!.querySelector(".tora-panel-actions");
  if (existing) {
    existing.remove();
  }
}

export function addPanelActions(
  errorMessage: string,
  onRetry: () => void,
  onOpenSettings: () => void,
): void {
  const actions = document.createElement("div");
  actions.className = "tora-panel-actions";

  const retryButton = document.createElement("button");
  retryButton.textContent = "再試行";
  retryButton.addEventListener("click", (event) => {
    event.stopPropagation();
    onRetry();
  });
  actions.appendChild(retryButton);

  const settingsButton = document.createElement("button");
  settingsButton.textContent = "設定";
  settingsButton.addEventListener("click", (event) => {
    event.stopPropagation();
    onOpenSettings();
  });
  actions.appendChild(settingsButton);

  panelEl!.appendChild(actions);

  if (contentEl) {
    contentEl.classList.add("tora-error");
    contentEl.textContent = errorMessage;
  }
}

export function setPanelContentClass(className: string): void {
  if (contentEl) {
    contentEl.className = className;
  }
}

export function clearPanelContent(): void {
  if (contentEl) {
    contentEl.textContent = "";
  }
}

export function appendPanelContent(text: string): void {
  if (contentEl) {
    contentEl.textContent += text;
  }
}

export function removePanelTranslatingClass(): void {
  if (contentEl) {
    contentEl.classList.remove("tora-translating");
  }
}
