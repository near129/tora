import type { SelectionState } from "./types.js";

export const UI_CONSTANTS = {
  ICON_SIZE: 28,
  ICON_OFFSET: 8,
  PANEL_WIDTH: 360,
  PANEL_MAX_HEIGHT: 240,
  MIN_SELECTION_LENGTH: 2,
};

export let shadowHost: HTMLElement | null = null;
export let shadowRoot: ShadowRoot | null = null;
export let iconEl: HTMLElement | null = null;
export let panelEl: HTMLElement | null = null;
export let contentEl: HTMLElement | null = null;
export let speedEl: HTMLElement | null = null;
export let currentSelection: SelectionState | null = null;
export let translatePort: chrome.runtime.Port | null = null;
export let isTranslating = false;
export let showSpeedPanel = false;
export let translateStartTime = 0;
export let hasManuallyPositionedPanel = false;
export let isDraggingPanel = false;
export let panelDragOffsetX = 0;
export let panelDragOffsetY = 0;
export let panelInitialWidth = 0;
export let panelResizeObserver: ResizeObserver | null = null;

export function setShadowHost(host: HTMLElement): void {
  shadowHost = host;
}

export function setShadowRoot(root: ShadowRoot): void {
  shadowRoot = root;
}

export function setIconEl(el: HTMLElement | null): void {
  iconEl = el;
}

export function setPanelEl(el: HTMLElement | null): void {
  panelEl = el;
}

export function setContentEl(el: HTMLElement | null): void {
  contentEl = el;
}

export function setSpeedEl(el: HTMLElement | null): void {
  speedEl = el;
}

export function setCurrentSelection(state: SelectionState | null): void {
  currentSelection = state;
}

export function setTranslatePort(port: chrome.runtime.Port | null): void {
  translatePort = port;
}

export function setIsTranslating(value: boolean): void {
  isTranslating = value;
}

export function setShowSpeedPanel(value: boolean): void {
  showSpeedPanel = value;
}

export function setTranslateStartTime(value: number): void {
  translateStartTime = value;
}

export function setHasManuallyPositionedPanel(value: boolean): void {
  hasManuallyPositionedPanel = value;
}

export function setIsDraggingPanel(value: boolean): void {
  isDraggingPanel = value;
}

export function setPanelDragOffset(x: number, y: number): void {
  panelDragOffsetX = x;
  panelDragOffsetY = y;
}

export function setPanelInitialWidth(value: number): void {
  panelInitialWidth = value;
}

export function setPanelResizeObserver(observer: ResizeObserver | null): void {
  panelResizeObserver = observer;
}
