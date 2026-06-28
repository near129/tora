import {
  isDraggingPanel,
  panelEl,
  currentSelection,
  panelDragOffsetX,
  panelDragOffsetY,
  setIsDraggingPanel,
  setPanelDragOffset,
  setHasManuallyPositionedPanel,
  setCurrentSelection,
} from "./state.js";
import {
  showFloatingIcon,
  isSelectionOutOfViewport,
  getCurrentIconSpace,
  updateIconPosition,
} from "./positioning.js";
import { hideIcon } from "./ui.js";
import { updateSelectionState, hasValidSelection } from "./selection.js";
import { onIconClick, closePanel } from "./translate.js";
import { UI_CONSTANTS } from "./state.js";

export function onPanelHeaderPointerDown(event: PointerEvent): void {
  if (!panelEl || (event.target as HTMLElement).closest(".tora-panel-close")) {
    return;
  }
  setIsDraggingPanel(true);
  setHasManuallyPositionedPanel(true);
  const rect = panelEl.getBoundingClientRect();
  setPanelDragOffset(event.clientX - rect.left, event.clientY - rect.top);
  const header = panelEl.querySelector(".tora-panel-header") as HTMLElement;
  header.classList.add("tora-dragging");
  header.setPointerCapture(event.pointerId);
  event.preventDefault();
  event.stopPropagation();
}

export function onPanelHeaderPointerMove(event: PointerEvent): void {
  if (!isDraggingPanel || !panelEl) {
    return;
  }
  panelEl.style.left = `${event.clientX - panelDragOffsetX}px`;
  panelEl.style.top = `${event.clientY - panelDragOffsetY}px`;
}

export function onPanelHeaderPointerUp(event: PointerEvent): void {
  if (!isDraggingPanel || !panelEl) {
    return;
  }
  setIsDraggingPanel(false);
  const header = panelEl.querySelector(".tora-panel-header") as HTMLElement;
  header.classList.remove("tora-dragging");
  header.releasePointerCapture(event.pointerId);
  event.stopPropagation();
}

export function onSelectionChange(): void {
  closePanel();
  void updateSelectionState({ showIcon: false });
}

export function onPointerUp(event: PointerEvent): void {
  if (event.button !== 0) {
    return;
  }
  void updateSelectionState({ pointerX: event.clientX, pointerY: event.clientY, showIcon: true });
}

export function onKeyUp(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    closePanel();
    return;
  }
  void updateSelectionState({ showIcon: true });
}

function syncSelectionFromViewport(): void {
  if (!currentSelection) {
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    setCurrentSelection(null);
    hideIcon();
    closePanel();
    return;
  }

  currentSelection.rect = selection.getRangeAt(0).getBoundingClientRect();

  if (isSelectionOutOfViewport()) {
    hideIcon();
    closePanel();
    return;
  }

  const iconSpace = getCurrentIconSpace();
  if (iconSpace !== null && iconSpace < UI_CONSTANTS.ICON_SIZE + UI_CONSTANTS.ICON_OFFSET) {
    hideIcon();
    return;
  }

  showFloatingIcon();
  updateIconPosition();
}

export function onScroll(): void {
  syncSelectionFromViewport();
}

export function onResize(): void {
  syncSelectionFromViewport();
}

export async function onContextMenuTranslate(): Promise<void> {
  if (!hasValidSelection()) {
    return;
  }
  await updateSelectionState({ showIcon: true });
  void onIconClick();
}

export { onIconClick };
