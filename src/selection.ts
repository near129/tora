import { LANGUAGES, getLanguageName } from "./constants.js";
import { loadSettings } from "./settings.js";
import { UI_CONSTANTS, currentSelection, panelEl, setCurrentSelection } from "./state.js";
import { showFloatingIcon } from "./positioning.js";
import { hideIcon } from "./ui.js";
import { closePanel } from "./translate.js";

const { MIN_SELECTION_LENGTH } = UI_CONSTANTS;

export function hasValidSelection(): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const text = selection.toString();
  if (text.trim().length < MIN_SELECTION_LENGTH) {
    return false;
  }

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const element =
    container.nodeType === Node.ELEMENT_NODE ? (container as Element) : container.parentElement;
  if (!element) {
    return false;
  }

  if (element.closest("input, textarea, [contenteditable]")) {
    return false;
  }

  if (window.self !== window.top) {
    return false;
  }

  if (container.getRootNode() !== document) {
    return false;
  }

  return true;
}

async function detectSourceLanguage(text: string): Promise<{ lang: string; code: string }> {
  if (typeof chrome.i18n.detectLanguage !== "function") {
    return { lang: getLanguageName("unknown"), code: "unknown" };
  }

  return new Promise((resolve) => {
    chrome.i18n.detectLanguage(text, (result) => {
      if (chrome.runtime.lastError) {
        resolve({ lang: getLanguageName("unknown"), code: "unknown" });
        return;
      }
      if (!result || !result.isReliable || result.languages.length === 0) {
        resolve({ lang: getLanguageName("unknown"), code: "unknown" });
        return;
      }

      const detected = result.languages[0].language;
      const matched = LANGUAGES.find(
        (lang) => detected === lang.code || detected.startsWith(`${lang.code}-`),
      );
      if (!matched) {
        resolve({ lang: getLanguageName("unknown"), code: "unknown" });
        return;
      }

      resolve({ lang: getLanguageName(matched.code), code: matched.code });
    });
  });
}

export async function updateSelectionState(options?: {
  pointerX?: number;
  pointerY?: number;
  showIcon?: boolean;
}): Promise<void> {
  if (!hasValidSelection()) {
    setCurrentSelection(null);
    hideIcon();
    if (panelEl && panelEl.style.display !== "none") {
      closePanel();
    }
    void reportSelectionState(false);
    return;
  }

  const selection = window.getSelection()!;
  const text = selection.toString().trim();
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  const settings = await loadSettings();
  let sourceLang: string;
  let sourceCode: string;

  if (settings.sourceLang === "auto") {
    const detected = await detectSourceLanguage(text);
    sourceLang = detected.lang;
    sourceCode = detected.code;
  } else {
    sourceLang = getLanguageName(settings.sourceLang);
    sourceCode = settings.sourceLang;
  }

  if (sourceCode === settings.targetLang) {
    setCurrentSelection(null);
    hideIcon();
    void reportSelectionState(false);
    return;
  }

  setCurrentSelection({
    text,
    rect,
    sourceLang,
    sourceCode,
    pointerX: options?.pointerX,
    pointerY: options?.pointerY,
  });
  if (options?.showIcon) {
    showFloatingIcon();
  }
  void reportSelectionState(true);
}

export function reportSelectionState(valid: boolean): void {
  void chrome.runtime.sendMessage({ type: "selection-state", valid });
}

export { currentSelection };
