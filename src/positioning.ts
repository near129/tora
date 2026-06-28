import {
  UI_CONSTANTS,
  currentSelection,
  iconEl,
  panelEl,
  hasManuallyPositionedPanel,
  panelInitialWidth,
  setHasManuallyPositionedPanel,
  setPanelInitialWidth,
} from "./state.js";
import { showIcon, showPanel } from "./ui.js";

const { ICON_SIZE, ICON_OFFSET, PANEL_WIDTH, PANEL_MAX_HEIGHT } = UI_CONSTANTS;

function getIconSpace(edge: "top" | "bottom", rect: DOMRect): number {
  if (edge === "top") {
    return rect.top;
  }
  return window.innerHeight - rect.bottom;
}

function resolveIconEdge(rect: DOMRect, pointerY: number): "top" | "bottom" {
  const viewportHeight = window.innerHeight;
  const distTop = Math.abs(pointerY - rect.top);
  const distBottom = Math.abs(pointerY - rect.bottom);
  const spaceTop = rect.top;
  const spaceBottom = viewportHeight - rect.bottom;
  const needsSpace = ICON_SIZE + ICON_OFFSET;

  let edge: "top" | "bottom";
  if (Math.abs(distTop - distBottom) < 0.5) {
    edge = spaceTop >= spaceBottom ? "top" : "bottom";
  } else {
    edge = distTop < distBottom ? "top" : "bottom";
  }

  const topFits = spaceTop >= needsSpace;
  const bottomFits = spaceBottom >= needsSpace;

  if (edge === "top" && !topFits && bottomFits) {
    edge = "bottom";
  } else if (edge === "bottom" && !bottomFits && topFits) {
    edge = "top";
  } else if (!topFits && !bottomFits) {
    edge = spaceTop >= spaceBottom ? "top" : "bottom";
  }

  return edge;
}

export function updateIconPosition(): void {
  if (!currentSelection || !iconEl) {
    return;
  }

  const rect = currentSelection.rect;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let x: number;
  let y: number;

  if (
    typeof currentSelection.pointerX === "number" &&
    typeof currentSelection.pointerY === "number"
  ) {
    const pointerX = currentSelection.pointerX;
    const pointerY = currentSelection.pointerY;

    const edge = currentSelection.iconEdge ?? resolveIconEdge(rect, pointerY);
    if (!currentSelection.iconEdge) {
      currentSelection.iconEdge = edge;
    }

    const edgeX = Math.max(rect.left, Math.min(pointerX, rect.right));
    const edgeY = edge === "top" ? rect.top : rect.bottom;

    x = edgeX - ICON_SIZE / 2;
    if (edge === "top") {
      y = edgeY - ICON_SIZE - ICON_OFFSET;
    } else {
      y = edgeY + ICON_OFFSET;
    }
  } else {
    x = rect.right + ICON_OFFSET;
    y = rect.bottom + ICON_OFFSET;
  }

  x = Math.max(0, Math.min(x, viewportWidth - ICON_SIZE));
  y = Math.max(0, Math.min(y, viewportHeight - ICON_SIZE));

  iconEl.style.left = `${x}px`;
  iconEl.style.top = `${y}px`;
}

export function isSelectionOutOfViewport(): boolean {
  if (!currentSelection) {
    return true;
  }
  const rect = currentSelection.rect;
  return (
    rect.bottom < 0 ||
    rect.top > window.innerHeight ||
    rect.right < 0 ||
    rect.left > window.innerWidth
  );
}

export function showFloatingIcon(): void {
  showIcon();
  updateIconPosition();
}

export function positionPanel(): void {
  if (!iconEl || !panelEl) {
    return;
  }

  const iconRect = iconEl.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const spaceBottom = viewportHeight - iconRect.bottom;
  const spaceTop = iconRect.top;
  const spaceRight = viewportWidth - iconRect.right;
  const spaceLeft = iconRect.left;

  const directions: Array<{ name: "bottom" | "top" | "right" | "left"; space: number }> = [
    { name: "bottom", space: spaceBottom },
    { name: "right", space: spaceRight },
    { name: "top", space: spaceTop },
    { name: "left", space: spaceLeft },
  ];

  directions.sort((a, b) => {
    if (b.space !== a.space) {
      return b.space - a.space;
    }
    const priority: Record<string, number> = { bottom: 0, right: 1, top: 2, left: 3 };
    return priority[a.name] - priority[b.name];
  });

  let top = 0;
  let left = 0;
  let placed = false;

  for (const direction of directions) {
    switch (direction.name) {
      case "bottom":
        top = iconRect.bottom;
        left = iconRect.right - PANEL_WIDTH;
        break;
      case "right":
        top = iconRect.bottom - PANEL_MAX_HEIGHT;
        left = iconRect.right;
        break;
      case "top":
        top = iconRect.top - PANEL_MAX_HEIGHT;
        left = iconRect.right - PANEL_WIDTH;
        break;
      case "left":
        top = iconRect.bottom - PANEL_MAX_HEIGHT;
        left = iconRect.left - PANEL_WIDTH;
        break;
    }

    const right = left + PANEL_WIDTH;
    const bottom = top + PANEL_MAX_HEIGHT;

    if (left >= 0 && top >= 0 && right <= viewportWidth && bottom <= viewportHeight) {
      placed = true;
      break;
    }
  }

  if (!placed) {
    left = Math.max(0, Math.min(left, viewportWidth - PANEL_WIDTH));
    top = Math.max(0, Math.min(top, viewportHeight - PANEL_MAX_HEIGHT));
  }

  panelEl.style.left = `${left}px`;
  panelEl.style.top = `${top}px`;
}

export function showAndPositionPanel(): void {
  showPanel();
  if (!hasManuallyPositionedPanel) {
    positionPanel();
  }
}

export function onPanelResize(entries: ResizeObserverEntry[]): void {
  if (!panelEl || panelEl.style.display === "none") {
    return;
  }
  for (const entry of entries) {
    const width = entry.contentRect.width;
    if (panelInitialWidth === 0) {
      setPanelInitialWidth(width);
    } else if (Math.abs(width - panelInitialWidth) > 2) {
      setHasManuallyPositionedPanel(true);
    }
  }
}

export function getCurrentIconSpace(): number | null {
  if (!currentSelection || !currentSelection.iconEdge) {
    return null;
  }
  return getIconSpace(currentSelection.iconEdge, currentSelection.rect);
}
