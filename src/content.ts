import { createIcon, createPanel } from "./ui.js";
import { onPanelResize } from "./positioning.js";
import { closePanel } from "./translate.js";
import {
  onIconClick,
  onSelectionChange,
  onPointerUp,
  onKeyUp,
  onScroll,
  onResize,
  onContextMenuTranslate,
  onPanelHeaderPointerDown,
  onPanelHeaderPointerMove,
  onPanelHeaderPointerUp,
} from "./events.js";

const icon = createIcon(() => void onIconClick());
icon.style.display = "none";

createPanel(
  onPanelHeaderPointerDown,
  onPanelHeaderPointerMove,
  onPanelHeaderPointerUp,
  () => {
    closePanel();
  },
  onPanelResize,
);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    message &&
    typeof message === "object" &&
    (message as { type?: string }).type === "context-menu-translate"
  ) {
    void onContextMenuTranslate()
      .then(() => sendResponse())
      .catch(() => sendResponse());
    return true;
  }
  return false;
});

document.addEventListener("selectionchange", onSelectionChange);
document.addEventListener("pointerup", onPointerUp);
document.addEventListener("keyup", onKeyUp);
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onResize);
